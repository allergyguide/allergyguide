document.addEventListener("DOMContentLoaded", function() {
  // Function to reorganize pearls into two columns for landscape
  function organizePearls() {
    const pearlsLists = document.querySelectorAll(".pearls_list");

    pearlsLists.forEach((pearlsList) => {
      // Check if we're in landscape mode (width > height)
      const isLandscape = window.innerWidth > window.innerHeight;

      if (isLandscape) {
        // Check if already organized to avoid unnecessary DOM manipulation
        if (!pearlsList.querySelector(".two_columns")) {
          organizePearlsIntoColumns(pearlsList);
        }
      } else {
        // Portrait mode - revert to simple ul structure
        if (pearlsList.querySelector(".two_columns")) {
          revertToSingleColumn(pearlsList);
        }
      }
    });
  }

  function organizePearlsIntoColumns(pearlsList) {
    // Find the original ul element
    const originalUl = pearlsList.querySelector("ul");
    if (!originalUl) return;

    // Get all li elements
    const listItems = Array.from(originalUl.querySelectorAll("li"));
    if (listItems.length === 0) return;

    // Calculate how to split the items
    // For optimal balance, put ceil(n/2) items in first column
    const totalItems = listItems.length;
    const firstColumnCount = Math.ceil(totalItems / 2);

    // Create the two-column structure
    const twoColumnsDiv = document.createElement("div");
    twoColumnsDiv.className = "two_columns";

    // Create first column
    const firstColumn = document.createElement("div");
    firstColumn.className = "column";
    const firstUl = document.createElement("ul");

    // Add items to first column
    for (let i = 0; i < firstColumnCount && i < totalItems; i++) {
      const clonedItem = listItems[i].cloneNode(true);
      firstUl.appendChild(clonedItem);
    }
    firstColumn.appendChild(firstUl);

    // Create second column (only if there are items for it)
    if (totalItems > firstColumnCount) {
      const secondColumn = document.createElement("div");
      secondColumn.className = "column";
      const secondUl = document.createElement("ul");

      // Add remaining items to second column
      for (let i = firstColumnCount; i < totalItems; i++) {
        const clonedItem = listItems[i].cloneNode(true);
        secondUl.appendChild(clonedItem);
      }
      secondColumn.appendChild(secondUl);
      twoColumnsDiv.appendChild(firstColumn);
      twoColumnsDiv.appendChild(secondColumn);
    } else {
      // If only one column needed, just use the first column without two-column wrapper
      twoColumnsDiv.appendChild(firstColumn);
    }

    // Replace the original ul with the new structure
    originalUl.style.display = "none"; // Hide original but keep for reference
    pearlsList.appendChild(twoColumnsDiv);
  }

  function revertToSingleColumn(pearlsList) {
    // Remove the two-column structure and show original ul
    const twoColumnsDiv = pearlsList.querySelector(".two_columns");
    const originalUl = pearlsList.querySelector("ul");

    if (twoColumnsDiv) {
      twoColumnsDiv.remove();
    }

    if (originalUl) {
      originalUl.style.display = ""; // Show original ul
    }
  }

  // Initial organization
  organizePearls();

  // Reorganize on window resize with debouncing to avoid excessive calls
  let resizeTimeout;
  window.addEventListener("resize", function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(organizePearls, 150);
  });
});

