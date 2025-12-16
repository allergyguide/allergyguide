import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';

// Get git commit hash
let commit_hash;
try {
  commit_hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.error("Failed to find commit_hash", error)
  process.exit(1);
}

// Get tools versioning
if (!existsSync('./tools_versioning.json')) {
  console.error("tools_versioning.json not found");
  process.exit(1);
}
const toolVersioning = JSON.parse(readFileSync('./tools_versioning.json', 'utf-8'));

// ==========================================
// TYPST INTEGRATION STEP
// ==========================================

const TYPST_VERSION = "0.14.2";
const TYPST_HASH = "a6044cbad2a954deb921167e257e120ac0a16b20339ec01121194ff9d394996d";
const FILENAME = "typst.tar.xz";
const typstBin = './typst';
const pdfOutDir = 'static/pdfs';
const fontPath = 'fonts';
const typstSrcDirs = [
  'static/tool_assets',
];

try {
  // Check for existing Typst binary (ie in dev)
  // Only try to download if we are on Linux (Netlify) and don't have it
  const isLinux = process.platform === 'linux';

  if (!existsSync(typstBin) && isLinux) {
    console.log(`Typst not found. Downloading v${TYPST_VERSION}...`);
    execSync(`curl -L -o ${FILENAME} https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz`);

    // Verify Checksum (Shell out to sha256sum for simplicity)
    console.log("Verifying checksum...");
    const calculatedHash = execSync(`sha256sum ${FILENAME} | awk '{ print $1 }'`).toString().trim();
    if (calculatedHash !== TYPST_HASH) {
      throw new Error(`Checksum mismatch! Expected ${TYPST_HASH} but got ${calculatedHash}`);
    }

    console.log("Checksum verified. Extracting...");
    execSync(`tar -xf ${FILENAME} --strip-components=1 --wildcards '*/typst'`);
    execSync(`rm ${FILENAME}`); // clean
    execSync(`chmod +x ${typstBin}`);
  }
}
catch (error) {
  console.error("Typst download failed:", error);
  process.exit(1);
}

try {
  // Determine which command to run: local binary or global command
  const typstCommand = existsSync(typstBin) ? typstBin : 'typst';

  // Prepare Output Directory
  if (!existsSync(pdfOutDir)) {
    mkdirSync(pdfOutDir, { recursive: true });
  }

  // Find and Compile .typ files
  let filesFound = false;
  typstSrcDirs.forEach(srcDir => {
    if (existsSync(srcDir)) {
      const files = readdirSync(srcDir).filter(f => f.endsWith('.typ'));

      if (files.length > 0) {
        filesFound = true;
        console.log(`Found ${files.length} Typst files in ${srcDir}.`);
        files.forEach(file => {
          const inputPath = path.join(srcDir, file);
          const outputFilename = file.replace('.typ', '.pdf');
          const outputPath = path.join(pdfOutDir, outputFilename);

          try {
            console.log(`Compiling: ${inputPath} -> ${outputPath}`);

            // Pass variables via --input flags
            const cmd = `${typstCommand} compile \
            --font-path "${fontPath}" \
            --input commit_hash="${commit_hash}" \
            "${inputPath}" "${outputPath}"`;
            execSync(cmd);
          } catch (e) {
            console.warn(`Failed to compile ${file}.`, e);
            throw (e)
          }
        });
      }
    } else {
      console.log("No 'typst-src' directory found, skipping PDF generation.");
    }
  });

  if (!filesFound) {
    console.log("No Typst files found in any source directories.");
  }

} catch (error) {
  console.error("Typst build setup failed:", error);
  process.exit(1);
}

// ENTRY POINTS
const entryPoints = {};

// DEFINES
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
  // either standalone ${toolName}.ts within ts/, or ts/${toolName}/main.ts
  // Assumes ts/ is at root
  let inputPath;
  if (existsSync(`ts/${toolName}/main.ts`)) {
    inputPath = `ts/${toolName}/main.ts`;
  }
  else if (existsSync(`ts/${toolName}.ts`)) {
    inputPath = `ts/${toolName}.ts`;
  }
  else {
    console.error(`Error: No source for ${toolName} in ts/`);
    process.exit(1);
  }

  // Output filename key example: oit_calculator.0.8.0-a1213b2c.js
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
  console.log(`Building with commit hash: ${commit_hash}`);
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
