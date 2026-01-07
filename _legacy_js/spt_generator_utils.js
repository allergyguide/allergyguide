import { ALLERGENS } from "./spt_generator_constants.js";

const canonicalAllergensMap = buildCanonicalMap(ALLERGENS);

/**
 * Copy text content to clipboard with visual feedback
 * @param {HTMLButtonElement} button - Copy button element
 * @returns {void} Modifies button text temporarily during copy operation
 */
export function copyToClipboard(button) {
  const codeBlock = button.nextElementSibling; // Get the sibling `.txt` div
  const text = codeBlock.textContent || codeBlock.innerText;

  navigator.clipboard.writeText(text).then(() => {
    button.textContent = "Copied!"; // Temporarily change button text
    setTimeout(() => button.textContent = "Copy", 2000); // Revert after 2 seconds
  }).catch(err => {
    console.error("Failed to copy text: ", err);
    button.textContent = "Error";
    setTimeout(() => button.textContent = "Copy", 2000);
  });
}


/**
 * Recursively flatten hierarchical allergen structure into single array
 * @param {Object} obj - Nested allergen structure
 * @returns {string[]} Flattened array of all allergen strings
 */
export function flattenAllergens(obj) {
  let results = [];
  for (const key in obj) {
    const item = obj[key];
    if (Array.isArray(item)) {
      item.forEach(el => {
        if (typeof el === 'object' && el.name) {
          // Add the canonical name for display/search
          results.push({ display: el.name, search: el.name });
          // Add each synonym as a searchable term, but keep the canonical display name.
          if (Array.isArray(el.synonyms)) {
            el.synonyms.forEach(syn => {
              results.push({ display: el.name, search: syn });
            });
          }
        } else if (typeof el === 'string') {
          results.push({ display: el, search: el });
        }
      });
    } else if (typeof item === "object") {
      results.push(...flattenAllergens(item));
    }
  }
  return results;
}


/**
 * Escape HTML special characters to prevent XSS
 * @param {string} unsafe - Unsafe input string
 * @returns {string} Sanitized HTML-safe string
 */
export function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Wrap text to specified maximum width
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum characters per line
 * @returns {string[]} Array of wrapped lines
 */
export function wrapText(text, maxWidth) {
  const words = text.split(" ");
  let lines = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + word).length > maxWidth) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }
  return lines;
}

/**
 * Create hierarchical index map for sorting allergens
 * @param {Object} allergens - ALLERGENS structure
 * @returns {Map<string, number[]>} Map of allergens to their category indices
 */
export function buildAllergenOrderMap(allergens) {
  const orderMap = new Map();

  /**
   * Recursively traverse the allergen structure.
   * @param {*} node - Current node in the structure.
   * @param {number[]} path - Array representing the hierarchical path (indices).
   */
  function traverse(node, path) {
    if (Array.isArray(node)) {
      // Iterate over array elements
      for (let i = 0; i < node.length; i++) {
        const item = node[i];
        // If item is an object and looks like an allergen (has a name or display), record it.
        if (
          item &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          ('name' in item || 'display' in item)
        ) {
          const key = item.display || item.name;
          orderMap.set(key, path.concat(i));
        } else if (typeof item === 'string') {
          // If it's a string, record it as a leaf allergen.
          orderMap.set(item, path.concat(i));
        } else if (item && typeof item === 'object') {
          // If it's an object but not an allergen leaf, traverse it.
          traverse(item, path.concat(i));
        }
      }
    } else if (node && typeof node === 'object') {
      // For a plain object, iterate over its keys in insertion order.
      const keys = Object.keys(node);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const child = node[key];
        // Use the key's order (j) as the next index in the path.
        traverse(child, path.concat(j));
      }
    }
  }

  // Start recursion at the top level with an empty path.
  traverse(allergens, []);
  return orderMap;
}


/**
 * Builds a lookup map of canonical allergen names keyed by lowercase.
 * @param {Object} allergens - The ALLERGENS object.
 * @returns {Map<string, string>} Map where keys are lowercase allergen names and values are canonical names.
 */
function buildCanonicalMap(allergens) {
  const canonicalMap = new Map();

  const processGroup = (group) => {
    if (Array.isArray(group)) {
      group.forEach(item => {
        const name = typeof item === 'object' ? (item.display || item.name) : item;
        canonicalMap.set(name.toLowerCase(), name);
      });
    } else if (typeof group === 'object') {
      Object.values(group).forEach(subGroup => processGroup(subGroup));
    }
  };

  processGroup(allergens);
  return canonicalMap;
}

/**
 * Normalize the allergen name.
 * If the input matches a canonical allergen (case-insensitively), return the canonical name.
 * Otherwise, return the input as is.
 * @param {string} input - The user entered allergen.
 * @returns {string} The normalized allergen name.
 */
export function normalizeAllergenName(input) {
  return canonicalAllergensMap.get(input.toLowerCase()) || input;
}


/**
 * Removes all <span> HTML tags from a given string while preserving the inner content.
 * 
 * @param {string} str - The input string containing <span> tags.
 * @returns {string} - The string with <span> tags removed.
 */
export function removeSpan(str) {
  return str.replace(/<\/?span[^>]*>/g, '');
}
