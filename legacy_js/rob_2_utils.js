export class Answer {
  // Private Fields
  static #_YES = "Yes";
  static #_PYES = "Prob Yes";
  static #_PNO = "Prob No";
  static #_NO = "No";
  static #_NOINFO = "No info";

  // Accessors for "get" functions only (no "set" functions)
  static get YES() { return this.#_YES; }
  static get PYES() { return this.#_PYES; }
  static get PNO() { return this.#_PNO; }
  static get NO() { return this.#_NO; }
  static get NOINFO() { return this.#_NOINFO; }
}

export class DomainRisk {
  // Private Fields
  static #_Low = "Low risk";
  static #_Concerns = "Some concerns";
  static #_High = "High risk";

  // Accessors for "get" functions only (no "set" functions)
  static get Low() { return this.#_Low; }
  static get Concerns() { return this.#_Concerns; }
  static get High() { return this.#_High; }
}

/**
 * Retrieves the selected answer from a group of radio buttons.
 *
 * @param {string} questionName - The name attribute of the radio button group.
 * @returns {string|null} The normalized text of the selected answer, or null if no option is selected.
 */
export function getAnswer(questionName) {
  const radio = document.querySelector(`input[name="${questionName}"]:checked`);
  if (!radio) return null;
  // Normalize by replacing any whitespace (including from <br> tags) with a single space
  return radio.nextElementSibling.innerText.replace(/\s+/g, " ").trim();
}

export function setup_save_state() {
  document.addEventListener("DOMContentLoaded", function() {
    function saveState() {
      document.querySelectorAll("input[type='radio']").forEach(input => {
        if (input.checked) {
          localStorage.setItem(input.name, input.nextElementSibling.innerText);
        }
      });

      document.querySelectorAll("textarea").forEach(textarea => {
        localStorage.setItem(textarea.id, textarea.value);
      });
    }

    function loadState() {
      document.querySelectorAll("input[type='radio']").forEach(input => {
        const savedValue = localStorage.getItem(input.name);
        if (savedValue && input.nextElementSibling.innerText === savedValue) {
          input.checked = true;
        }
      });

      document.querySelectorAll("textarea").forEach(textarea => {
        const savedText = localStorage.getItem(textarea.id);
        if (savedText) {
          textarea.value = savedText;
        }
      });
    }

    // Load saved state on page load
    loadState();

    // Save state when input changes
    document.querySelectorAll("input[type='radio']").forEach(input => {
      input.addEventListener("change", saveState);
    });

    document.querySelectorAll("textarea").forEach(textarea => {
      textarea.addEventListener("input", saveState);
    });
  });


}

/**
 * Retrieves detailed answers for a set of questions within a specific domain.
 *
 * @param {string} domain - The domain identifier for the questions.
 * @param {number} num_q - The number of questions in the domain.
 * @returns {Object.<string, string>} An object where each key is a question ID, and the value is the corresponding 
 *                                    answer details or "null" if no answer is selected or no details are provided.
 */
export function getDomainAnswerDetails(domain, num_q) {
  let details = {};

  // Loop through each question number for this domain.
  for (let i = 1; i <= num_q; i++) {
    const questionId = `q${domain}_${i}`;
    const text = document.getElementById(`${questionId}_details`).value.trim();
    if (getAnswer(questionId) === null) {
      details[questionId] = "null"
    } else {
      details[questionId] = text || "null";
    }
  }

  return details;
}

export function getMarkdownSummary(userAnswers, userDetails) {
  let markdownSummary = "";
  Object.keys(userAnswers).forEach(key => {
    const answer = userAnswers[key];
    const detail = userDetails[key];

    // Only include answers that are not "null"
    if (answer !== "null") {
      // Extract question number from key, assuming key format "q<domain>_<question>"
      // For example: "q1_2" becomes "1.2"
      const parts = key.substring(1).split("_");
      const questionNumber = parts.join(".");

      // Build the summary line
      let line = `${questionNumber}: ${answer}`;
      if (detail !== "null") {
        line += ` -> ${detail}`;
      }
      markdownSummary += line + "\n";
    }
  });
  return markdownSummary;
}

export function get_admon_class(domain_risk) {
  if (domain_risk == DomainRisk.High) {
    return "danger"
  }
  else if (domain_risk == DomainRisk.Concerns) {
    return "warning"
  } else {
    return "tip"
  }
}
