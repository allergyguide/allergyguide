#import "../templates/handout-base.typ": (
  info-box, patient_handout, standard-table, warning-box, sig-line, fill-in
)
#show: patient_handout.with(last-updated: "September 2026")

// Loosen up the spacing for the first page
#show heading: set block(above: 2em, below: 1em)
#set par(spacing: 1.5em)
#set list(spacing: 1.5em)

#v(0.5em)
#align(center)[
  #text(weight: "bold", size: 18pt)[DRUG CHALLENGE CONSENT FORM]\
]
#line(length: 100%, stroke: 0.5pt + black)
#v(-1em)

= What is a drug challenge?

During a drug challenge, you will receive a dose of the medication in a supervised setting. The dose is usually split up into multiple smaller doses, depending on the clinical history.

For most drugs, skin tests for drug allergy have poor accuracy, which is why we are suggesting a drug challenge. *A drug challenge is the most reliable way to test whether you are allergic to a medication or not.*

A drug challenge should be done when you are in good health. *Antihistamine medications should be avoided for a period of 5-7 days prior to the test.*

= Why should I have a drug challenge?

Your doctor has recommended that you have a drug challenge for one of the following reasons:

1. To confirm that a particular drug is safe for you to have.

2. To find out whether a particular drug was responsible for a previous reaction.

= What are the risks of a drug challenge?

Reactions to a medication can be either immediate or delayed.

- *Immediate reactions:*
  - Mild allergic reactions can involve itchy skin, hives, nausea, abdominal pain, vomiting, diarrhea, stuffy nose, sneezing, and wheezing.
  - Severe allergic reactions that involve breathing difficulty and low blood pressure can rarely occur.

- *Delayed reactions:*
  - These are typically mild (rash) and non-life-threatening, and can occur many hours or a few days after the drug is given. If a reaction develops, take photos and contact our office or your family physician. If you are very concerned, present to the emergency room.

= What are the alternatives to a drug challenge?

If you choose not to undergo a drug challenge, the safest thing to do is to avoid the drug in question.

#pagebreak()


The nature and purpose of the drug challenge, the risks involved, and the alternatives have been explained to me, and my questions, if any, have been answered. I acknowledge that the practice of medicine is not an exact science, and that no guarantee has been made as to the results that may be obtained. I give my consent and authorize the physician/nurse to perform a challenge to the following drug:

#v(1.5em)

Drug Name: #fill-in(width: 3.5in)

#v(3em)

#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Patient / Parent (Printed name)"),
  sig-line("Patient / Parent (Signature)"),
)

#v(1.5em)
#box(width: 45%)[
  #sig-line("Date")
]
