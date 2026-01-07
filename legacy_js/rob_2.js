import { getDomainAnswers, traverseTree, D1_DT, D2_P1_DT, D2_P2_DT, D2B_DT, D3_DT, D4_DT, D5_DT } from "./rob_2_decision_trees.js";
import { getAnswer, setup_save_state, DomainRisk, Answer, getDomainAnswerDetails, getMarkdownSummary, get_admon_class } from "./rob_2_utils.js"
import { runTests } from "./rob_2_test.js";

// SAVE STATE IN LOCAL STORAGE
setup_save_state()

function updateOverallJudgement() {
  var q1 = document.querySelectorAll(`.q1.icon`)[0];
  var q2 = document.querySelectorAll(`.q2.icon`)[0];
  var q2b = document.querySelectorAll(`.q2b.icon`)[0];
  var q3 = document.querySelectorAll(`.q3.icon`)[0];
  var q4 = document.querySelectorAll(`.q4.icon`)[0];
  var q5 = document.querySelectorAll(`.q5.icon`)[0];
  var overall = document.querySelectorAll(`.overall.icon`)[0];

  const outcomeMap = { "X": "red", "-": "yellow", "+": "green", "?": "blue" };

  // Compute domain2 outcome from q2 and q2b.
  let val2 = q2 ? q2.innerText.trim() : "";
  let val2b = q2b ? q2b.innerText.trim() : "";
  let domain2 = "";

  // If one is '?' and the other is not, use the non-'?' value.
  if (val2 === "?" && val2b && val2b !== "?") {
    domain2 = val2b;
  } else if (val2b === "?" && val2 && val2 !== "?") {
    domain2 = val2;
  } else if (val2 && val2b && val2 !== "?" && val2b !== "?") {
    // If both are present and non-'?', you might decide to pick the worse outcome.
    // For example, if either is "X", choose "X"; else if either is "-", choose "-"; else use "+".
    if (val2 === "X" || val2b === "X") {
      domain2 = "X";
    } else if (val2 === "-" || val2b === "-") {
      domain2 = "-";
    } else if (val2 === "+" && val2b === "+") {
      domain2 = "+";
    } else {
      // If the two values differ in an unexpected way, default to the first.
      domain2 = val2;
    }
  } else {
    // Otherwise, if one value exists, use it.
    domain2 = val2 || val2b;
  }

  // Build an array of statuses, replacing q2 and q2b with the computed domain2.
  // For q1, q3, q4, and q5 we extract the text if the element exists.
  var elements = [q1, domain2, q3, q4, q5];
  var statuses = elements.map(el => {
    return (typeof el === "string") ? el : (el ? el.innerText.trim() : "");
  });

  // Apply the overall judgement rules.
  if (statuses.includes("X")) {
    overall.className = `overall icon ${outcomeMap["X"]}`;
    overall.innerText = "X";
  } else if (statuses.every(status => status === "+")) {
    overall.className = `overall icon ${outcomeMap["+"]}`;
    overall.innerText = "+";
  } else if (statuses.includes("-")) {
    overall.className = `overall icon ${outcomeMap["-"]}`;
    overall.innerText = "-";
  } else {
    overall.className = `overall icon ${outcomeMap["?"]}`;
    overall.innerText = "?";
  }
}

function getOverallSummary(button) {
  var text = "";
  const domains = [1, 2, "2b", 3, 4, 5];
  for (let domain of domains) {
    try {
      var admonTextElement = document.querySelector(`.admon_macro-${domain} .admonition-content`);
      var admonTitleElement = document.querySelector(`.admon_macro-${domain} .admonition-title`);

      if (!admonTextElement || !admonTitleElement) {
        throw new Error(`Required elements not found - ${domain}`);
      }

      var admon_text = admonTextElement.innerText;
      var admon_title = admonTitleElement.innerText;

      if (admon_text == "Fill out the questions") {
        throw new Error(`Incomplete answers - ${domain}`);
      }

      text += `Domain ${domain}:
${admon_text.trim()}
${admon_title}

`;
    } catch (error) {
      console.log("An error occurred:", error);
    }
  }

  navigator.clipboard.writeText(text).then(() => {
    button.textContent = "Copied!"; // Temporarily change button text
    setTimeout(() => button.innerText = "Overall", 2000); // Revert after 2 seconds
  }).catch(err => {
    console.error("Failed to copy text: ", err);
    button.textContent = "Error";
    setTimeout(() => button.textContent = "Overall", 2000);
  });


};


