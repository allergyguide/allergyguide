import { normalize } from 'path';

// Helper to check if a value is a likely file path 
const isFilePath = (str: string) => str.includes('/') || str.includes('.');

/**
 * Recursively traverses an arbitrary configuration object (JSON) to collect all strings that appear to be file paths
 * It normalizes paths (e.g., resolving 'foo//bar' to 'foo/bar') to ensure consistent comparison against requested filenames.
 *
 * @param {any} config - The user configuration object (can be string, array, or nested object)
 * @param {Set<string>} [paths] - An accumulator Set used during recursion. Defaults to a new Set
 * @returns {Set<string>} A Set containing all unique, normalized file paths found within the config
 */
export function getAllFilePaths(config: any, paths: Set<string> = new Set()): Set<string> {
  if (typeof config === 'string') {
    // Normalize the path (resolves '..', '//', and converts slashes for OS)
    if (isFilePath(config)) {
      paths.add(normalize(config));
    }
  } else if (Array.isArray(config)) {
    config.forEach(item => getAllFilePaths(item, paths));
  } else if (config && typeof config === 'object') {
    Object.values(config).forEach(val => getAllFilePaths(val, paths));
  }
  return paths;
}



// Helper to escape HTML characters in user input (prevents broken layout/injection)
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
