document.addEventListener('DOMContentLoaded', function() {

  // Get reference data from div in shortcode
  const referencesContainer = document.getElementById('references-data-container');
  if (!referencesContainer) return;
  // The full list of reference objects loaded from the BibTeX file
  const referencesJson = referencesContainer.dataset.references;
  const references = JSON.parse(referencesJson);

  /**
   * Cleans BibTeX formatting artifacts from a string
   * @param {string} str - String to clean
   * @returns {string} - Cleaned string
   */
  function bibStrip(str) {
    if (!str) return '';
    return str
      .replace(/---/g, '—')      // em dash
      .replace(/--/g, '–')       // en dash  
      .replace(/{/g, '')         // remove opening braces
      .replace(/}/g, '')         // remove closing braces
      .replace(/\\/g, '');       // remove backslashes
  }

  /**
    * Formats a BibTeX entry into a readable citation string
    * @param {Object} ref - The reference object from BibTeX
    * @returns {string} - Formatted citation string
    */
  function formatCitation(ref) {
    const tags = ref.tags;
    let citation = '';

    // Authors - format as "Last FM, Last FM, Last FM, et al." for first 3 authors
    if (tags.author) {
      const authors = tags.author.split(' and ').map(author => author.trim());
      const firstThree = authors.slice(0, 3);

      const formattedAuthors = firstThree.map(author => {
        if (author.includes(',')) {
          const parts = author.split(',');
          const lastName = parts[0].trim();
          const firstNames = parts[1] ? parts[1].trim().split(' ') : [];

          // Create initials from first names
          const initials = firstNames.map(name => name.charAt(0).toUpperCase()).join('');

          return `${bibStrip(lastName)} ${bibStrip(initials)}`;
        } else {
          return bibStrip(author);
        }
      });

      citation += formattedAuthors.join(', ');

      if (authors.length > 3) {
        citation += ', et al.';
      } else {
        citation += '.';
      }
    }

    // Title (bolded)
    if (tags.title) {
      citation += ` <b>${bibStrip(tags.title)}.</b>`;
    }

    // Journal (italicized)
    if (tags.journal) {
      citation += ` <i>${bibStrip(tags.journal)}</i>`;
    } else if (tags.booktitle) {
      citation += ` <i>${bibStrip(tags.booktitle)}</i>`;
    }

    // Volume
    if (tags.volume) {
      citation += `, vol. ${bibStrip(tags.volume)}`;
    }

    // Number/Issue
    if (tags.number) {
      citation += `, ${bibStrip(tags.number)}`;
    }

    // Pages
    if (tags.pages) {
      citation += `, pp. ${bibStrip(tags.pages)}`;
    }

    // Month and Year
    if (tags.month && tags.year) {
      citation += `, ${bibStrip(tags.month)} ${bibStrip(tags.year)}`;
    } else if (tags.year) {
      citation += `, ${bibStrip(tags.year)}`;
    }

    return citation;
  }

  /**
   * Gets the URL for a reference, preferring URL links
   * @param {Object} ref - The reference object from BibTeX
   * @returns {string} - URL for the reference
   */
  function getReferenceUrl(ref) {
    const tags = ref.tags;

    if (tags.url) {
      return tags.url;
    }
    else if (tags.doi) {
      return `https://doi.org/${tags.doi}`;
    } else {
      // Fallback to search URL if no direct link available
      const title = tags.title || '';
      const searchQuery = encodeURIComponent(title);
      return `https://scholar.google.com/scholar?q=${searchQuery}`;
    }
  }

  // Function to close the popup
  function closePopup() {
    document.getElementById('ref-popup').classList.remove('active');
  }

  // Find each element in the document that contains citation keys
  document.querySelectorAll('.references').forEach(function(refEl) {
    // Get the citation key(s) from the span content, handling multiple keys separated by commas
    const citationKeys = refEl.textContent.replace(/[\[\]]/g, '').split(',').map(key => key.trim());

    // Create a clickable icon element
    const iconEl = document.createElement('span');
    iconEl.className = 'ref-icon';
    iconEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmarks-fill" viewBox="0 0 16 16"><path d="M2 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.777.416L7 13.101l-4.223 2.815A.5.5 0 0 1 2 15.5z"/><path d="M4.268 1A2 2 0 0 1 6 0h6a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.777.416L13 13.768V2a1 1 0 0 0-1-1z"/></svg>';

    // When the icon is clicked, build and display the popup with the selected references
    iconEl.addEventListener('click', function() {
      let popupContent = '';

      // Loop over the citation keys
      citationKeys.forEach(function(citationKey) {
        // Look up the reference object matching this citation key
        const ref = references.find(function(r) {
          return r.citation_key === citationKey;
        });

        if (ref) {
          popupContent += '<div class="ref-entry">';

          // Format and display the citation
          const formattedCitation = formatCitation(ref);
          const referenceUrl = getReferenceUrl(ref);

          popupContent += '<p class="ref-text"><a class="ref-link" href="' + referenceUrl + '" target="_blank">' + formattedCitation + '</a></p>';

          // If there's an abstract, show it as notes (truncated)
          if (ref.tags.abstract && ref.tags.abstract.trim() !== "") {
            let abstract = ref.tags.abstract.trim();
            // Truncate to approximately 3 lines (around 300 characters)
            if (abstract.length > 300) {
              abstract = abstract.substring(0, 300) + '...';
            }
            popupContent += '<p class="ref-notes" style="font-size:0.8rem">' + abstract + '</p>';
          }

          // Add separator if there are multiple references
          if (citationKeys.length > 1) {
            popupContent += '<hr class="ref-separator">';
          }

          popupContent += '</div>';
        } else {
          // Handle missing citation key
          popupContent += '<div class="ref-entry">';
          popupContent += '<p class="ref-text"><em>Reference "' + citationKey + '" not found</em></p>';
          popupContent += '</div>';
        }
      });

      // Update the popup inner content
      document.getElementById('ref-popup-inner').innerHTML = popupContent;

      // Show the popup by adding an "active" class
      document.getElementById('ref-popup').classList.add('active');
    });

    // Replace the original marker with the icon
    refEl.parentNode.replaceChild(iconEl, refEl);
  });

  // Attach a handler to close the popup when the close button is clicked
  document.getElementById('ref-close').addEventListener('click', closePopup);

  // Close the popup if the user clicks outside the popup content
  document.getElementById('ref-popup').addEventListener('click', function(event) {
    // If the click happened directly on the overlay (not within the popup content)
    if (event.target === this) {
      closePopup();
    }
  });

  // Listen for the Escape key to close the popup
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closePopup();
    }
  });
});
