const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  document.addEventListener("DOMContentLoaded", function() {
    const container = document.querySelector('.mobile_warning');

    if (container) {
      fetch('/icon/t_danger.svg') // Update the path as needed
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(svgData => {
          container.innerHTML = `
                <div class="admonition danger">
                  <div class="admonition-icon">
                    ${svgData}
                  </div>
                  <strong class="admonition-title">THIS SECTION IS NOT INTENDED FOR MOBILE</strong>
                  <div class="admonition-content">
                    The following content is intended for desktop. Expect bugs/missing content in this section.
                  </div>
                </div>
                `;
        })
        .catch(error => {
          console.error('Error fetching SVG:', error);
        });
    }
  });


}

