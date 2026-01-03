# Build and Development Architecture

## Quick start

This project uses **Zola** (SSG) hosted on Netlify, with a custom build pipeline handling TypeScript, Typst (PDF generation), and secure asset fetching.

- **Required dependencies:**
  - [Zola](https://www.getzola.org/) (installed and in PATH)
  - [Node.js](https://nodejs.org/) & npm (v18+)
  - [Netlify CLI](https://docs.netlify.com/cli/get-started/) (for local serverless testing)
  - [Typst](https://github.com/typst/typst) (markup-based typesetting system for PDF creation)

- **To test the site locally**: `npm run serve`
  - _Note: This runs the full build pipeline (TS, Assets) before starting Zola. This currently requires a `PRIVATE_TOKEN` and access to the private assets repository to succeed._
  - _Do not commit the artifacts in `static/js` or `secure_assets`._

---

## The Build Pipeline

Because we use private assets and dynamic TypeScript bundling, we cannot rely solely on Zola. The build runs in three distinct stages.

### Stage 1: Pre-Build (Node.js)

**Command:** `npm run build:core`

Defined in `package.json` and orchestrated by `build.mts`.

1. **Secure Assets:** `build-fetch-secure-assets.mts` uses `PRIVATE_TOKEN` to fetch strictly controlled assets (PDFs, JSON) from the private repository into the local `secure_assets/` folder.
2. **Type Checking:** Runs `tsc --noEmit` to ensure TypeScript integrity.
3. **Typst Compilation:** `build-typ.mts` checks for/downloads the Typst binary and compiles `.typ` source files into PDFs.
4. **TypeScript Bundling:** `build-ts.mts` reads `tools_versioning.json` and bundles client-side applications (like the OIT Calculator) into `static/js/` using `esbuild`.

### Stage 2: Site Generation (Zola)

**Command:** `zola build`
Zola generates the static HTML/CSS from markdown content and templates.

### Stage 3: Post-Processing

**Command:** `node build-patch-sw.js`
The Abridge theme generates a Service Worker (`sw.min.js`) that caches aggressively. This script injects a guard clause to ensure **Netlify Function calls** and **POST requests** bypass the cache, which is critical for Netlify Functions to work.

---

## Environment Variables

These must be set in Netlify (Site Settings > Environment Variables) and locally in a `.env` file for the build to succeed.

| Variable             | Purpose                                                     |
| :------------------- | :---------------------------------------------------------- |
| `PRIVATE_TOKEN`      | GitHub Personal Access Token to fetch private assets/tools. |
| `GITHUB_OWNER`       | Owner of the repo (e.g., `john-doe`).                       |
| `GITHUB_REPO`        | Repository name (e.g. `repo-name`).                         |
| `AUTH_USERS`         | JSON object of allowed users/passwords: `{"user": "pass"}`. |
| `USER_PERMISSIONS`   | JSON object mapping users to tool permissions/files.        |
| `JWT_SECRET`         | Secret key used to sign Auth Cookies.                       |
| `TOKEN_EXPIRY_HOURS` | Duration of the session in hours (Default: 24).             |

## Project structure

```text
.
├── build.mts                  # Main Build Orchestrator
├── build-ts.mts               # TypeScript Bundling Logic (esbuild)
├── build-typ.mts              # Typst Logic (PDF creation)
├── build-fetch-secure-assets.mts # Fetches private assets from GitHub
├── build-patch-sw.js          # Service Worker Patcher (Critical for Auth)
├── config.toml                # Zola Configuration
├── netlify.toml               # Netlify Configuration (Headers, Redirects)
├── package.json               # NPM Scripts & Dependencies
├── tools_versioning.json      # Configuration: Maps tool names to versions
│
├── content/                   # Markdown content
│   ├── tools/
│   ├── topics/
│   └── etc.
│
├── netlify/functions/         # Serverless functions (Auth, Asset Proxy)
│
├── secure_assets/             # (GitIgnored) Downloaded private assets
│
├── static/
│   ├── js/                    # Compiled JS artifacts land here. There are also hardcoded simple .js files for shortcodes here 
│   ├──  icon                 # for .svgs
│   ├──  images               # for gen purpose 
│   └──  tool_assets          # for public resources for tools
│       ├──  oit_calculator   # tools should have their own folder
│       │   └──  public_oit_patient_resource_terms.typ
│       └──  typed_foods.json # if resources are shared by multiple tools 

│   └── ...
├──  sass
│   ├──  _extra.scss
│   ├──  abridge.scss
│   └──  shortcodes 
│
├── ts/                        # Source TypeScript for client-side tools
│   ├── oit_calculator/        # Complex Tool (Folder-based)
│   └── simple_script.ts       # Standalone script
│
└── templates/                 # HTML Templates & Shortcodes
```

---

## Developing content

### Simple shortcodes

- Create an HTML file in `templates/shortcodes/`.
- For JS/SCSS: Place files in `static/js/{name}.js` (if simple) or `sass/shortcodes/_{name}.scss`.
- See Zola docs for syntax.

### TypeScript shortcodes

- See [TS_TOOL_WORKFLOW.md](TS_TOOL_WORKFLOW.md) for details on adding more complex, versioned TypeScript applications.

### Adding PDFs (Typst)

- **Source:** Place `.typ` files in directories monitored by `build-typ.mts`.
- **Compilation:** The build script automatically finds them and compiles them to PDF in `static/`.
- **Fonts:** Custom fonts must be in `fonts/` for Typst to detect them.

### Generating secure content for tools

- **Auth/Permissions:** Update `AUTH_USERS` and `USER_PERMISSIONS` in Netlify.
- **User Configs:** Ensure the private repository contains the matching `user_configs/{username}_config.json` files.
- **Build Logic:** If adding a new tool that requires private assets, you must manually add a `generateSecureAssets` call to `build-fetch-secure-assets.mts` to ensure the files are downloaded during build.
- **Structure:** secure assets are flattened into `secure_assets/` locally during build.

## Netlify Functions & Auth

Some tools rely on Serverless Functions for authentication and data access.

### 1. Authentication Flow

- **Login:** The client `POST`s credentials to `/.netlify/functions/auth-login`.
- **Session:** On success, the function returns a `nf_jwt` **HttpOnly cookie**.
  - The JWT is signed with `JWT_SECRET`.
- **Logout:** `POST` to `/.netlify/functions/auth-logout` clears the cookie.

### 2. Fetching Secure Assets

Private assets (PDFs, JSON data) are **not** served statically. They reside in the `secure_assets/` folder, which is excluded from the public build but included in the function bundle.

- **Endpoint:** `/.netlify/functions/get-secure-asset?file={filename}`
- **Logic:** The function verifies the `nf_jwt` cookie and checks if the user has permission for the requested file before streaming it.

---

## Contributing

Most contributions are expected to be focused on medical content in the `content/` directory. 

Because the full build pipeline requires access to private repositories, non-core contributors should focus on markdown edits and rely on Netlify Deploy Previews for verification, or seek guidance from the maintainer for local environment setup.
