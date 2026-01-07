// Wait until the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", function() {
  // 1. Gather all macro blocks along with their topic and keywords separately
  const macroBlocks = Array.from(
    document.querySelectorAll(".macro-block"),
  ).map((el) => {
    const topic = el.getAttribute("data-topic") || "";
    const keywords = el.getAttribute("data-keywords") || "";
    // Split keywords into array for individual matching
    const keywordsArray = keywords
      .split(/\s+/)
      .filter((k) => k.length > 0);
    return {
      el: el,
      topic: topic,
      keywords: keywords,
      keywordsArray: keywordsArray,
    };
  });

  // 2. Set up the search input event listener.
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", function() {
    const query = this.value.trim();

    // If the query is empty, show all blocks.
    if (query === "") {
      macroBlocks.forEach((block) => {
        block.el.style.display = "";
        block.el.style.order = ""; // Reset order to original
      });
      return;
    }

    // 3. Search topic and keywords separately for better accuracy
    const matchedBlocksMap = new Map(); // Map to store el -> best score

    // Search topics
    const topicResults = fuzzysort.go(query, macroBlocks, {
      key: "topic",
      threshold: -10000,
      allowTypo: true,
    });
    topicResults.forEach((result) => {
      matchedBlocksMap.set(result.obj.el, result.score);
    });

    // Search each individual keyword for exact/better matches
    macroBlocks.forEach((block) => {
      block.keywordsArray.forEach((keyword) => {
        const result = fuzzysort.single(query, keyword);
        if (result && result.score > -10000) {
          const currentScore = matchedBlocksMap.get(block.el);
          // Boost keyword matches significantly (multiply by 1.5)
          const boostedScore = result.score * 1.5;
          // Keep the best score
          if (
            currentScore === undefined ||
            boostedScore > currentScore
          ) {
            matchedBlocksMap.set(block.el, boostedScore);
          }
        }
      });
    });

    // Hide all blocks first.
    macroBlocks.forEach((block) => {
      block.el.style.display = "none";
    });

    // Sort matched blocks by score (higher score = better match in fuzzysort)
    const sortedMatches = Array.from(matchedBlocksMap.entries()).sort(
      (a, b) => b[1] - a[1],
    ); // Sort descending (best match first)

    // Show matched blocks in order by using CSS order property
    sortedMatches.forEach(([el, _], index) => {
      el.style.display = "";
      el.style.order = index; // Use flexbox order for sorting
    });
  });
});

