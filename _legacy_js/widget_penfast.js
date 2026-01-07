// globals
var score = 0;
var score_display = get_by_id("scorereport");
score_display.innerHTML = score +
  " points: Very low risk (<1%) of positive penicillin allergy test";

// getter functions by ID or name
function get_by_id(id) {
  return document.getElementById(id);
}
function get_by_name(name) {
  return document.getElementsByName(name);
}

// set listeners
function set_listeners() {
  var q1 = get_by_id("q1"); // time
  var q2 = get_by_id("q2"); // angio/angio
  var q3 = get_by_id("q3"); // severe cut
  var q4 = get_by_id("q4"); // treatment
  // timing, 2 points
  q1.addEventListener("change", function () {
    score = q1.checked ? score + 2 : score - 2;
    score_display.innerHTML = score + " points: " + get_penfast_risk(score);
  });

  // ana/angio OR severe cut = 2 points
  q2.addEventListener("change", function () {
    // if q3 already checked then don't add new score or subtract
    if (!q3.checked) {
      score = q2.checked ? score + 2 : score - 2;
    }
    score_display.innerHTML = score + " points: " + get_penfast_risk(score);
  });
  q3.addEventListener("change", function () {
    //edit score
    // if q3 already checked then don't add new score or subtract
    if (!q2.checked) {
      score = q3.checked ? score + 2 : score - 2;
    }
    score_display.innerHTML = score + " points: " + get_penfast_risk(score);
  });

  // treatment
  q4.addEventListener("change", function () {
    //edit score
    score = q4.checked ? score + 1 : score - 1;
    score_display.innerHTML = score + " points: " + get_penfast_risk(score);
  });
}
set_listeners();

// interprets score and spits out risk string
function get_penfast_risk(score) {
  var t = "of positive penicillin allergy test";
  var description = "Very low risk (<1%) " + t;
  if (score == 0) {
    description = "Very low risk (<1%) " + t;
  } else if (score == 1 || score == 2) {
    description = "Low risk (5%) " + t;
  } else if (score == 3) {
    description = "Moderate risk (20%) " + t;
  } else if (score == 4 || score == 5) {
    description = "High risk (50%) " + t;
  }
  return description;
}
