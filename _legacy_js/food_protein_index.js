// Configuration
const CONFIG = {
  DEBOUNCE_DELAY: 150,
  SEARCH_THRESHOLD: -10000,
  SEARCH_LIMIT: 100,
  VIRTUAL_SCROLL_THRESHOLD: 100,
};

document.addEventListener("DOMContentLoaded", function() {
  const searchInput = document.getElementById("food-search");
  const clearBtn = document.getElementById("clear-search");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const tableBody = document.getElementById("food-table-body");
  const resultsCount = document.getElementById("results-count");
  const noResults = document.getElementById("no-results");
  const foodTable = document.getElementById("food-table");

  // Cache DOM elements and create optimized data structure
  const allRows = Array.from(tableBody.querySelectorAll(".food-row"));
  const totalFoods = allRows.length;
  let currentFilter = "all";
  let displayedRows = allRows;

  // Pre-process data for better performance
  const searchableData = allRows.map((row, index) => ({
    element: row,
    foodName: row.querySelector(".food-name").textContent,
    group: row.getAttribute("data-group"),
    index: index,
  }));

  // Create a map for faster group filtering
  const groupMap = new Map();
  searchableData.forEach((item) => {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, []);
    }
    groupMap.get(item.group).push(item);
  });

  // Optimized search function
  function performSearch(query) {
    if (!query.trim()) {
      return searchableData;
    }

    try {
      const fuzzyResults = fuzzysort.go(query, searchableData, {
        key: "foodName",
        threshold: CONFIG.SEARCH_THRESHOLD,
        limit: CONFIG.SEARCH_LIMIT,
      });
      return fuzzyResults.map((result) => result.obj);
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  // Optimized filter application
  function applyFilters(searchResults, group) {
    if (group === "all") {
      return searchResults;
    }
    return searchResults.filter((item) => item.group === group);
  }

  // Optimized display update with virtual scrolling consideration
  function updateDisplay() {
    const searchQuery = searchInput.value.trim();

    // Show initial state for empty search
    if (!searchQuery && currentFilter === "all") {
      showInitialState();
      return;
    }

    // Get filtered results
    const searchResults = performSearch(searchQuery);
    displayedRows = applyFilters(searchResults, currentFilter);

    // Use document fragment for efficient DOM updates
    const fragment = document.createDocumentFragment();

    // Consider virtual scrolling for large datasets
    const itemsToShow =
      displayedRows.length > CONFIG.VIRTUAL_SCROLL_THRESHOLD
        ? displayedRows.slice(0, CONFIG.VIRTUAL_SCROLL_THRESHOLD)
        : displayedRows;

    itemsToShow.forEach((item) => {
      // Use original element instead of cloning when possible
      fragment.appendChild(item.element);
    });

    // Batch DOM updates
    requestAnimationFrame(() => {
      tableBody.innerHTML = "";
      tableBody.appendChild(fragment);
      updateResultsInfo(displayedRows.length);

      if (displayedRows.length === 0) {
        showNoResults();
      } else {
        showResults();

        // Show "load more" indicator if using virtual scrolling
        if (displayedRows.length > CONFIG.VIRTUAL_SCROLL_THRESHOLD) {
          showLoadMoreIndicator();
        }
      }
    });
  }

  function showInitialState() {
    tableBody.innerHTML = "";
    resultsCount.innerHTML = `<strong>${totalFoods}</strong> foods.`;
    noResults.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h3 style="margin-bottom: 16px; color: var(--food-text);">🔍 Start typing to search through the database.</h3>
        <p style="margin-bottom: 20px; font-size: 16px;">
          Search through <strong>${totalFoods} foods</strong> to find protein content and nutritional information.
        </p>
        <p style="color: var(--food-no-data); font-size: 14px;">
          Try searching for "peanut butter", "pecans", "lobster", or any other foods.
        </p>
      </div>
    `;
    noResults.style.display = "block";
    foodTable.style.display = "none";
  }

  function updateResultsInfo(count) {
    resultsCount.textContent = `${count} food${count !== 1 ? "s" : ""}`;
  }

  function showNoResults() {
    noResults.innerHTML = "<p>No foods match your search criteria.</p>";
    noResults.style.display = "block";
    foodTable.style.display = "none";
  }

  function showResults() {
    noResults.style.display = "none";
    foodTable.style.display = "";
  }

  function showLoadMoreIndicator() {
    // Implementation for "Load More" functionality
    const loadMoreDiv = document.createElement("div");
    loadMoreDiv.className = "load-more-indicator";
    loadMoreDiv.innerHTML = `<p>Showing first ${CONFIG.VIRTUAL_SCROLL_THRESHOLD} results. Refine your search for better results.</p>`;
    tableBody.appendChild(loadMoreDiv);
  }

  // Debounced search with improved performance
  const debouncedSearch = debounce(updateDisplay, CONFIG.DEBOUNCE_DELAY);

  // Event listeners
  searchInput.addEventListener("input", function() {
    debouncedSearch();
  });

  clearBtn.addEventListener("click", function() {
    searchInput.value = "";

    // Reset filter
    filterBtns.forEach((b) => b.classList.remove("active"));
    filterBtns[0].classList.add("active");
    currentFilter = "all";

    updateDisplay();
    searchInput.focus();
  });

  // Optimized filter button handling
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", function() {
      const newFilter = this.getAttribute("data-group");

      // Skip if same filter
      if (currentFilter === newFilter) return;

      // Update active state
      filterBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");

      currentFilter = newFilter;
      updateDisplay();
    });
  });

  // Enhanced keyboard navigation
  searchInput.addEventListener("keydown", function(e) {
    switch (e.key) {
      case "Escape":
        this.value = "";
        updateDisplay();
        break;
      case "ArrowDown":
        e.preventDefault();
        // Focus first result if available
        const firstRow = tableBody.querySelector(".food-row");
        if (firstRow) firstRow.focus();
        break;
    }
  });

  // Initialize
  updateDisplay();
  document.querySelector(".food_protein_index").classList.add("initialized");

  // Modal open on food name click (delegated so it survives table re-renders)
  tableBody.addEventListener("click", function(e) {
    const cell = e.target.closest(".food-name");
    if (!cell || !tableBody.contains(cell)) return;

    const row = cell.closest(".food-row");
    const foodName = cell.textContent.trim();
    const meanCell = row ? row.querySelector(".mean-value") : null;
    const meanText = meanCell ? meanCell.textContent.trim() : "";
    const meanValue = meanText.replace(/\s*g$/i, ""); // strip trailing " g" if present

    openFpiModal(foodName, meanValue);
  });
});

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Modal utilities
let FPI_MODAL = null;

function ensureFpiModal() {
  if (FPI_MODAL) return FPI_MODAL;

  const backdrop = document.createElement("div");
  backdrop.className = "fpi-modal-backdrop";
  backdrop.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000;";

  const modal = document.createElement("div");
  modal.className = "fpi-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "true");
  modal.style.cssText =
    "background:var(--food-bg);color:var(--food-text);border:1px solid var(--food-border);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);width:min(600px,92vw);max-height:85vh;overflow:auto;position:relative;padding:20px;";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "fpi-modal-close";
  closeBtn.setAttribute("aria-label", "Close dialog");
  closeBtn.textContent = "×";
  closeBtn.style.cssText =
    "position:absolute;top:10px;right:12px;font-size:20px;line-height:1;background:transparent;border:none;color:var(--food-text);cursor:pointer;";

  const header = document.createElement("div");
  header.className = "fpi-modal-header";
  const title = document.createElement("h3");
  title.id = "fpi-modal-title";
  title.contentEditable = "true";
  title.spellcheck = false;
  title.setAttribute("aria-label", "Food name (editable)");
  header.appendChild(title);

  // Keep modal state in sync with title edits (do not rewrite the title content to avoid caret jumps)
  title.addEventListener("input", function() {
    const els = ensureFpiModal();
    const name = title.textContent;
    els.modal.dataset.foodName = name;
    els.body.querySelectorAll(".food-name-header").forEach((el) => {
      el.textContent = name;
    });
  });

  // Prevent Enter from inserting a newline, and commit on Enter
  title.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      title.blur();
    }
  });

  // Normalize and trim the title on blur to avoid stray whitespace/newlines
  title.addEventListener("blur", function() {
    let name = title.textContent.replace(/\s+/g, " ").trim();
    if (title.textContent !== name) {
      title.textContent = name;
    }
    const els = ensureFpiModal();
    els.modal.dataset.foodName = name;
    els.body.querySelectorAll(".food-name-header").forEach((el) => {
      el.textContent = name;
    });
  });

  const body = document.createElement("div");
  body.className = "fpi-modal-body";

  modal.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(body);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function onEsc(e) {
    if (e.key === "Escape" && backdrop.style.display !== "none") {
      e.preventDefault();
      e.stopPropagation();
      closeFpiModal();
    }
  }

  // Close interactions
  closeBtn.addEventListener("click", closeFpiModal);
  backdrop.addEventListener("click", function(e) {
    if (e.target === backdrop) closeFpiModal();
  });
  document.addEventListener("keydown", onEsc);

  FPI_MODAL = { backdrop, modal, title, body, closeBtn };
  return FPI_MODAL;
}

function pad(str, width, alignRight = false) {
  str = str.toString();
  if (alignRight) {
    return str.padStart(width);
  } else {
    return str.padEnd(width);
  }
}

/**
 * Generates a nicely formatted ASCII table for the given doses and name.
 * @param {Array<number>} doses - Array of doses in mg.
 * @param {string} name - Name of the food.
 * @param {number} protein_per_g - Protein content in g per gram of food.
 * @param {number} serving_size - Serving size in grams.
 * @returns {string} ASCII table string.
 */
function generateAsciiProtocol(doses, name, protein_per_g, serving_size = 100) {
  let cum = 0;

  // make easy format of challenge steps even without mono font
  if (!name.includes("@")) {
    let ascii = `Challenge steps: ${name} (${protein_per_g * serving_size}g protein per ${serving_size}g)\n---\n`;
    let cum = 0;

    doses.forEach((mg, i) => {
      const g =
        protein_per_g > 0 ? ((mg * 0.001) / protein_per_g).toFixed(2) : "0.00";
      cum += mg;

      ascii += `Step ${i + 1}: ${g}g (${mg}mg protein; ${cum}mg cumulative dose)\n`;
    });

    return ascii + "---";
  }

  // OLD TABLE LOGIC - only if you include @ in the name... a bit of a easter egg.
  else {
    // Headers
    const headers = [
      "Step",
      `${name} (g)`,
      "Protein (mg)",
      "Cumulative dose (mg)",
    ];

    // Prepare rows and track max widths
    const rows = doses.map((mg, i) => {
      const g =
        protein_per_g > 0 ? ((mg * 0.001) / protein_per_g).toFixed(2) : "0.00";
      cum += mg;
      return [(i + 1).toString(), g, mg.toString(), cum.toString()];
    });

    // Compute column widths
    const colWidths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map((r) => r[i].length));
      return Math.max(h.length, maxRowWidth);
    });

    // Build ASCII table
    let ascii =
      protein_per_g * serving_size + " (g) protein per " + serving_size + "g\n";
    // Header
    ascii += headers.map((h, i) => pad(h, colWidths[i])).join(" | ") + "\n";
    // Separator
    ascii += colWidths.map((w) => "-".repeat(w)).join("-|-") + "\n";
    // Rows
    rows.forEach((row) => {
      ascii +=
        row.map((val, i) => pad(val, colWidths[i], true)).join(" | ") + "\n";
    });

    return ascii;
  }
}

function setFpiFoodName(name) {
  const els = ensureFpiModal();
  const n = (name || "").toString();
  els.modal.dataset.foodName = n;
  els.title.textContent = n;
  // Update headers in any visible modal tables
  els.body.querySelectorAll(".food-name-header").forEach((el) => {
    el.textContent = n;
  });
}

function copyAscii(protocol, name, protein_per_g) {
  try {
    const scope = FPI_MODAL && FPI_MODAL.modal ? FPI_MODAL.modal : document;
    const table = scope.querySelector(
      protocol === "five" ? "#fpi-table-five" : "#fpi-table-seven",
    );
    if (!table) throw new Error("Table not found");

    const doses = Array.from(table.querySelectorAll("tbody tr")).map((row) => {
      const input = row.querySelector(".protein-mg-input");
      const v =
        parseFloat(input ? input.value : row.cells[2]?.textContent) || 0;
      return Math.max(0, v);
    });

    const currentName =
      (FPI_MODAL && FPI_MODAL.modal && FPI_MODAL.modal.dataset.foodName) ||
      scope.querySelector("#fpi-modal-title")?.textContent?.trim() ||
      name;

    const currentProteinPerG =
      (FPI_MODAL &&
        FPI_MODAL.modal &&
        parseFloat(FPI_MODAL.modal.dataset.proteinPerG)) ||
      protein_per_g;

    const currentServingSize =
      (FPI_MODAL &&
        FPI_MODAL.modal &&
        parseFloat(FPI_MODAL.modal.dataset.servingSize)) ||
      100;

    const tableString = generateAsciiProtocol(
      doses,
      currentName,
      currentProteinPerG,
      currentServingSize,
    );
    navigator.clipboard
      .writeText(tableString)
      .then(() => console.log("ASCII table copied to clipboard!"))
      .catch((err) => alert("Error copying table: " + err));
  } catch (err) {
    alert("Error preparing table: " + err.message);
  }
}

function openFpiModal(foodName, meanValue) {
  const els = ensureFpiModal();
  els.modal.dataset.foodName = foodName || "";
  els.modal.dataset.meanValue = String(meanValue ?? "");

  // Parse and compute protein per gram of food (default serving size is 100g)
  const mean = parseFloat(meanValue);
  const protein_per_g = mean && !Number.isNaN(mean) ? mean / 100 : 0;
  els.modal.dataset.proteinPerG = String(protein_per_g);
  els.modal.dataset.servingSize = "100";

  // Dose steps in mg
  const practall_seven_doses_mg = [3, 10, 30, 100, 300, 1000, 3000];
  const practall_five_doses_mg = [30, 100, 300, 1000, 3000];

  // Helper to render initial rows with inputs for Protein (mg)
  function renderRows(doses) {
    let cum = 0;
    return doses
      .map((mg, i) => {
        cum += mg;
        const g =
          protein_per_g > 0
            ? ((mg * 0.001) / protein_per_g).toFixed(2)
            : "0.00";
        return `
          <tr>
            <td>${i + 1}</td>
            <td><span class="g-dose">${g}</span></td>
            <td><input class="protein-mg-input" type="number" min="0" step="1" value="${mg}"></td>
            <td><span class="cum-mg">${cum}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  const five_rows = renderRows(practall_five_doses_mg);
  const seven_rows = renderRows(practall_seven_doses_mg);

  setFpiFoodName(foodName || "");
  els.body.innerHTML =
    meanValue !== undefined && meanValue !== null && String(meanValue).length
      ? `
      <div class="fpi-inputs-container">
        <label>
          <i><strong>This is a calculation aid only</strong>. You assume full responsiblity to verify calculated doses. Data are estimates based on <a href='https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-about-us.html' target='_blank'>CNF 2015</a> food reference data.
          <strong>You must verify the protein concentration with the Nutrition Facts label if available.</strong></i>
        </label>
        <p><label><input id="fpi-protein-per-100g" class="protein-per-100g-input" type="number" min="0" step="0.01" value="${meanValue}"> (g) protein per <input id="fpi-serving-size" class="serving-size-input" type="number" min="1" step="1" value="100">g serving</label></p>
      </div>
      <div class="fpi-modal-tables-container">
          <div class="fpi-modal-table-wrapper">
            <div class="fpi-table-header">
                <span>PRACTALL-5</span>
                <button id="fpi-copy-five" class="fpi-copy-btn">Copy</button>
            </div>
            <div class="fpi-table-scroll-wrapper">
              <table id="fpi-table-five" class="fpi-protocol-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th><span class="food-name-header">${foodName}</span> (g)</th>
                      <th>Protein (mg)</th>
                      <th>Cumulative dose (mg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${five_rows}
                  </tbody>
                </table>
            </div>
          </div>
          <div class="fpi-modal-table-wrapper">
            <div class="fpi-table-header">
                <span>PRACTALL-7</span>
                <button id="fpi-copy-seven" class="fpi-copy-btn">Copy</button>
            </div>
            <div class="fpi-table-scroll-wrapper">
              <table id="fpi-table-seven" class="fpi-protocol-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th><span class="food-name-header">${foodName}</span> (g)</th>
                      <th>Protein (mg)</th>
                      <th>Cumulative dose (mg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${seven_rows}
                  </tbody>
                </table>
            </div>
          </div>
      </div>
      `
      : "<p>No mean protein value available.</p>";

  const copyFiveBtn = els.body.querySelector("#fpi-copy-five");
  if (copyFiveBtn) {
    copyFiveBtn.addEventListener("click", () =>
      copyAscii("five", foodName, protein_per_g),
    );
  }

  const copySevenBtn = els.body.querySelector("#fpi-copy-seven");
  if (copySevenBtn) {
    copySevenBtn.addEventListener("click", () =>
      copyAscii("seven", foodName, protein_per_g),
    );
  }

  // Setup editable behavior: recalc dependent cells when Protein (mg) changes
  function setupEditableTable(tableEl) {
    if (!tableEl) return;

    const recalc = () => {
      let cum = 0;
      const rows = tableEl.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const input = row.querySelector(".protein-mg-input");
        let mg = parseFloat(input && input.value) || 0;
        if (mg < 0) mg = 0;
        const cur = parseFloat(els.modal.dataset.proteinPerG) || 0;
        const g = cur > 0 ? (mg * 0.001) / cur : 0;
        row.querySelector(".g-dose").textContent = g.toFixed(2);
        cum += mg;
        row.querySelector(".cum-mg").textContent = cum;
      });
    };

    tableEl.querySelectorAll(".protein-mg-input").forEach((inp) => {
      inp.addEventListener("input", recalc);
      inp.addEventListener("change", recalc);
    });

    // Initial calculation to ensure correctness
    recalc();
  }

  // Attach change handler to protein-per-100g and serving-size inputs to recalc tables
  const protein100Input = els.body.querySelector("#fpi-protein-per-100g");
  const servingSizeInput = els.body.querySelector("#fpi-serving-size");

  if (protein100Input && servingSizeInput) {
    const recalculateAll = () => {
      let proteinValue = parseFloat(protein100Input.value);
      if (!(proteinValue >= 0)) proteinValue = 0;

      let servingSize = parseFloat(servingSizeInput.value);
      // Validate serving size: minimum 1g
      if (!(servingSize >= 1) || isNaN(servingSize)) {
        servingSize = 1;
        servingSizeInput.value = "1";
      }

      const perG =
        proteinValue > 0 && servingSize > 0 ? proteinValue / servingSize : 0;
      els.modal.dataset.proteinPerG = String(perG);
      els.modal.dataset.servingSize = String(servingSize);

      // Recalculate both tables using latest value
      [
        els.body.querySelector("#fpi-table-five"),
        els.body.querySelector("#fpi-table-seven"),
      ].forEach((t) => {
        if (!t) return;
        let cum = 0;
        t.querySelectorAll("tbody tr").forEach((row) => {
          const input = row.querySelector(".protein-mg-input");
          let mg = parseFloat(input && input.value) || 0;
          if (mg < 0) mg = 0;
          const g = perG > 0 ? (mg * 0.001) / perG : 0;
          row.querySelector(".g-dose").textContent = g.toFixed(2);
          cum += mg;
          row.querySelector(".cum-mg").textContent = cum;
        });
      });
    };

    protein100Input.addEventListener("input", recalculateAll);
    protein100Input.addEventListener("change", recalculateAll);
    servingSizeInput.addEventListener("input", recalculateAll);
    servingSizeInput.addEventListener("change", recalculateAll);

    // Store initial serving size in modal dataset
    els.modal.dataset.servingSize = "100";
  }

  setupEditableTable(els.body.querySelector("#fpi-table-five"));
  setupEditableTable(els.body.querySelector("#fpi-table-seven"));

  els.modal.setAttribute("aria-hidden", "false");
  els.backdrop.style.display = "flex";
}

function closeFpiModal() {
  if (!FPI_MODAL) return;
  FPI_MODAL.modal.setAttribute("aria-hidden", "true");
  FPI_MODAL.backdrop.style.display = "none";
}