// Function to process and update the decision tree outcome
const process_dt = (domain, num_q, tree) => {
  const userAnswers = getDomainAnswers(domain, num_q);
  const outcome = traverseTree(tree, userAnswers);
  const userDetails = getDomainAnswerDetails(domain, num_q);
  let md_summary = getMarkdownSummary(userAnswers, userDetails);

  var admon_text = document.querySelectorAll(`.admon_macro-${domain} .admonition-content`)[0];
  var admon_title = document.querySelectorAll(`.admon_macro-${domain} .admonition-title`)[0];
  var admon = document.querySelectorAll(`.admon_macro-${domain} .admonition`)[0];

  var rob_table = document.querySelectorAll(`.q${domain}.icon`)[0];
  const outcomeMap = { "High risk": "red", "null": "blue", "Some concerns": "yellow", "Low risk": "green" };
  const symbolMap = { "High risk": "X", "null": "?", "Some concerns": "-", "Low risk": "+" };

  if (outcome != "null") {
    admon_title.innerText = "Risk of bias outcome: " + outcome;
    admon_text.innerText = md_summary;
    admon.className = `admonition ${get_admon_class(outcome)}`
    rob_table.className = `q${domain} icon ${outcomeMap[outcome]}`
    rob_table.innerText = symbolMap[outcome];
  }
  else {
    admon_title.innerText = "Risk of bias judgement";
    admon_text.innerText = "Fill out the questions";
    admon.className = `admonition info`
    rob_table.className = `q${domain} icon blue`
    rob_table.innerText = "?";
  }
  updateOverallJudgement();
};

const process_dt2 = () => {
  const domain = 2;
  const userAnswers = getDomainAnswers(domain, 7);
  const outcome_p1 = traverseTree(D2_P1_DT, userAnswers);
  const outcome_p2 = traverseTree(D2_P2_DT, userAnswers);

  const userDetails = getDomainAnswerDetails(domain, 7);
  let md_summary = getMarkdownSummary(userAnswers, userDetails);

  var admon_text = document.querySelectorAll(`.admon_macro-${domain} .admonition-content`)[0];
  var admon_title = document.querySelectorAll(`.admon_macro-${domain} .admonition-title`)[0];
  var admon = document.querySelectorAll(`.admon_macro-${domain} .admonition`)[0];
  var rob_table = document.querySelectorAll(`.q${domain}.icon`)[0];
  const outcomeMap = { "High risk": "red", "null": "blue", "Some concerns": "yellow", "Low risk": "green" };
  const symbolMap = { "High risk": "X", "null": "?", "Some concerns": "-", "Low risk": "+" };


  if (outcome_p1 == DomainRisk.Low && outcome_p2 == DomainRisk.Low) {
    admon_title.innerText = "Risk of bias outcome: " + DomainRisk.Low;
    admon_text.innerText = md_summary;
    admon.className = `admonition ${get_admon_class(DomainRisk.Low)}`
    rob_table.className = `q${domain} icon ${outcomeMap[DomainRisk.Low]}`
    rob_table.innerText = symbolMap[DomainRisk.Low];

  }
  else if (outcome_p1 == DomainRisk.High || outcome_p2 == DomainRisk.High) {
    admon_title.innerText = "Risk of bias outcome: " + DomainRisk.High;
    admon_text.innerText = md_summary;
    admon.className = `admonition ${get_admon_class(DomainRisk.High)}`
    rob_table.className = `q${domain} icon ${outcomeMap[DomainRisk.High]}`
    rob_table.innerText = symbolMap[DomainRisk.High];

  }
  else if (outcome_p1 == DomainRisk.Concerns || outcome_p2 == DomainRisk.Concerns) {
    admon_title.innerText = "Risk of bias outcome: " + DomainRisk.Concerns;
    admon_text.innerText = md_summary;
    admon.className = `admonition ${get_admon_class(DomainRisk.Concerns)}`
    rob_table.className = `q${domain} icon ${outcomeMap[DomainRisk.Concerns]}`
    rob_table.innerText = symbolMap[DomainRisk.Concerns];

  }
  else {
    admon_title.innerText = "Risk of bias judgement";
    admon_text.innerText = "Fill out the questions";
    admon.className = `admonition info`
    rob_table.className = `q${domain} icon blue`
    rob_table.innerText = "?";

  };
  updateOverallJudgement();

};

