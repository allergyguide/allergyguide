import { ALLERGENS, TEMPLATES } from "./spt_generator_constants.js";
import { removeSpan, normalizeAllergenName, escapeHtml, flattenAllergens, copyToClipboard } from "./spt_generator_utils.js";
import { getSummary, getTable } from "./spt_generator_display.js";

/**
 * Allergy testing utilities module
 * 
 * @constant {Object} ALLERGENS - Hierarchical allergen categories (aeroallergens, foods, venoms)
 * @constant {Object} TEMPLATES - Predefined allergen groups (controls, commonNuts, commonFruits)
 * 
 * @function flattenAllergens
 *   @param {Object} obj - Nested allergen structure
 *   @returns {string[]} Flattened array of all allergen strings
 * 
 * @function getTable
 *   @param {Object[]} entryList - Allergen entries ({ allergen, diameter, note })
 *   @param {boolean} useCol - Enable two-column format
 *   @param {boolean} sort - Sort by ALLERGENS hierarchy first, then alphabetically
 *   @returns {string} Formatted ASCII table with optional notes wrapping
 * 
 * Note: Sorting uses ALLERGENS' hierarchical order (main categories → subcategories → allergen position).  In addition, when editing an existing entry's allergen, there is intentionally no dropdown for suggestions. getTable() will also handle cases where an entry diameter is NaN or null.
 */

/**
* Represents an allergen entry with measurement and notes
* @class
*/
class Entry {
  /**
   * Create a new allergen entry
   * @param {string} allergen - Name of the allergen
   * @param {number} diameter - Measurement diameter in millimeters
   * @param {string|null} note - Optional note about the entry
   */
  constructor(allergen, diameter, note) {
    this.allergen = allergen.trim();
    this.diameter = diameter;
    this.note = note;
  }
}

/** @type {Entry[]} Array of allergen entries */
let entries = [];

/** @type {string[]} Flattened list of all allergens for search */
const cachedFlattenedAllergens = flattenAllergens(ALLERGENS);

// DOM Content Loaded Handler
document.addEventListener("DOMContentLoaded", function() {
  const mainContainer = document.querySelector(".spt_generator");
  const entryCreation = document.querySelector(".entry-creation");
  const [inputRow, entriesList] = createInputComponents();

  entryCreation.append(inputRow, entriesList);
  setupEventListeners(mainContainer, entriesList);
  updateDisplays();
});

/**
 * Create main input components
 * @returns {[HTMLDivElement, HTMLDivElement]} Tuple containing input row and entries list elements
 */
function createInputComponents() {
  // Input Row
  const inputRow = document.createElement("div");
  inputRow.className = "input-row";

  // Allergen Input
  const [allergenContainer, allergenInput, dropdown] = createAllergenInput();

  // Diameter Input
  const diameterInput = createNumberInput("Biggest dimension in mm", "Diameter in millimeters");

  // Note Input
  const noteInput = createTextInput("Note (optional)", "Optional note");

  inputRow.append(allergenContainer, diameterInput, noteInput);

  // Entries List
  const entriesList = document.createElement("div");
  entriesList.className = "entries-list";
  entriesList.setAttribute("aria-live", "polite");

  return [inputRow, entriesList];
}

/**
 * Create allergen input with dropdown container
 * @returns {[HTMLDivElement, HTMLInputElement, HTMLDivElement]} Tuple containing container, input, and dropdown
 */
function createAllergenInput() {
  const container = document.createElement("div");
  container.className = "input-container allergen-input";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Search/input allergen";
  input.autofocus = true;
  input.setAttribute("aria-label", "Search allergen");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  // Add a dedicated class for easier targeting
  input.classList.add("allergen-input-field");

  const dropdownId = `dropdown-${Math.random().toString(36).substr(2, 9)}`;
  const dropdown = document.createElement("div");
  dropdown.className = "dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.id = dropdownId;
  input.setAttribute("aria-controls", dropdownId);

  container.append(input, dropdown);
  return [container, input, dropdown];
}

/**
 * Create number input with validation
 * @param {string} placeholder - Input placeholder text
 * @param {string} ariaLabel - ARIA label for accessibility
 * @returns {HTMLInputElement} Configured number input element
 */
