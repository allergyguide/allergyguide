document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".copy-button").forEach(button => {
    button.addEventListener("click", function () {
      copyToClipboard(this);
    });
  });
});

function copyToClipboard(button) {
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

