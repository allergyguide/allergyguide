# TypeScript Architecture & Setup

For complex tools and interactive components, we use **TypeScript** and **esbuild**.

`tsconfig.json` exists in the root directory.

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
├── build.mjs                  # Build script
└── package.json
```

## Build System

- **Bundler**: `esbuild`
- **Glue**: `build.mjs`
- **Type Checking**: `tsc`
- **Configuration**: `tools_versioning.json`

### `package.json` Scripts

```json
...,
"scripts": {
  "check:ts": "tsc --noEmit",
  "build:ts": "npm run check:ts && node build.mjs"
},
...
```

### `build.mjs` Configuration

The build script is dynamic. It does **not** require manual entry of paths in the script itself. Instead, it reads `tools_versioning.json` from the root directory.

For each key in `tools_versioning.json` (e.g., `"oit_calculator"`), the script looks for:

1. `ts/{tool_name}/main.ts` (Project folder preference)
   or
2. `ts/{tool_name}.ts` (Single file fallback)

It generates an output file in `static/js/` with the format: `{tool_name}.{version}-{commit_hash}.js`.

## Workflow: Adding New TS Code

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

### 3. Build

Run the build command:

```bash
npm run build:ts
```

This will:

1. Type-check your code.
2. Bundle the code using `esbuild`.
3. Output the file to `static/js/`.
4. Generate/Update `static/js/tools_versioning.json` containing the exact filename (including the hash) for the site generator to use.

### 4. Git & Deployment

**Note on Versioning:**
The output filenames include the Git commit hash (e.g., `tool.0.8.0-a1b2c3d.js`). This ensures cache busting but means filenames change with every commit.

- **Locally:** You may accumulate multiple versions of the JS files in `static/js/` as you work; don't commit the generated files in `static/js/`
- **Netlify:** The site is built from a fresh clone, so `static/js/` starts 'empty' and is populated only with the artifacts for the current commit.

### 5. Integration with Zola

Zola needs to know the generated filename (which changes with every commit due to the hash).
Ensure shortcode or template reads `static/js/tools_versioning.json` to find the correct script source.

## Dependencies

### Runtime Dependencies

Dependencies are installed via `npm` and bundled automatically by esbuild. Code splitting is enabled, so if two projects use the same library (e.g., `decimal.js`), it will be extracted into a shared chunk in `static/js/chunks/` to avoid duplication.

### Dev Dependencies

- `typescript`
- `esbuild`
- `@types/node`