function createNumberInput(placeholder, ariaLabel) {
  const container = document.createElement('div');
  container.className = 'input-container';
  const input = document.createElement('input');
  input.type = 'number';
  input.placeholder = placeholder;
  input.min = 0;
  input.setAttribute('aria-label', ariaLabel);
  input.addEventListener('input', validateNumberInput);
  input.addEventListener('keydown', handleNewAllergenDiameterKey);
  container.appendChild(input);
  return container;
}

/**
 * Create text input field
 * @param {string} placeholder - Input placeholder text
 * @param {string} ariaLabel - ARIA label for accessibility
 * @returns {HTMLInputElement} Configured text input element
 */
function createTextInput(placeholder, ariaLabel) {
  const container = document.createElement('div');
  container.className = 'input-container';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', ariaLabel);
  container.appendChild(input);
  return container;
}

/**
 * Validate number input to prevent negative values
 * @param {Event} e - Input event
 */
function validateNumberInput(e) {
  if (e.target.value < 0) e.target.value = 0;
}

/**
 * Set up all event listeners for the component
 * @param {HTMLElement} container - Main container element
 * @param {HTMLElement} entriesList - Entries list container
 */
function setupEventListeners(container, entriesList) {
  // Reset Button
  container.querySelector('#reset-btn').addEventListener('click', handleReset);

  // Template Buttons
  container.querySelectorAll('.template-btn').forEach(btn => {
    if (btn.dataset.template) {
      btn.addEventListener('click', handleTemplateAdd);
    }
  });

  // Allergen Search
  const allergenInput = container.querySelector('.allergen-input input');

  allergenInput.addEventListener('input', handleAllergenSearch);
  allergenInput.addEventListener('keydown', handleDropdownNavigation);
  allergenInput.addEventListener('focusout', handleOutsideClick);

  // Global Click Handler
  document.addEventListener('click', handleOutsideClick);

  // Entry Submission
  const inputs = Array.from(container.querySelectorAll('.input-row input'));
  inputs.forEach(input => {
    // Only attach the submission handler if the input is not the allergen input
    if (!input.classList.contains('allergen-input-field')) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.defaultPrevented) {
          handleEntrySubmission.call(input, e);
        }
      });
    }
  });

  // Copy Buttons
  document.querySelectorAll(".copy-button").forEach(button => {
    button.addEventListener("click", function() {
      copyToClipboard(this);
    });
  });

  // Entries List Interactions
  entriesList.addEventListener('input', handleEntryUpdate);
  entriesList.addEventListener('click', handleEntryDeletion);
}

/**
 * Handle reset button click
 * @listens HTMLElement#click
 */
function handleReset() {
  entries = [];
  renderEntries();
  updateDisplays();
  this.blur();
}

/**
 * Handle template button clicks
 * @param {Event} e - Click event
 * @listens HTMLElement#click
 */
function handleTemplateAdd(e) {
  const template = TEMPLATES[e.target.dataset.template];
  template.forEach(allergen => {
    entries.push(new Entry(allergen, NaN, null));
  });
  renderEntries();
  updateDisplays();
  this.blur();
}

/**
 * Handle allergen search input with fuzzy matching
 * @param {Event} e - Input event
 * @listens HTMLInputElement#input
 */
