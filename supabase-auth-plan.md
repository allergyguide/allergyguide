# Supabase Auth + Zero-Knowledge Transition Plan

This document outlines the architecture and implementation steps to move from custom JWT-based authentication to **Supabase Auth**, while maintaining a **Zero-Knowledge (ZK)** architecture for clinical data and preserving the use of repository-managed JSON assets.

## 1. Architectural Overview

- **Identity:** Handled by Supabase Auth (`auth.users`). We are using it as the source of truth for who the user is. The browser or island client uses the publishable key and signs in normally; Supabase then issues the user’s access token, which is what RLS and server-side authorization should trust. Keep secret keys only in trusted backend code.
- **Asset Key:** The **Supabase UUID** (`sub` claim) is the unique identifier for all repository-managed assets.
- **Authentication (ZK Branching):**
  The user provides one Master Password. The client derives two distinct outputs using unique salts fetched via email lookup:
  1. **KEK (Key Encryption Key):** Derived using PBKDF2 + **Salt A**. Used to wrap/unwrap the DEK.
  2. **Auth Hash (Supabase Password):** Derived using PBKDF2 + **Salt B**. Sent to Supabase as the login password.

- **Authentication:**

User decides on a password; use a Key Derivation Function (KDF) with distinct salts fetched from Supabase from the authorized_users table via email lookup public function (RPC), to branch the single password into two totally unrelated outputs:

```ts
// The user only ever types ONE password:
const masterPassword = "user_input_password";

// 1. Derive the KEK for local encryption (using Salt A)
const kek = await crypto.subtle.deriveKey(
  /* PBKDF2 with user-specific Salt A */
);

// 2. Derive the Auth Hash for Supabase (using Salt B)
const authHash = await crypto.subtle.deriveKey(
  /* PBKDF2 with distinct Salt B */
);
// Base64 encode it so it can be passed as a string to Supabase
const supabasePassword = Buffer.from(authHash).toString("base64");
```

By using different salts for the derivation, the `kek` and the `supabasePassword` are mathematically decoupled.

- **Authorization:**
  - username will be deprecated - essentially, we will start using the user's email as a username, with the user UUID as the actual source of truth for who the user is. We will add `user_id uuid references auth.users(id)` to authorized_users and use that for every RLS decision. Supabase’s own docs frame `auth.users` as the user store, with access tokens tied to the user, and show `auth.uid()` in RLS policies.

  - For Netlify functions, if they have to verify the token issued by Supabase, use:

  ```ts
  // Create a single supabase client for interacting with your database
  // see https://supabase.com/docs/reference/javascript/auth-getclaims
  const supabase = createClient(
    "https://xyzcompany.supabase.co",
    "your-publishable-key",
  );
  const { data: claims, error } = await supabase.auth.getClaims(accessToken);
  ```

  - because Supabase documents this as faster and JWKS-based. Reserve `getUser()` for cases where you explicitly want the extra Auth-server request or need a fallback during migration.
  - this also means that in the privat github, where I used to have {username}_config.json -> this will be transitioned to {uuid}_config.json instead

- **Postgres:** Row Level Security (RLS) using `auth.uid()`.
- **Zero-Knowledge:**
- `masterPassword` never leaves the client.
- `DEK` (Data Encryption Key) is stored encrypted by `KEK` in the `authorized_users` table.

---

## 2. Phase 1: Database Migration

Update the `authorized_users` table to link with Supabase's internal auth system.

### SQL Migration

```sql
-- authorized_users table
create table public.authorized_users (
  id uuid not null,
  auth_salt text not null,
  kek_salt text not null,
  encrypted_dek text not null,
  dek_iv text not null,
  setup_complete boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint authorized_users_pkey primary key (id),
  constraint authorized_users_id_fkey foreign KEY (id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

-- user_documents table
create table public.user_documents (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  doc_type text not null,
  encrypted_blob text not null,
  iv text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_documents_pkey primary key (id),
  constraint user_documents_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
```

---

## 3. Phase 2: Netlify Backend (Middleware) Update

Refactor `netlify/functions/_lib/auth.mts`

### Key Changes

1. **Do not support dual Auth:** no longer support `nf_jwt` (legacy cookie) and only support `Authorization: Bearer <SupabaseToken>`.
2. **Stateless Verification:** rely on `const { data: claims, error } = await supabase.auth.getClaims(accessToken)`
3. **Asset Mapping:** Instead of `username`, use `claims.sub` (the UUID).
   - Path: `secure_assets/user_configs/${claims.sub}_config.json`.

---

## 4. Phase 3: Frontend Implementation

### A. First-Time Onboarding Flow (Invite-Based)

This application uses an invite-only onboarding process managed through Supabase Auth.

#### Step 1: Administrator Invites User

An administrator provisions the user account using the Supabase Admin API:

- Create the user via `inviteUserByEmail()`.

```typescript
await supabaseAdmin.auth.admin.inviteUserByEmail(
  email,
  {
    redirectTo: "https://allergyguide.ca/signup/",
  },
);
```

- note: Supabase provides a built-in email server out of the box, but it is strictly a testing and development toy; i'll need to configure a custom SMTP server. I already use Resend API so I'll have to wire it up.

- Do not create any Zero-Knowledge (ZK) metadata yet.
- Do not assign a permanent password yet.

Admin also creates `{josh's-uuid}_config.json` in the private repo.

