# Build and Development Architecture

## Quick start

This project uses **Zola** (SSG) hosted on Netlify, with a custom build pipeline handling TypeScript, Typst (PDF generation), and secure asset fetching.

- **Required dependencies:**
  - [Zola](https://www.getzola.org/) (installed and in PATH)
  - [Node.js](https://nodejs.org/) & npm (v18+)
  - [Netlify CLI](https://docs.netlify.com/cli/get-started/) (for local serverless testing)
  - [Typst](https://github.com/typst/typst) (markup-based typesetting system for PDF creation)

- **To test the site locally**: `npm run serve`
  - _Note: This runs the full build pipeline (TS, Assets) before starting Zola. This requires a `PRIVATE_TOKEN` and access to the private assets repository._
  - _Do not commit the artifacts in `static/js` or `secure_assets`._

---

## The Build Pipeline

Because we use private assets and dynamic TypeScript bundling, we cannot rely solely on Zola. The build runs in three distinct stages.

### Stage 1: Pre-Build (Node.js)

**Command:** `npm run build:core`

Defined in `package.json` and orchestrated by `scripts/build.mts`.

1. **Legacy JS Sync:** Copies raw JavaScript files from `_legacy_js/` to `static/js/`. This ensures custom scripts are present before the build continues.
2. **Secure Assets:** `scripts/build-fetch-secure-assets.mts` uses `PRIVATE_TOKEN` to fetch strictly controlled assets (PDFs, JSON) from the private repository into the local `secure_assets/` folder.
3. **Linting and Type Checking:** Runs `npm run check` which executes:
   - `biome check`: Fast linting and formatting verification using Biome.
   - `tsc --noEmit`: Ensures TypeScript type integrity.
4. **Typst Compilation:** `scripts/build-typ.mts` checks for and downloads the Typst binary and compiles `.typ` source files from specified directories into PDFs.
5. **TypeScript Bundling:** `scripts/build-ts.mts` reads `_ts/tools_versioning.json` and bundles client-side applications (like the OIT Calculator) into `static/js/` using `esbuild`.

### Stage 2: Site Generation (Zola)

**Command:** `zola build`
Zola generates the static HTML/CSS from markdown content and templates.

### Stage 3: Post-Processing

**Command:** `node build-patch-sw.js`
The Abridge theme generates a Service Worker (`sw.min.js`) that caches aggressively. This script injects a guard clause to ensure **Netlify Function calls** and **POST requests** bypass the cache, which is critical for Netlify Functions to work.

### Theme Management (Abridge Divergence)

The project uses a modified build process for the Abridge theme to allow for custom scripts and dependencies.

- **No Automatic Sync:** The `npm run abridge` command executes the local `package_abridge.js` directly. It **does not** overwrite `package.json` or `package_abridge.js` with the versions from `themes/abridge/`.
- **Custom `package_abridge.js`:** The root build script has been patched to handle custom files in `static/js` (e.g., our TypeScript bundles) without erroring.
- **Updating the Theme:** When updating the `themes/abridge` submodule, you must manually check `themes/abridge/package_abridge.js` and `themes/abridge/package.json` for breaking changes or improvements and merge them into the root files cautiously.

---

## Environment Variables

These must be set in Netlify (Site Settings > Environment Variables) and locally in a `.env` file for the build to succeed.

| Variable              | Purpose                                                                |
| :-------------------- | :--------------------------------------------------------------------- |
| `PRIVATE_TOKEN`       | GitHub Personal Access Token to fetch private assets/tools.            |
| `GITHUB_OWNER`        | Owner of the repo (e.g., `john-doe`).                                  |
| `GITHUB_REPO`         | Repository name (e.g. `repo-name`).                                    |
| `JWT_SECRET`          | Secret key used to sign Auth Cookies.                                  |
| `SUPABASE_URL`        | URL of the Supabase project.                                           |
| `SUPABASE_SECRET_KEY` | for backend access ONLY.                                               |
| `SUPABASE_JWT_SECRET` | JWT Secret for signing client tokens (from Supabase Project Settings). |
| `TOKEN_EXPIRY_HOURS`  | Duration of the user session in hours (Default: 24).                   |
| `TURNSTILE_SECRET`    | Secret key from Cloudflare Turnstile for server-side verify            |

## Project structure

```text
.
├── scripts/
│   ├── build.mts                  # Main Build Orchestrator
│   ├── build-ts.mts               # TypeScript Bundling Logic (esbuild)
│   ├── build-typ.mts              # Typst Logic (PDF creation)
│   ├── build-fetch-secure-assets.mts # Fetches private assets from GitHub
│   ├── build-utils.mts            # Shared utility functions
│   └── build-config.mts           # Environment variables and config
├── build-patch-sw.js          # Service Worker Patcher (Critical for Auth)
├── config.toml                # Zola Configuration
├── netlify.toml               # Netlify Configuration (Headers, Redirects)
├── package.json               # NPM Scripts & Dependencies
├── tools/                     # Developer utilities (not part of site build)
│   └── hash_password.ts       # Utility to generate bcrypt hashes
│
├── content/                   # Markdown content
│   ├── tools/
│   ├── topics/
│   └── etc.
│
├── netlify/edge-functions/    # Edge routers for low latency data fetching
├── netlify/functions/         # Standard Serverless functions (Auth, API)
│
├── _legacy_js/                 # Source for raw JS files (copied to static/js at build)
├── secure_assets/             # (GitIgnored) Downloaded private assets
│
├── static/
│   ├── js/                    # (GitIgnored) Generated build artifacts (Legacy JS copy + TS bundles)
│   ├──  icon                 # for .svgs
│   ├──  images               # for gen purpose 
│   └──  tool_assets          # for public resources for tools
│       ├──  oit_calculator   # tools should have their own folder
│       │   └──  public_oit_patient_resource_terms.typ
│       └──  cnf_foods.json # if resources are shared by multiple tools 

│   └── ...
├──  sass
│   ├──  _extra.scss
│   ├──  abridge.scss
│   └──  shortcodes 
│
├── _ts/                       # Source TypeScript for client-side tools
│   ├── tools_versioning.json  # Configuration: Maps tool names to versions
│   ├── oit_calculator/        # Complex Tool (Folder-based)
│   └── simple_script.ts       # Standalone script
│
└── templates/                 # HTML Templates & Shortcodes
```

---

## Developing content

### Simple shortcodes

- Create an HTML file in `templates/shortcodes/`.
- For JS/SCSS: Place files in `_legacy_js/{name}.js` (if simple) or `sass/shortcodes/_{name}.scss`.
- See Zola docs for syntax.

### TypeScript shortcodes

- See [TS_TOOL_WORKFLOW.md](TS_TOOL_WORKFLOW.md) for details on adding more complex, versioned TypeScript applications.

### Adding PDFs (Typst)

- **Source:** Place `.typ` files in directories monitored by `scripts/build-typ.mts`.
- **Compilation:** The build script automatically finds them and compiles them to PDF in `static/`.
- **Fonts:** Custom fonts must be in `fonts/` for Typst to detect them.

### Generating secure content for tools

- **Auth/Permissions:** Update `authorized_users` table in Supabase.
- **User Configs:** Ensure the private repository contains the matching `user_configs/{username}_config.json` files and the files you want the user to be able to access.
- **Build Logic:** If adding a new tool that requires private assets, you must manually add a `syncSecureFolder` or `fetchSecureFile` call to `scripts/build-fetch-secure-assets.mts` to ensure the files are downloaded during build. See the end of that file.
- **Structure:** secure assets are flattened into `secure_assets/` locally during build.

## Netlify Functions & Auth

Some tools rely on Edge and Serverless Functions for authentication and data access.

### 1. Authentication Flow

- **Identity:** Handled natively by Supabase Auth (`auth.users`).
- **Zero-Knowledge Encryption:** The user's password never leaves the client. It is used to create an Auth Hash (sent to Supabase for login) and a Key Encryption Key (KEK) used to unwrap the local Data Encryption Key (DEK).
- **Session:** Supabase issues an access token which is passed as a `Bearer` token to Netlify Functions.
- **Logout:** Supabase handles session termination via `supabase.auth.signOut()`. Local encryption keys in memory and session storage are wiped.

### 2. Fetching Secure Assets

Private assets (PDFs, JSON data) are **not** served statically. They reside in the `secure_assets/` folder, which is excluded from the public build but included in the function bundle.

- **Endpoint:** `/.netlify/functions/get-secure-asset?file={filename}`
- **Logic:**
  - The function verifies the Supabase access token using `supabase.auth.getClaims()`.
  - **Authorization:**
    - **Standard files:** It reads the user's config file (`user_configs/{uuid}_config.json`) from disk to flatten and check if the requested `{filename}` exists in their permissions list.
    - **Exception: `me.json`:** If `{filename}` is `me.json`, the function reads the user's config file from disk to return the full configuration object.
    - **Exception: `oit_calculator-bootstrap` / `ofc-bootstrap`:** These endpoints read the user's configuration file on the server, aggregate the associated food and protocol files, and return a consolidated "bootstrap" payload for efficient app initialization.

### 3. Managing Users

This application uses an invite-only onboarding process managed through Supabase Auth.

1. **Administrator Invitation:** Admins invite users via the Supabase Admin API (`inviteUserByEmail`).
2. **Configuration:** Admin creates `{user_uuid}_config.json` in the private repository for the user's provisioned assets.
3. **User Onboarding:** User clicks the invite link, sets their password locally at `/signup/`, and the client handles deriving the Supabase auth credential and encryption metadata.

---

## Infrastructure and Deployment Safeguards (Production)

Deploying to production requires coordination between Netlify (hosting), Cloudflare (CDN/Cache), and the browser's Service Worker. **Failure to follow these steps can result in "cache poisoning" where users are served stale CSP headers or broken Auth logic.**

### Cloudflare R2 Bucket (assets.allergyguide.ca)

Large public binary assets (e.g., PDFs, high-resolution images, slide decks; things that don't need strict version control) are manually managed and hosted on a external bucket, via the `assets.allergyguide.ca` subdomain.

### 1. The Cloudflare "Query String" Trap

Cloudflare sits in front of Netlify and aggressively caches static assets (JS, CSS, SW).

- **The Problem:** By default, Cloudflare ignores query strings on static files. If the browser requests `sw.min.js?v=3.12.5`, Cloudflare may serve the cached `sw.min.js` from its edge nodes, ignoring the version bump.
- **The Danger:** Cloudflare caches the **HTTP Headers** (including the Content Security Policy) along with the file. If you update the CSP in `netlify.toml`, Cloudflare will continue serving the _old_ CSP until the cache is purged manually.

### 2. Standard Operating Procedures (SOP)

#### Scenario A: Updating the Content Security Policy (CSP)

If you add a new external service (Analytics, CDNs) or a new Netlify function:

1. Deploy the code to Netlify.
2. **Log into Cloudflare Dashboard** -> **Caching** -> **Configuration** -> **Purge Everything**.
3. Verify in a fresh Incognito window.

#### Scenario B: Updating Service Worker / Patch Logic

If you edit `build-patch-sw.js` or the theme's PWA logic:

1. Open `config.toml` and increment the `pwa_VER` variable (e.g., `3.12.5` -> `3.12.6`).
2. Deploy to Netlify. (This forces Zola to update the HTML references, prompting the browser to download the new SW).
3. **Purge Everything** in Cloudflare to ensure the new SW file isn't blocked by edge caching.

#### Scenario C: Debugging "Mysterious" Auth/Network Failures

If Supabase or Netlify functions fail only in production:

1. **Test in Incognito:** If it works in Incognito but fails in a normal window, the user's **local Service Worker** is stale. Solution: Bump `pwa_VER` in `config.toml`.
2. **Check Headers:** If it fails in Incognito, the issue is at the **CDN/Hosting level**. Solution: Check `netlify.toml` for CSP errors or Purge Cloudflare.

---

## Contributing

Most contributions are expected to be focused on medical content in the `content/` directory.

Because the full build pipeline requires access to private repositories, non-core contributors should focus on markdown edits and rely on Netlify Deploy Previews for verification, or seek guidance from the maintainer for local environment setup.
