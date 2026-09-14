#import "../templates/handout-base.typ": (
  fill-in, info-box, patient_handout, sig-line, standard-table, warning-box,
)
#show: patient_handout.with(last-updated: "Sep 2026")

// Macro for the initial box next to each consent statement
#let initial-box = box(
  stroke: 1pt + black,
  width: 1.5em,
  height: 1.5em,
  radius: 2pt,
  baseline: 0.3em,
)

#let consent-item(body) = {
  grid(
    columns: (3.5em, 1fr),
    align: (center + top, left),
    initial-box, body,
  )
  v(0.5em)
}

#v(0.5em)
#align(center)[
  #text(weight: "bold", size: 18pt)[CONSENT FOR ORAL IMMUNOTHERAPY (OIT)]\
]
#line(length: 100%, stroke: 0.5pt + black)

#v(1em)

#grid(
  columns: (100%,),
  [*Target Allergen(s):* #fill-in(width: 1fr)],
)

#v(1em)
= Acknowledgement of Treatment and Risks

#text(
  style: "italic",
)[Please read and check each statement below to confirm your understanding:]
#v(1em)

#consent-item([
  *Information and Education:* I have received, read, and understand the detailed handouts on Oral Immunotherapy. I have had the opportunity to ask questions, and they have been answered to my satisfaction.
])

#consent-item([
  *Risk of Allergic Reactions:* I understand that mild allergic reactions are a known and expected risk of this treatment. Though rare if done properly, *severe and life-threatening reactions (anaphylaxis) can occur*.
])

#consent-item([
  *Risk of EoE:* I understand there is a small risk of developing Eosinophilic Esophagitis (EoE), an inflammation of the food pipe. This usually resolves if OIT is discontinued.
])

= Commitments to Safety
#text(
  style: "italic",
)[Please read and check each statement below to confirm your understanding:]
#v(1em)


#consent-item([
  *Epinephrine Requirement:* I agree to have an unexpired, prescribed Epinephrine device (e.g., EpiPen, Neffy) immediately available at *all times*, including during every daily dose.
])

#consent-item([
  *Daily Dosing and Cofactors:* I agree to adhere to the daily dosing schedule as directed. I understand that I must *withhold the dose* and contact the clinic if the patient is ill, has a fever, or is experiencing uncontrolled asthma. I will ensure the patient avoids strenuous exercise and hot showers/baths for 2 hours before and after each dose.
])

#consent-item([
  *Emergency Action:* I understand that if a severe allergic reaction occurs, my first action must be to *administer Epinephrine and call 911 / go to the nearest Emergency Room*. I will notify the allergy clinic on the next business day.
])

#consent-item([
  *Data and Quality Improvement:* I understand that my/my child's anonymized medical information and treatment outcomes may be reviewed by the clinical team for quality improvement and research purposes. No identifying information will be shared.
])

#v(1em)
= Signatures

I have read the consent form and understand the information it contains. I have had the opportunity to ask questions regarding the risks and benefits of OIT, and my questions have been answered. I hereby give consent for the patient designated below to undergo OIT. I also authorize the allergy team to treat any reactions that may occur in the clinic.

#v(2em)

#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Patient / legal guardian\n(Printed name & Relationship)"),
  sig-line("Patient / legal guardian (Signature)"),
)

#v(1.5em)
#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Witness (Printed name)"), sig-line("Witness (Signature)"),
)

#v(1.5em)
#box(width: 45%)[
  #sig-line("Date (D-M-Y)")
]
