document.addEventListener('DOMContentLoaded', function() {
  // Initialize all tab containers
  document.querySelectorAll('.tabs-container').forEach(container => {
    const tabButtons = container.querySelectorAll('.tab-button');
    const tabPanes = container.querySelectorAll('.tab-pane');

    // Check if there's any active tab
    const hasActiveTab = container.querySelector('.tab-button.active');

    // If no active tab, activate the first one
    if (!hasActiveTab && tabButtons.length > 0 && tabPanes.length > 0) {
      tabButtons[0].classList.add('active');
      tabPanes[0].classList.add('active');
    }



    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Get the tab container ID
        const containerId = container.id;

        // Get the tab id this button controls
        const tabId = this.getAttribute('data-tab');

        // Deactivate all tabs in this container
        container.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
        });

        container.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        // Activate the clicked tab
        this.classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Save active tab to session storage for persistence
        sessionStorage.setItem(containerId + '-active-tab', tabId);
      });
    });

    // Check for previously selected tab on page load
    const savedTabId = sessionStorage.getItem(container.id + '-active-tab');
    if (savedTabId) {
      const savedTab = container.querySelector(`[data-tab="${savedTabId}"]`);
      if (savedTab) {
        savedTab.click();
      }
    }
  });
});
