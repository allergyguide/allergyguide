# Authentication

Uses **Supabase Auth** for identity and a **Zero-Knowledge** vault for custom user data (e.g. custom foods and protocols).

## 1. Tool Architectures

### A. Zero-Knowledge Tools (Encrypted)

- **Examples:** OIT Calculator, OFC Index.
- **Requirement:** Requires a Supabase session (Identity) **and** a decrypted Data Encryption Key (DEK) in memory.
- **Logic:** Use `determineVaultState()` from `_ts/core/auth/login-client.ts`. It handles the transition between `UNAUTHENTICATED`, `LOCKED` (Identity only), and `UNLOCKED` (Identity + Decryption).

### B. Auth-Only Tools (Verified Identity)

- **Requirement:** Only needs to verify who the user is (e.g., to fetch a repository-managed asset via a Netlify Function).
- **Logic:**
  1. Check for a session via `supabase.auth.getSession()`.
  2. If `data.session` exists, the user is authenticated. You can ignore the `LOCKED` vault state.
  3. Include the token in requests: `Authorization: Bearer ${session.access_token}`.
  4. If no session, trigger `renderAuthUI("LOGIN", ...)` but do not proceed to `UNLOCK`.

---

## 2. Cryptographic Branching

The user's password is branched into two distinct keys via PBKDF2 using salts fetched from the `get_user_salts(email)` RPC:

1. **Auth Hash:** Sent to Supabase as the login password.
2. **KEK (Key Encryption Key):** Stays in RAM; used to unwrap the **DEK**.
3. **DEK (Data Encryption Key):** Used to encrypt/decrypt user documents in Postgres.

---

## 3. Server-Side Verification (Netlify Edge Functions)

All protected Netlify functions must verify the Supabase token:

```ts
// _lib/auth.ts
const { data, error } = await supabase.auth.getClaims(token);
const uuid = data.sub; // User's unique ID
```

**Asset Mapping:** Use the `uuid` to locate user-specific configuration `user_configs/${uuid}_config.json`.

---

## 4. User Management

- **Invite-Only:** Admins invite users via the Supabase Admin API and provision a config.json file
- **Onboarding:** Users set their password at `/signup/`, which initializes their salts and encrypted DEK.
- **Tab Sync:** The active DEK is stored in `sessionStorage` and synced across tabs using `BroadcastChannel`.
- **Wiping:** `lockAndSignOut()` clears all local session data and terminates the Supabase session.

---

## 5. Performance & Network Orchestration

To prevent a "waterfall" latency delay during tool initialization, **network fetching is decoupled from vault decryption**:

1. **Pre-fetching:** To mask RPC latency, salts are speculatively prefetched (`prefetchSalts()`) as soon as the user types a valid email. Then, as soon as `supabase.auth.getSession()` confirms a valid identity, background network requests for encrypted Supabase rows (`fetchAllEncryptedDocuments`) and Netlify configurations are fired immediately. This happens _in parallel_ with DEK retrieval (`determineVaultState()`).
2. **Caching:** The resulting Promise is cached at the module level (`networkDataPromise`) and given a dummy catch handler to suppress unhandled promise rejection warnings in the browser.
3. **Decryption:** Once the vault transitions to `UNLOCKED` (either immediately via `sessionStorage` or after user password entry), the cached background promise is awaited and the resulting rows are passed to `decryptDocuments`.
4. **Cleanup:** `networkDataPromise` is cleared in a `finally` block to ensure subsequent auth changes (like switching users or retrying after a network failure) always trigger a fresh network fetch and prevent soft-locks.
