import { writeFileSync, existsSync } from 'fs';
import * as esbuild from 'esbuild';

/**
 * Configuration structure for tool versions.
 * @example { "oit_calculator": "0.12.0" }
 */
interface ToolVersioning {
  [toolName: string]: string;
}

/**
 * Builds TypeScript tools using esbuild.
 * 1. Reads tool versions from configuration
 * 2. Injects build-time constants (Version, Commit Hash)
 * 3. Hashes filenames for cache-busting (e.g., `tool.v1-abc1234.js`)
 * 4. Generates a mapping file (`tools_versioning.json`) for Zola templates to resolve the hashed filenames
 * @param toolVersioning - Object mapping tool names to their semantic versions
 * @param commit_hash - Current git commit hash
 */
export async function buildTS(toolVersioning: ToolVersioning, commit_hash: string) {
  const entryPoints = {};

  // GLOBAL DEFINES available to all TS files
  const define = {
    'import.meta.vitest': 'undefined',
    '__COMMIT_HASH__': JSON.stringify(commit_hash)
  };

  // Helper to track output filenames for Zola
  const zolaData = {};

  Object.keys(toolVersioning).forEach(toolName => {
    const version = toolVersioning[toolName];

    // Define a version constant specific to this tool (needed if want to access from JS/TS)
    define[`__VERSION_${toolName.toUpperCase()}__`] = JSON.stringify(version);

    // find TS script paths
    // Priority 1: _ts/{toolName}/main.ts (Component folder structure)
    // Priority 2: _ts/{toolName}.ts      (Simple file structure)
    // Assumes _ts/ is at root
    let inputPath: string;
    if (existsSync(`_ts/${toolName}/main.ts`)) {
      inputPath = `_ts/${toolName}/main.ts`;
    }
    else if (existsSync(`_ts/${toolName}.ts`)) {
      inputPath = `_ts/${toolName}.ts`;
    }
    else {
      console.error(`Error: No source for ${toolName} in _ts/`);
      process.exit(1);
    }

    // Output filename key example: oit_calculator.0.8.0-a1213b2c.js
    // Format: toolname.version-hash
    const outputName = `${toolName}.${version}-${commit_hash}`;
    // Map Output Name -> Input Path
    entryPoints[outputName] = inputPath;

    // Save for Zola
    zolaData[toolName] = {
      version: version,
      file: `${toolName}.${version}-${commit_hash}.js`, // filename for Zola to use
      hash: commit_hash
    };
  });

  // Run
  try {
    console.log(`Building TS with commit hash: ${commit_hash}`);
    await esbuild.build({
      entryPoints: entryPoints,
      bundle: true,
      outdir: 'static/js/',
      format: 'esm',
      splitting: true,
      target: 'es2022',
      minify: true,
      sourcemap: true,
      chunkNames: 'chunks/[name]-[hash]',
      define: define,
      logLevel: 'info',
    })

    console.log("Tool versions built:", JSON.stringify(toolVersioning));
    // write data for Zola to pick up with internal shortcode
    writeFileSync('./static/js/tools_versioning.json', JSON.stringify(zolaData, null, 2));
    console.log("Created static/tools_versioning.json for Zola");
  } catch (error) {
    console.error("build.mjs failed:", error)
    process.exit(1);
  }
}