function runAll() {
  process_dt(1, 3, D1_DT);
  process_dt("2b", 6, D2B_DT);
  process_dt(3, 4, D3_DT);
  process_dt(4, 5, D4_DT);
  process_dt(5, 3, D5_DT);
  process_dt2();
  d2b_updateQuestionVisibility();
  d2_updateQuestionVisibility();
  d3_updateQuestionVisibility();
  d4_updateQuestionVisibility();
}

function add_radio_text_listeners(domain, num_q, tree) {
  document.querySelectorAll(`input[type="radio"][name^="q${domain}_"]`).forEach(radio => {
    radio.addEventListener("click", () => {
      process_dt(domain, num_q, tree);
    });
  });
  document.querySelectorAll(`textarea.question-details.q${domain}`).forEach(textarea => {
    textarea.addEventListener("input", (event) => {
      process_dt(domain, num_q, tree);
    });
  });
  //TODO! Plug in thing for table with final verdicts, or just shove that in the actual process dt itself
}

document.addEventListener("DOMContentLoaded", () => {
  add_radio_text_listeners(1, 3, D1_DT);
  add_radio_text_listeners("2b", 6, D2B_DT);
  add_radio_text_listeners(3, 4, D3_DT);
  add_radio_text_listeners(4, 5, D4_DT);
  add_radio_text_listeners(5, 3, D5_DT);


  document.querySelectorAll('input[type="radio"][name^="q2_"]').forEach(radio => {
    radio.addEventListener("click", process_dt2);
    radio.addEventListener("click", d2_updateQuestionVisibility);
  });
  document.querySelectorAll("textarea.question-details.q2").forEach(textarea => {
    textarea.addEventListener("input", (event) => {
      process_dt2();
    });
  });

  document.querySelectorAll('input[type="radio"][name^="q2b_"]').forEach(radio => {
    radio.addEventListener("click", d2b_updateQuestionVisibility);
  });

  document.querySelectorAll('input[type="radio"][name^="q3_"]').forEach(radio => {
    radio.addEventListener("click", d3_updateQuestionVisibility);
  });

  document.querySelectorAll('input[type="radio"][name^="q4_"]').forEach(radio => {
    radio.addEventListener("click", d4_updateQuestionVisibility);
  });

  var overall_btn = document.getElementById("overall-btn");
  overall_btn.addEventListener("click", () => getOverallSummary(overall_btn));

  runAll();

});


// CLEAR STATE IN LOCAL STORAGE
function clearAllState() {
  // Clear all stored radio button and textarea values from localStorage
  localStorage.clear();

  // Optionally, reset the UI elements (radio buttons and textareas)
  document.querySelectorAll("input[type='radio']").forEach(input => {
    input.checked = false; // Uncheck all radio buttons
  });

  document.querySelectorAll("textarea").forEach(textarea => {
    textarea.value = ''; // Clear all textarea values
  });

  runAll();
}

document.getElementById("rob2-clear-button").addEventListener("click", clearAllState);

