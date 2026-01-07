document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".copy-button").forEach(button => {
    button.addEventListener("click", function() {
      copyToClipboard(this);
    });
  });
});

function copyToClipboard(button) {
  // THIS IS A COMMENT THAT SHOULD SHOW UP.
  const codeBlock = button.nextElementSibling; // Get the sibling `.txt` div
  let text = codeBlock.textContent || codeBlock.innerText;

  // Inject date into text if {{date}}
  if (text.includes("We assessed this patient today on ***")) {
    const today = new Date();
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const formattedDate = today
      .toLocaleDateString('en-GB', options)
      .replace(/ /g, '-');
    text = text.replace("We assessed this patient today on ***", "We assessed this patient today on " + formattedDate)
  }

  navigator.clipboard.writeText(text).then(() => {
    button.textContent = "Copied!"; // Temporarily change button text
    setTimeout(() => button.textContent = "Copy", 2000); // Revert after 2 seconds
  }).catch(err => {
    console.error("Failed to copy text: ", err);
    button.textContent = "Error";
    setTimeout(() => button.textContent = "Copy", 2000);
  });
}

