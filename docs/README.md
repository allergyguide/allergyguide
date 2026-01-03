# Build and Development Architecture

## Quick start

This project uses Zola SSG hosted on Netlify, with a custom build pipeline handling TypeScript, Typst, and secure asset fetching.

- **Required dependencies:**
  - [Zola](https://www.getzola.org/) (SSG)
  - [Node.js](https://nodejs.org/) & npm (Scripting & Bundling)
  - [Netlify CLI](https://docs.netlify.com/cli/get-started/) (for local serverless testing)
  - [Typst](https://github.com/typst/typst) (markup-based typesetting system for PDF creation)

- **To test the site locally**: `npm run serve`
  - _Note: This runs the full build pipeline (TS, Assets) before starting Zola. Do not commit the artifacts in `static/js` or `secure_assets`._

- To create an online deploy preview for private sharing use the Netlify cli: `netlify deploy`

## Relevant structure

```text
 .
├──  config.toml # Zola Configuration
├──  netlify.toml # Netlify Configuration (Build commands, headers)
├──  netlify
│   └──  functions
├── build.mts                  # Main Build Orchestrator
├── build-ts.mts               # TypeScript Bundling Logic (esbuild)
├── build-typ.mts              # Typst Logic (Download binary & Compile PDFs)
├── build-fetch-secure-assets.mts # Fetches private assets from GitHub
├── build-utils.mts            # Shared utilities (GitHub API, User Verification)
├──  build-patch-sw.js # patch abridge generated service workers so that netlify functions work
├──  package-lock.json
├──  package.json # NPM Scripts & Dependencies
├──  package_abridge.js
│
├── secure_assets/             # (GitIgnored) Downloaded private assets/tools
│
├──  content # markdown content
│   ├──  _index.md
│   ├──  shortcodes.md
│   ├──  tools
│   ├──  topics
│   └── ... etc.
├──  fonts
│   ├──  Arimo-Bold.ttf
│   └── ... .etc. Important for Typst (limited fonts bundled in binary)
├──  sass
│   ├──  _extra.scss
│   ├──  abridge.scss
│   └──  shortcodes -- this is relevant, will contain  modules to be referenced in _extra.scss
├──  static
│   ├──  icon for .svgs
│   ├──  images for gen purpose images 
│   ├──  js where js is placed for simple shortcodes, and where TS is compiled to JS at build-time
│   ├──  manifest.min.json -- needed for PWA config
│   ├──  research
│   ├──  toml
│   ├──  tool_assets - for public resources for tools
│   └──  topic_assets
│       ├──  cnf_extracted.csv -- this has to be moved somewhere else later
│       ├──  oit_calculator -- in general tools should have their own folder 
│       │   └──  public_oit_patient_resource_terms.typ
│       └──  typed_foods.json -- this is outside because it is going to be shared by multiple tools in the future
├──  templates
│   ├──  shortcodes
│   │   ├──  admonition.html
│   │   └──  ... etc.
│   └──  topic_index.html
├──  tools_versioning.json # Configuration: Maps tool names to versions
├──  ts # Source TypeScript for client-side tools
│   ├──  oit_calculator # Complex Tool (Folder-based)
│   │   ├──  constants.ts
│   │   ├──  core
│   │   ├──  data
│   │   ├──  export
│   │   ├──  main.ts # Entry point
│   │   ├──  state
│   │   ├──  tests
│   │   ├──  types.ts
│   │   ├──  ui
│   │   └──  utils.ts
│   └── simple_script.ts       # Standalone script
├──  tsconfig.json
├──  vitest.config.ts
└──  TODO.md
```

---

### **The Build Pipeline**

Orchestrated via `npm run build:core`:

1. The build is orchestrated via `npm run build:core` (or `npm run serve` for dev), which executes these steps in order:

- Connects to the GitHub repository using private PAT
- Downloads private assets from the `private-tools/` directory in the private repo tree
- Populates the local `secure_assets/` folder.

2. **Type Checking for TypeScript projects:** (`npm run check:ts`)

3. **Main Build:** (`build.mts`)

- **User Verification:** Checks `AUTH_USERS` and `USER_PERMISSIONS` environment variables to ensure no orphaned permissions exist.
- **Environment variable Verification:** Crashes if correct environment variables do not exist.
- **Typst Compilation:** Checks for/downloads the Typst binary (Linux only) and compiles `.typ` files to PDFs. Directories containing the .typ files must be pre-specified.
- **TypeScript Bundling:** Uses `esbuild` to bundle client-side tools found in `ts/` based on `tools_versioning.json`.

* When it's actually built on Netlify (ie by Netlify deploy) then additional important step is:

**Service Worker Patch**

- Runs _after_ Zola to inject a guard clause into `sw.min.js`.
- Ensures Netlify Function calls (`/.netlify/`) and POST requests bypass the cache.

---

### **Environment Variables**

These must be set in Netlify (Site Settings > Environment Variables) and ideally also in a `.env` file locally.

| Variable             | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `PRIVATE_TOKEN`      | GitHub PAT to fetch private assets/tools.                   |
| `GITHUB_OWNER`       | Owner of the repo (e.g., `john-doe`).                       |
| `GITHUB_REPO`        | Repository name (e.g. `repo-name`).                         |
| `AUTH_USERS`         | JSON object of allowed users/passwords: `{"user": "pass"}`. |
| `USER_PERMISSIONS`   | JSON object mapping users to tool permissions/files.        |
| `JWT_SECRET`         | Secret key used to sign Auth Cookies.                       |
| `TOKEN_EXPIRY_HOURS` | Duration of the session in hours (Default: 24).             |

---

## Developing content

### Simple shortcodes

- Create an HTML file in `templates/shortcodes/`.
- For JS/SCSS: Place files in `static/js/{name}.js` (if simple) or `sass/shortcodes/_{name}.scss`.
- See Zola docs for syntax.

### TypeScript shortcodes

- see separate page for how to do this
- in general for more complex apps we are aiming to create an Island Architecture

### Generating secure content for tools

- **Auth/Permissions:** Update `AUTH_USERS` and `USER_PERMISSIONS` in Netlify.
- **User Configs:** Ensure the private repository contains the matching `user_configs/{username}_config.json` files.
- **Structure:** secure assets are flattened into `secure_assets/` locally during build.

### Adding PDFs (Typst)

- **Source:** Place `.typ` files in any directory listed in `build-typ.mts`. Or add a src directory to that file.
- **Compilation:** The build script automatically finds them and compiles them to PDF.
- **Fonts:** Custom fonts must be in `fonts/` for Typst to detect them.
