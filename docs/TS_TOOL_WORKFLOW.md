# TypeScript Architecture

For complex tools (like the OIT Calculator) and interactive components requiring auth, we use **TypeScript** and **esbuild**.

## Directory Structure

```text
.
├── ts/                        # Source TypeScript
│   ├── simple_script.ts       # Standalone script example
│   └── oit_calculator/        # Complex Project 
│       ├── main.ts            # Entry point 
│       └── logic.ts           # Internal logic
│
├── static/
│   └── js/                    # Output (built files)
│       ├── simple_script.1.0.0-a1b2c3d.js
│       ├── oit_calculator.0.8.0-a1b2c3d.js
│       ├── tools_versioning.json # Generated map for Zola/Shortcodes
│       └── chunks/            # Shared code (e.g. libraries)
│
├── tools_versioning.json      # Configuration: Maps tool names to versions
├── build-ts.mts                  # Build script
```

## Build System

- **Bundler**: `esbuild`
- **Type Checking**: `tsc`
- **Configuration**: `tools_versioning.json`

### `package.json` Scripts

```json
...,
"scripts": {
    "test": "vitest run",
    "check:ts": "tsc --noEmit",
    "build:core": "tsx build-fetch-secure-assets.mts && npm run check:ts && tsx build.mts",
    "serve": "npm i && npm run build:core && zola build && vitest run && netlify dev",
},
...
```

## What happens during build

See build-ts.mts

The build script is dynamic. It does **not** require manual entry of paths in the script itself. Instead, it reads `tools_versioning.json` from the root directory.

For each key in `tools_versioning.json` (e.g., `"oit_calculator"`), the script looks for:

1. `ts/{tool_name}/main.ts` (Project folder preference)
   or
2. `ts/{tool_name}.ts` (Single file fallback)

It generates an output file in `static/js/` with the format: `{tool_name}.{version}-{commit_hash}.js`.

## Workflow: Creating a new TS project

### 1. Create Source Code

**Option A: Simple Script**
Create `ts/my_script.ts`.

**Option B: Complex Tool**
Create `ts/my_tool/main.ts` (and other files in that folder).

### 2. Register Tool

Open `tools_versioning.json` in the root directory and add your tool with a version number:

```json
{
  "oit_calculator": "0.8.0",
  "my_script": "1.0.0"
}
```

### 3. Integrate with Zola

In your shortcode or HTML template, dynamically load the hashed filename:

```html
{%/* set tools = load_data(path="/js/tools_versioning.json") */%}
{%/* set tool_info = tools.oit_calculator */%}

... html stuff ...

<script type="module" src="/js/{{/* tool_info.file */}}"></script>
```

### 4. Build

Run `npm run serve`. This will:

1. Compile TS to `static/js/my_tool.{hash}.js`.
2. Update `static/js/tools_versioning.json`.
3. Start the Zola server.

## Netlify Functions & Auth

The tools rely on Serverless Functions for authentication and data access.

### 1. Authentication Flow

- **Login:** POST to `/.netlify/functions/auth-login`. Returns an `httpOnly` cookie (`nf_jwt`).
- **Logout:** POST to `/.netlify/functions/auth-logout` (clears cookie).
- **Security:**
- Rate limited via Cloudflare (WAF).
- JWT signed with `JWT_SECRET`.
- Strict `SameSite` cookie policy.

### 2. Fetching Secure Assets

- **Endpoint:** `/.netlify/functions/get-secure-asset?file={filename}`.
- **Logic:** The function validates the JWT cookie and checks `USER_PERMISSIONS` before streaming the file (JSON or PDF) from the `secure_assets/` folder.

### 3. The Service Worker Patch (`patch-sw.js`)

The Abridge theme automatically generates a Service Worker (`sw.min.js`) for PWA capabilities. By default, this SW tries to cache everything.

**The Problem:** Service Workers cannot cache `POST` requests, causing Login to fail. They also interfere with Auth headers on 401/403 responses.

**The Solution:**
We run `node patch-sw.js` at the end of the build. This injects a guard clause at the top of the Service Worker:

```javascript
self.addEventListener("fetch", (event) => {
  // Force Netlify functions and POSTs to bypass the Service Worker
  if (
    event.request.url.includes("/.netlify/") || event.request.method === "POST"
  ) {
    event.respondWith(fetch(event.request));
    event.stopImmediatePropagation();
  }
});
```

_Dev Note: If you see "Failed to execute 'put' on 'Cache'", the patch is missing._

## Git & Deployment

**Note on Versioning:**
The output filenames include the Git commit hash (e.g., `tool.0.8.0-a1b2c3d.js`). This ensures cache busting but means filenames change with every commit.

- **Locally:** You may accumulate multiple versions of the JS files in `static/js/` as you work; don't commit the generated files in `static/js/`
- **Netlify:** The site is built from a fresh clone, so `static/js/` starts 'empty' and is populated only with the artifacts for the current commit.

## Dependencies

### Runtime Dependencies

Dependencies are installed via `npm` and bundled automatically by esbuild. Code splitting is enabled, so if two projects use the same library (e.g., `decimal.js`), it will be extracted into a shared chunk in `static/js/chunks/` to avoid duplication.

### Dev Dependencies

- `typescript`
- `esbuild`
- `@types/node`

### **Testing**

Unit tests are implemented using **Vitest**.

- **Run Tests:** `npm test` (Runs `vitest run`).
-

**In-Source Testing:** Configured in `tsconfig.json` and `build-ts.mts` via `define: { 'import.meta.vitest': 'undefined' }` so test code is stripped from production bundles.