// Hide functions
function d2_updateQuestionVisibility() {
  const answerQ21 = getAnswer("q2_1");
  const answerQ22 = getAnswer("q2_2");
  const answerQ23 = getAnswer("q2_3");
  const answerQ24 = getAnswer("q2_4");
  const answerQ26 = getAnswer("q2_6");

  // Determine if q2_3 should be shown:
  const showQ23 = [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ21) || [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ22);
  const showQ24 = showQ23 && [Answer.YES, Answer.PYES].includes(answerQ23);
  const showQ25 = showQ24 && [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ24)
  const showQ27 = [Answer.NO, Answer.PNO, Answer.NOINFO].includes(answerQ26)

  const q23Row = document.getElementById("q2_3_row");
  if (q23Row) {
    q23Row.style.display = showQ23 ? "" : "none";
  }
  const q24Row = document.getElementById("q2_4_row");
  if (q24Row) {
    q24Row.style.display = showQ24 ? "" : "none";
  }
  const q25Row = document.getElementById("q2_5_row");
  if (q25Row) {
    q25Row.style.display = showQ25 ? "" : "none";
  }
  const q27Row = document.getElementById("q2_7_row");
  if (q27Row) {
    q27Row.style.display = showQ27 ? "" : "none";
  }
}

function d2b_updateQuestionVisibility() {
  const answerQ21b = getAnswer("q2b_1");
  const answerQ22b = getAnswer("q2b_2");
  const answerQ23b = getAnswer("q2b_3");
  const answerQ24b = getAnswer("q2b_4");
  const answerQ25b = getAnswer("q2b_5");

  // Determine if q2_3 should be shown:
  const showQ23b = [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ21b) || [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ22b);
  const showQ26b = [Answer.NO, Answer.PNO, Answer.NOINFO].includes(answerQ23b) || [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ24b) || [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ25b);

  const q23Row_b = document.getElementById("q2b_3_row");
  if (q23Row_b) {
    q23Row_b.style.display = showQ23b ? "" : "none";
  }
  const q26Row_b = document.getElementById("q2b_6_row");
  if (q26Row_b) {
    q26Row_b.style.display = showQ26b ? "" : "none";
  }

}

function d3_updateQuestionVisibility() {
  const answerQ31 = getAnswer("q3_1");
  const answerQ32 = getAnswer("q3_2");
  const answerQ33 = getAnswer("q3_3");

  // Determine if q2_3 should be shown:
  const showQ32 = [Answer.NO, Answer.PNO, Answer.NOINFO].includes(answerQ31);
  const showQ33 = [Answer.NO, Answer.PNO].includes(answerQ32);
  const showQ34 = [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ33);

  const q32Row = document.getElementById("q3_2_row");
  if (q32Row) {
    q32Row.style.display = showQ32 ? "" : "none";
  }
  const q33Row = document.getElementById("q3_3_row");
  if (q33Row) {
    q33Row.style.display = showQ33 ? "" : "none";
  }
  const q34Row = document.getElementById("q3_4_row");
  if (q34Row) {
    q34Row.style.display = showQ34 ? "" : "none";
  }

}
function d4_updateQuestionVisibility() {
  const answerQ41 = getAnswer("q4_1");
  const answerQ42 = getAnswer("q4_2");
  const answerQ43 = getAnswer("q4_3");
  const answerQ44 = getAnswer("q4_4");

  // Determine if q2_3 should be shown:
  const showQ43 = [Answer.NO, Answer.PNO, Answer.NOINFO].includes(answerQ41) && [Answer.NO, Answer.PNO, Answer.NOINFO].includes(answerQ42);
  const showQ44 = [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ43);
  const showQ45 = [Answer.YES, Answer.PYES, Answer.NOINFO].includes(answerQ44);

  const q43Row = document.getElementById("q4_3_row");
  if (q43Row) {
    q43Row.style.display = showQ43 ? "" : "none";
  }
  const q44Row = document.getElementById("q4_4_row");
  if (q44Row) {
    q44Row.style.display = showQ44 ? "" : "none";
  }
  const q45Row = document.getElementById("q4_5_row");
  if (q45Row) {
    q45Row.style.display = showQ45 ? "" : "none";
  }
}


runTests();