#### Step 2: User Opens Invite Link

The user receives an invitation email generated by Supabase.

When the user clicks the invite link:

- Supabase authenticates the user using the invitation token.
- A temporary authenticated session is established.
- The user is redirected to the application's onboarding page.

At this point the user is authenticated, but ZK encryption has not yet been initialized.

**Check App State:** Query the `authorized_users` table to check if a row exists for the user and if `setup_complete` is true. Proceed if false or missing.

#### Step 3: User Chooses Master Password

The onboarding page prompts the user to create a Master Password.
The Master Password never leaves the client and is never stored in plaintext.
If lost, the user should know there is no recovery

#### Step 4: Derive Authentication and Encryption Material

- generate random auth_salt and kek_salt
- `Auth Secret` is converted into the password that will be stored by Supabase Auth.
- `KEK` (Key Encryption Key) is used to encrypt and decrypt the user's Data Encryption Key (DEK).

#### Step 5: Initialize Zero-Knowledge Encryption

The client:

1. Generates a random DEK.
2. Encrypts the DEK using the KEK.
3. Creates any required salts and IVs.
4. Stores the resulting metadata in `authorized_users`.

The plaintext DEK is never stored on the server.

#### Step 6: Set Permanent Supabase Password

Using the authenticated invite session, the client updates the user's Supabase password:

```ts
await supabase.auth.updateUser({
  password: derivedAuthPassword,
});
```

This permanently replaces the temporary invite-based authentication state.
Future logins will use the derived authentication credential.

#### Step 7: Complete Onboarding

After the ZK metadata is successfully written and the Supabase password is updated:

- Mark `setup_complete = true`.
- Redirect the user into the application.

### B. Login Flow for an existing user

1. **Email Lookup:** App fetches auth and kek salts from `authorized_users` using the email through an RPC function
2. **Derivation:** App derives `KEK` and `Auth Hash`.
3. **Login:** `supabase.auth.signInWithPassword({ email, password: authHash })`.
4. Client retrieves and decrypts the user's encrypted DEK.
5. Application data is decrypted locally.

#### RPC function

```sql
-- Ensure the required cryptography extension is active
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.get_user_salts(user_email TEXT)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
-- STRICT enforces that the function returns NULL immediately if user_email is NULL
STRICT 
-- Explicitly set search_path to prevent search path hijacking
SET search_path = public, pg_temp 
AS $$
DECLARE
  result JSONB;
  dummy_auth_salt TEXT;
  dummy_kek_salt TEXT;
  normalized_email TEXT;
BEGIN
  -- Normalize the email to match auth.users storage
  normalized_email := lower(user_email);

  -- 1. Attempt to fetch the real salts
  SELECT jsonb_build_object('auth_salt', au.auth_salt, 'kek_salt', au.kek_salt)
  INTO result
  FROM public.authorized_users au
  JOIN auth.users u ON au.id = u.id 
  WHERE u.email = normalized_email;
  
  -- 2. Anti-Enumeration: Return deterministic dummy salts if user not found
  IF result IS NULL THEN
    -- Hash the email with a static pepper to create a consistent string
    -- NOTE: Ensure 'hex' encoding matches your actual salt formats!
    dummy_auth_salt := encode(digest(normalized_email || 'dummy_auth_pepper_v1', 'sha256'), 'hex');
    dummy_kek_salt := encode(digest(normalized_email || 'dummy_kek_pepper_v1', 'sha256'), 'hex');
    
    result := jsonb_build_object('auth_salt', dummy_auth_salt, 'kek_salt', dummy_kek_salt);
  END IF;

  RETURN result;
END;
$$;

-- Finally, explicitly grant execution rights so your frontend can call it before login
REVOKE ALL ON FUNCTION public.get_user_salts(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_salts(TEXT) TO anon, authenticated;
```

---

## Netlify Function Verification Flow

For protected asset routes on the frontend (e.g. api.ts in oit_calculator) that interact with the netlify functions to fetch secure assets, such as in:

```ts
export async function fetchOITBootstrap(): Promise<OITBootstrapResponse> {
  const response = await fetch("/.netlify/functions/oit-bootstrap");
  await ensureResponseOk(response);

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as OITBootstrapResponse;
  }
  throw new HttpError(
    "Server returned success but response was not JSON",
    response.status,
  );
}
```

This function would need an Authorization header to your fetch configurations:

```ts
const { data, error } = await supabase.auth.getSession();
const token = data.session?.access_token;

const response = await fetch("/.netlify/functions/get-secure-asset", {
  headers: { "Authorization": `Bearer ${token}` },
});
```

getSession() would also refresh the token too.

Then on the backend (auth.mts):

- Goal: Prove the token is real, untampered, and signed by Supabase
- Read the bearer token from the request.
- Verify it with `supabase.auth.getClaims()`

- see https://supabase.com/docs/reference/javascript/auth-getclaims

4. Proceed only if the token is valid and the user is active.

## 6. Onboarding page

For now need to make a very rough onboarding page that has an input for the master password.

## Other legacy changes

Will need to alter build-utils.mts verifyUsersData()

---

## 8. Implementation Checklist

- [ ] SQL migration in Supabase SQL Editor.
- [ ] Update `netlify/functions/_lib/auth.mts`.
- [ ] Test `get-secure-asset.mts` with a Bearer token.
- [ ] Verify `user_documents` CRUD still works with RLS.
