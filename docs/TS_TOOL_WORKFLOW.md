# TypeScript Architecture

For complex tools (like the OIT Calculator) and interactive components, we use **TypeScript** and **esbuild**. This allows us to develop robust applications that are bundled, versioned, and injected into the static site.

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
└── tools_versioning.json      # Configuration: Maps tool names to versions
```

## How to Add a New Tool

### 1. Create Source Code

**Option A: Simple Script**
Create a single file: `ts/my_script.ts`.

**Option B: Complex Tool**
Create a folder `ts/my_tool/` and ensure it has a `main.ts` file as the entry point.

### 2. Register the Tool

Open `tools_versioning.json` in the root directory and add your tool with a version number. The key must match your filename or folder name.

```json
{
  "oit_calculator": "0.8.0",
  "my_script": "1.0.0",
  "my_new_tool": "0.1.0"
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

### 4. Build and test locally

Run `npm run serve`. This will:

1. Detect the new entry in `tools_versioning.json`.
2. Compile the TS to `static/js/my_new_tool.{version}-{hash}.js`.
3. Update `static/js/tools_versioning.json` with the final hashed filename.
4. Start the Zola server using `netlify dev`.

Note:

- **Locally:** You may accumulate multiple versions of the JS files in `static/js/` as you work; don't commit the generated files in `static/js/`
- **Netlify:** The site is built from a fresh clone, so `static/js/` starts 'empty' and is populated only with the artifacts for the current commit.

## Technical Details

- **Bundler:** `esbuild`
- **Hashing:** Output filenames include a commit hash (e.g., `tool.1.0.0-a1b2c3d.js`) for cache busting.
- **Code Splitting:** Shared libraries (like `decimal.js`) are automatically extracted into `static/js/chunks/` to prevent code duplication between tools.
- **Testing:** Run `npm test` to execute Vitest unit tests located inside `ts/`.
