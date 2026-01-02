import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import path from 'path';

// Typst version mgment
const TYPST_VERSION = "0.14.2";
const TYPST_HASH = "a6044cbad2a954deb921167e257e120ac0a16b20339ec01121194ff9d394996d";
const FILENAME = "typst.tar.xz";
const typstBin = './typst';
const fontPath = 'fonts';

// Where to scan for .typ files
// If there's a public one then edit this to include it
const typstSrcDirs = [
  'secure_assets/oit_calculator',
  'static/tool_assets/oit_calculator',
];

/**
 * Checks for the Typst binary and downloads it if missing (Linux/Netlify only).
 * Performs a SHA256 checksum verification to ensure supply chain security.
 */
export function loadTypstBinary() {
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
}

/**
 * Compiles all `.typ` files found in `typstSrcDirs` into `.pdf` files.
 * Injects the current git commit hash into the Typst document via CLI arguments.
 * @param commit_hash - The short hash of the current git commit (for version stamping in PDFs).
 */
export function compileTypst(commit_hash: string) {
  try {
    // Determine which command to run: local binary or global command
    const typstCommand = existsSync(typstBin) ? typstBin : 'typst';

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
            const outputPath = path.join(srcDir, outputFilename);

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
}
