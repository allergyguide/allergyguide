#import "@preview/cetz:0.4.2"

#let commit_hash = sys.inputs.at("commit_hash", default: "dev-build")

#set page(
  paper: "us-letter",
  margin: (x: 1in, y: 1in),
  footer: {
    [#text(style: "italic", size: 0.7em)[
        version: #commit_hash | Copyright © #datetime.today().year() allergyguide
      ] #h(1fr)
    ]
  },
)

#set text(font: "Arimo", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.7em)

#show heading.where(level: 1): it => block(
  width: 100%,
  stroke: (bottom: 0.5pt + gray),
  inset: (bottom: 0.5em),
  below: 1em,
  it,
)

// Macro for the initial box next to each consent statement
#let initial-box = box(
  stroke: 1pt + black,
  width: 2.5em,
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

#align(center)[
  #text(size: 20pt, weight: "bold")[Consent for Oral Immunotherapy (OIT)]\
  #v(0.1em)
  #line(length: 100%, stroke: 2pt)
]

#v(1em)

#grid(
  columns: (1fr, 1fr),
  gutter: 2em,
  [
    *Target Allergen(s):* #box(width: 1fr, stroke: (bottom: 0.5pt + black))
  ],
  [
    *Date:* #box(width: 1fr, stroke: (bottom: 0.5pt + black))
  ],
)

#v(2em)
= Acknowledgement of Treatment and Risks

#text(
  style: "italic",
)[Please read and check each statement below to confirm your understanding:]
#v(1em)

#consent-item([
  *Information and Education:* I have received, read, and understand the detailed handout on Oral Immunotherapy. I have had the opportunity to ask questions, and they have been answered to my satisfaction.
])

#consent-item([
  *Risk of Allergic Reactions:* I understand that mild allergic reactions are a known and expected risk of this treatment. Though rare if done properly, *severe and life-threatening reactions (anaphylaxis) can occur*.
])

#consent-item([
  *Risk of EoE:* I understand there is a small risk of developing Eosinophilic Esophagitis (EoE), an inflammation of the food pipe. This usually resolves if OIT is discontinued.
])

= Commitments to Safety

#consent-item([
  *Epinephrine Requirement:* I agree to have an unexpired, prescribed Epinephrine Auto-injector (e.g., EpiPen) immediately available at *all times*, including during every daily dose.
])

#consent-item([
  *Daily Dosing and Cofactors:* I agree to adhere to the daily dosing schedule as directed. I understand that I must *withhold the dose* and contact the clinic if the patient is ill, has a fever, or is experiencing uncontrolled asthma. I will ensure the patient avoids strenuous exercise and hot showers/baths for 2 hours before and after each dose.
])

#consent-item([
  *Emergency Action:* I understand that if a severe allergic reaction occurs, my first action must be to *administer Epinephrine and call 911 / go to the nearest Emergency Room*. I will notify the allergy clinic on the next business day.
])

#consent-item([
  *Data & Quality Improvement:* I understand that my/my child's anonymized medical information and treatment outcomes may be reviewed by the clinical team for quality improvement and research purposes. No identifying information will be shared.
])

#v(1em)
= Signatures

I have read the consent form and understand the information it contains. I have had the opportunity to ask questions regarding the risks and benefits of OIT, and my questions have been answered. I hereby give consent for the patient designated below to undergo OIT. I also authorize the allergy team to treat any reactions that may occur in the clinic.

#v(2em)

#grid(
  columns: (1fr, 1fr),
  gutter: 4em,
  [
    #line(length: 100%, stroke: 0.5pt + black)
    *Patient / Legal Guardian Signature*
  ],
  [
    #line(length: 100%, stroke: 0.5pt + black)
    *Date (D-M-Y)*
  ],
)
#v(2em)
#grid(
  columns: (1fr, 1fr),
  gutter: 4em,
  [
    #line(length: 100%, stroke: 0.5pt + black)
    *Print Name & Relationship to Patient*
  ],
  [

  ],
)

#v(7em)

#grid(
  columns: (1fr, 1fr),
  gutter: 4em,
  [
    #line(length: 100%, stroke: 0.5pt + black)
    *Witness name (printed) and signature*
  ],
  [
    #line(length: 100%, stroke: 0.5pt + black)
    *Date (D-M-Y)*
  ],
)
