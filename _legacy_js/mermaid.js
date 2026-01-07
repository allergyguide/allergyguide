// Allows for mermaid shortcodes to be used that automatically switch themes with light and dark mode.
// Only detects changes and runs when the page has mermaid diagrams.

// import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/+esm';

// set custom dark and light themes:
const lightThemeVariables = {
  background: '#f8f8f8',
  primaryColor: '#d4ebff',
  secondaryColor: '#a3d5ff',
  tertiaryColor: '#7cc4ff',
  fontFamily: 'inherit',
  nodeTextColor: '#1a1a1a'
};

const darkThemeVariables = {
  primaryColor: "#ff6347", // Tomato color for primary nodes
  secondaryColor: "#ff4500", // Orange Red for secondary nodes
  background: "#333333", // Dark background
  edgeLabelBackground: "#444444", // Slightly darker edge label background
};

function initializeMermaid() {
  // Determine current theme
  const isLightMode = document.documentElement.classList.contains('switch');
  const theme = isLightMode ? 'light' : 'dark';
  
  // Initialize with proper theme
  mermaid.initialize({
    theme: theme,
    // look: neo,
    // themeVariables: isLightMode ? lightThemeVariables : darkThemeVariables,
    startOnLoad: false
  });

  // Only process Mermaid diagrams if they exist on the page
  const mermaidElements = document.querySelectorAll('.mermaid');
  console.log("number of mermaid elements: " + mermaidElements.length)

  if (mermaidElements.length > 0) {  // Process all mermaid diagrams
    document.querySelectorAll('.mermaid').forEach(el => {
      // Store original content if not already stored
      if (!el.hasAttribute('data-original')) {
        el.setAttribute('data-original', el.innerHTML);
      }
    
      // Reset to original code and clear Mermaid's processed flag
      el.innerHTML = el.getAttribute('data-original');
      el.removeAttribute('data-processed');
    
      // Remove existing SVG if present
      const svg = el.querySelector('svg');
      if (svg) svg.remove();
    });

    // Trigger Mermaid rendering
    mermaid.run(undefined, '.mermaid');
  }
}

// Initial render
initializeMermaid();

// Only observe changes if Mermaid diagrams exist on the page
if (document.querySelectorAll('.mermaid').length > 0)
{
  // Refresh diagrams on theme change using MutationObserver for reliability
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'class') {
        initializeMermaid();
      }
    });
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
}
