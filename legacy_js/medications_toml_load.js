document.addEventListener("DOMContentLoaded", function() {
  const filterButtons = document.querySelectorAll(".filter-button");
  const drugCards = Array.from(document.querySelectorAll(".drug-card"));
  const searchInput = document.getElementById("search-input");

  // Store card data for searching
  const cardData = drugCards.map((card) => {
    const cardTitleElem = card.querySelector(".generic-name");
    const cardTitle = cardTitleElem ? cardTitleElem.textContent : "";
    const brandNames = card.dataset.brandNames || "";
    // Split brand names into individual items for better matching
    const brandNamesArray = brandNames
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    return {
      el: card,
      title: cardTitle,
      brandNames: brandNames,
      brandNamesArray: brandNamesArray,
      categories: card.dataset.categories
        .split(",")
        .map((c) => c.trim()),
    };
  });

  // --- Category filter button logic ---
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;

      if (category === "all") {
        // If "All" is clicked, clear other active states and activate only "All"
        filterButtons.forEach((btn) => {
          if (btn.dataset.category === "all") {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      } else {
        // Toggle the active state for non-"All" buttons
        button.classList.toggle("active");
        // If any non-"all" filters are active, ensure "All" is not active
        let anyActive = false;
        filterButtons.forEach((btn) => {
          if (
            btn.dataset.category !== "all" &&
            btn.classList.contains("active")
          ) {
            anyActive = true;
          }
        });
        if (anyActive) {
          document
            .querySelector(
              '.filter-button[data-category="all"]',
            )
            .classList.remove("active");
        } else {
          // If none are active, default back to "All"
          document
            .querySelector(
              '.filter-button[data-category="all"]',
            )
            .classList.add("active");
        }
      }

      updateCards();
    });
  });

  // --- Listen to search input events ---
  searchInput.addEventListener("input", updateCards);

  // --- Update cards: filter by categories and search query ---
  function updateCards() {
    // Build a list of active categories (ignoring "all")
    let activeCategories = [];
    filterButtons.forEach((btn) => {
      if (
        btn.classList.contains("active") &&
        btn.dataset.category !== "all"
      ) {
        activeCategories.push(btn.dataset.category);
      }
    });

    // Get the search query (trimmed)
    const searchQuery = searchInput.value.trim();

    // If no search query, just filter by category and reset order
    if (searchQuery === "") {
      cardData.forEach((card) => {
        let categoryMatches =
          activeCategories.length === 0 ||
          activeCategories.every((cat) =>
            card.categories.includes(cat),
          );
        card.el.style.display = categoryMatches ? "block" : "none";
        card.el.style.order = ""; // Reset order
      });
      return;
    }

    // Map to store card element -> {score, categoryMatch}
    const cardScores = new Map();

    cardData.forEach((card) => {
      // Check category match first
      let categoryMatches =
        activeCategories.length === 0 ||
        activeCategories.every((cat) =>
          card.categories.includes(cat),
        );

      if (!categoryMatches) {
        card.el.style.display = "none";
        return;
      }

      // Search the generic name (title)
      const titleResult = fuzzysort.single(searchQuery, card.title);
      let bestScore = titleResult ? titleResult.score * 1.5 : null; // Boost generic name matches

      // Search each brand name individually
      card.brandNamesArray.forEach((brandName) => {
        const brandResult = fuzzysort.single(
          searchQuery,
          brandName,
        );
        if (brandResult) {
          if (
            bestScore === null ||
            brandResult.score > bestScore
          ) {
            bestScore = brandResult.score;
          }
        }
      });

      // If there's any match, store it
      if (bestScore !== null) {
        cardScores.set(card.el, bestScore);
      } else {
        card.el.style.display = "none";
      }
    });

    // Hide all cards first
    cardData.forEach((card) => {
      card.el.style.display = "none";
    });

    // Sort matched cards by score (higher = better match in fuzzysort)
    const sortedMatches = Array.from(cardScores.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    // Show matched cards in relevance order using flexbox order
    sortedMatches.forEach(([el, _], index) => {
      el.style.display = "block";
      el.style.order = index;
    });
  }
});