function handleAllergenSearch(e) {
  const query = escapeHtml(e.target.value); // sanitize query
  const dropdown = this.parentNode.querySelector('.dropdown');
  dropdown.innerHTML = '';

  if (query.length === 0) {
    dropdown.classList.remove('visible');
    this.setAttribute('aria-expanded', 'false');
    return;
  }

  // Use fuzzysort with the updated scoring range (0 to 1) and new API.
  const results = fuzzysort.go(query, cachedFlattenedAllergens, {
    key: 'search',
    threshold: 0.1,
    limit: 10
  });

  if (results.length) {
    results.forEach(result => {
      const option = document.createElement("div");
      option.className = "dropdown-item";
      // Always display the canonical name.

      // Use highlight() if available; otherwise, fall back to escaped plain text.
      const highlighted = result.highlight('<span class="highlight">', '</span>');

      // this is slightly glitchy -- when synonyms are used (ie. dust mite) it will bring up two occurences of the actual D. etc.
      // Other functionality is preserved however.
      if (removeSpan(highlighted) != result.obj.display) {
        option.innerHTML = escapeHtml(result.obj.display);
      } else {
        option.innerHTML = highlighted;
      }

      // option.innerHTML = escapeHtml(result.obj.display);
      option.id = `option-${Math.random().toString(36).substr(2, 9)}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.addEventListener("click", () => {
        e.target.value = result.obj.display;
        dropdown.classList.remove("visible");
        e.target.setAttribute('aria-expanded', 'false');
        e.target.removeAttribute('aria-activedescendant');
        e.target.closest('.input-row').querySelector('input[type="number"]').focus();
      });
      dropdown.append(option);
    });
  } else {
    dropdown.append(createCustomOption(query, e.target));
  }

  const isVisible = dropdown.children.length > 0;
  dropdown.classList.toggle('visible', isVisible);
  e.target.setAttribute('aria-expanded', isVisible);
}

/**
 * Create custom dropdown option for non-matching queries
 * @param {string} query - User search query
 * @param {HTMLInputElement} inputElement - Associated input element
 * @returns {HTMLDivElement} Custom option element
 */
function createCustomOption(query, inputElement) {
  const option = document.createElement("div");
  option.className = "dropdown-item";
  option.setAttribute("role", "option");
  // Mark this as a custom option.
  option.setAttribute("data-custom", "true");
  option.addEventListener("click", () => {
    inputElement.value = query;
    inputElement.parentNode.querySelector('.dropdown').classList.remove("visible");
    // After selecting, move focus to the diameter input.
    inputElement.closest('.input-row').querySelector('input[type="number"]').focus();
  });
  return option;
}

/**
 * Handle keyboard navigation in dropdown
 * @param {KeyboardEvent} e - Keydown event
 * @listens HTMLInputElement#keydown
 */
function handleDropdownNavigation(e) {
  const dropdown = this.parentNode.querySelector('.dropdown');
  if (!dropdown.classList.contains('visible')) return;

  const items = dropdown.querySelectorAll('.dropdown-item');

  // If TAB is pressed and the only option is the custom one, hide dropdown and let TAB work normally.
  if (e.key === 'Tab' && items.length === 1 && items[0].getAttribute('data-custom') === 'true') {
    dropdown.classList.remove('visible');
    return; // do not preventDefault, allowing normal focus movement
  }

  let selectedIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

  // Handle ArrowDown, ArrowUp, Tab, Shift+Tab
  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
    e.preventDefault();
    const direction = 1;
    selectedIndex = Math.max(-1, Math.min(items.length - 1, selectedIndex + direction));
  } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
    e.preventDefault();
    const direction = -1;
    selectedIndex = Math.max(-1, Math.min(items.length - 1, selectedIndex + direction));
  }

  // Update selected item
  items.forEach((item, index) => {
    const isSelected = index === selectedIndex;
    item.classList.toggle('selected', isSelected);
    item.setAttribute('aria-selected', isSelected);
    if (isSelected) {
      this.setAttribute('aria-activedescendant', item.id);
    }
  });

  if (selectedIndex >= 0) {
    scrollItemIntoView(dropdown, items[selectedIndex]);
  }

  // Handle Enter and Escape
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].click();
    } else {
      this.closest('.input-row').querySelector('input[type="number"]').focus();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    dropdown.classList.remove('visible');
    this.removeAttribute('aria-activedescendant');
    this.focus();
  }
}

/**
 * Handle clicks outside allergen input
 * @param {Event} e - Focusout or click event
 * @listens Document#focusout
 * @listens Document#click
 */
function handleOutsideClick(e) {
  const allergenContainer = document.querySelector('.allergen-input');
  const dropdown = document.querySelector('.dropdown');

  let shouldClose = false;

  if (e.type === 'focusout') {
    // Close if moving focus outside the allergen container
    shouldClose = !allergenContainer.contains(e.relatedTarget);
  } else if (e.type === 'click') {
    // Close if clicking outside the allergen container
    shouldClose = !allergenContainer.contains(e.target);
  }

  if (shouldClose) {
    dropdown.classList.remove('visible');
  }
}

/**
 * Handle new entry submission
 * @param {KeyboardEvent} e - Keydown event
 * @listens HTMLInputElement#keydown
 */
function handleEntrySubmission(e) {
  if (e.key === 'Enter') {
    e.preventDefault();

    const dropdown = this.closest('.input-row').querySelector('.dropdown');
    if (dropdown.classList.contains('visible')) return;

    const inputs = Array.from(e.target.closest('.input-row').querySelectorAll('input'));
    const [allergen, diameter, note] = inputs.map(input =>
      input.type === 'number' ? parseFloat(input.value) : input.value.trim()
    );

    if (!allergen) {
      alert("Please enter an allergen");
      inputs[0].classList.add('error');
      return;
    }

    entries.push(new Entry(normalizeAllergenName(allergen), diameter, note || null));
    renderEntries();
    updateDisplays();
    inputs.forEach(input => {
      input.value = '';
      input.classList.remove('error');
    });
    inputs[0].focus();
  }
}


/**
 * Render all entries in the list
 */
function renderEntries() {
  const entriesList = document.querySelector('.entries-list');
  entriesList.innerHTML = '';

  entries.forEach((entry, index) => {
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry";
    // Set a data attribute so we know which entry this is.
    entryDiv.setAttribute("data-index", index);
    entryDiv.setAttribute("role", "listitem");

    const allergen = createEditableInput(
      entry.allergen,
      'text',
      (e) => {
        entry.allergen = e.target.value;
        updateDisplays();
      },
      'allergen-cell' // Add class here
    );

    const diameter = createEditableInput(
      isNaN(entry.diameter) ? '' : entry.diameter,
      'number',
      (e) => {
        entry.diameter = parseFloat(e.target.value) || NaN;
        updateDisplays();
      }
    );
    diameter.addEventListener('keydown', handleDiameterArrowNavigation);

    const note = createEditableInput(entry.note || '', 'text', (e) => {
      entry.note = e.target.value.trim() || null;
      updateDisplays();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.textContent = "×";
    deleteBtn.setAttribute("aria-label", "Delete entry");

    entryDiv.append(allergen, diameter, note, deleteBtn);
    entriesList.append(entryDiv);
  });
}

/**
 * Create editable input field for entries
 * @param {string} value - Initial input value
 * @param {string} type - Input type (text/number)
 * @param {function} handler - Input change handler
 * @returns {HTMLInputElement} Configured input element
 */
function createEditableInput(value, type, handler, className) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  if (className) input.className = className;
  input.addEventListener('input', handler);
  return input;
}

/**
 * Handle updates to existing entries
 * @param {Event} e - Input event
 * @listens HTMLElement#input
 */
function handleEntryUpdate(e) {
  if (e.target.tagName === 'INPUT') {
    const index = Array.from(e.target.closest('.entry').parentNode.children)
      .indexOf(e.target.closest('.entry'));
    const field = Array.from(e.target.parentNode.children).indexOf(e.target);

    switch (field) {
      case 0: entries[index].allergen = e.target.value; break;
      case 1: entries[index].diameter = parseFloat(e.target.value) || NaN; break;
      case 2: entries[index].note = e.target.value.trim() || null; break;
    }

    updateDisplays();
  }
}

/**
 * Handle entry deletion
 * @param {Event} e - Click event
 * @listens HTMLElement#click
 */
function handleEntryDeletion(e) {
  if (e.target.classList.contains('delete')) {
    const entryDiv = e.target.closest('.entry');
    const index = parseInt(entryDiv.getAttribute('data-index'));
    // Remove the entry from the array.
    entries.splice(index, 1);
    // Remove the DOM element for this entry.
    entryDiv.remove();
    updateDisplays();
    // Update data-index for remaining entries.
    updateEntryIndices();
  }
}


function handleDiameterArrowNavigation(e) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); // Prevent default number increment/decrement
    const currentEntry = e.target.closest('.entry');
    if (!currentEntry) return;

    // Get all entries as an array
    const entriesList = document.querySelector('.entries-list');
    const entries = Array.from(entriesList.children);
    const currentIndex = entries.indexOf(currentEntry);

    // Determine target index based on key pressed
    let targetIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;

    // Only focus if within bounds
    if (targetIndex >= 0 && targetIndex < entries.length) {
      const targetEntry = entries[targetIndex];
      const targetDiameter = targetEntry.querySelector('input[type="number"]');
      if (targetDiameter) {
        targetDiameter.focus();
      }
    }
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); // Prevent default caret movement
    let currentVal = parseFloat(e.target.value);
    if (isNaN(currentVal)) {
      currentVal = 0;
    }
    // Increment if right arrow, decrement if left arrow.
    if (e.key === 'ArrowRight') {
      currentVal++;
    } else if (e.key === 'ArrowLeft' && currentVal != 0) {
      currentVal--;
    }
    e.target.value = currentVal;

    // Update the corresponding entry's diameter.
    const entryDiv = e.target.closest('.entry');
    if (entryDiv) {
      const index = parseInt(entryDiv.getAttribute('data-index'), 10);
      if (!isNaN(index)) {
        entries[index].diameter = currentVal;
      }
    }
    updateDisplays();
  }
}

/**
 * Update data-index attributes after modifications
 */
function updateEntryIndices() {
  document.querySelectorAll('.entries-list .entry').forEach((entryDiv, idx) => {
    entryDiv.setAttribute('data-index', idx);
  });
}

function updateDisplays() {
  const simpleList = document.getElementById("simpleList");
  const tableFormat = document.getElementById("tableFormat");
  const paragraphDisplay = document.getElementById("paragraphDisplay");

  const simpleText = getTable(entries, false, true);
  const tableText = getTable(entries, true, true);
  const summaryText = getSummary(entries);

  simpleList.textContent = simpleText;
  tableFormat.textContent = tableText;
  paragraphDisplay.textContent = summaryText;

  // Hide copy button if the associated text is empty
  const simpleCopyBtn = simpleList.parentElement.querySelector('.copy-button');
  if (simpleText.trim() === "") {
    simpleCopyBtn.style.display = 'none';
  } else {
    simpleCopyBtn.style.display = '';
  }

  const tableCopyBtn = tableFormat.parentElement.querySelector('.copy-button');
  if (tableText.trim() === "") {
    tableCopyBtn.style.display = 'none';
  } else {
    tableCopyBtn.style.display = '';
  }

  const summaryCopyBtn = paragraphDisplay.parentElement.querySelector('.copy-button');
  if (summaryText.trim() === "") {
    summaryCopyBtn.style.display = 'none';
  } else {
    summaryCopyBtn.style.display = '';
  }
}

/**
 * Scroll dropdown item into view
 * @param {HTMLElement} container - Dropdown container
 * @param {HTMLElement} item - Target dropdown item
 */
function scrollItemIntoView(container, item) {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  if (itemRect.bottom > containerRect.bottom) {
    container.scrollTop += itemRect.bottom - containerRect.bottom;
  } else if (itemRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - itemRect.top;
  }
}

/**
 * Handles keydown events for the new allergen diameter input.
 *
 * When the left or right arrow keys are pressed, this function increments or decrements
 * the input value by 1. If the current value is not a number, it defaults to 0 before adjustment.
 * No negative numbers.
 * It prevents the default behavior (such as caret movement or the browser's default numeric step).
 *
 * @param {KeyboardEvent} e - The keydown event object.
 */
function handleNewAllergenDiameterKey(e) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault(); // Prevent default caret movement or numeric step behavior
    let currentVal = parseFloat(e.target.value);
    if (isNaN(currentVal)) {
      currentVal = 0;
    }
    // Increment for right arrow, decrement for left arrow.
    if (e.key === 'ArrowRight') {
      currentVal = currentVal + 1;
    } else if (currentVal != 0) {
      currentVal = currentVal - 1;
    }
    e.target.value = currentVal;
  }
}


