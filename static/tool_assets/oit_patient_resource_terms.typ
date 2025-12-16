#let commit_hash = sys.inputs.at("commit_hash", default: "dev-build")
#set page(
  paper: "us-letter",
  margin: (x: 0.75in, y: 0.75in),
  header: {
    align(right)[#text(style: "italic", size: 0.8em)[
        version: #commit_hash]
    ]
  },
)
#set text(font: "Arimo", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.65em)


#let physician-review-sheet(
  patient-name: "______________________",
  dob: "______________________",
  food: "______________________",
  generated-date: "______________________",
) = {
  // Header
  align(center)[
    #text(weight: "bold", size: 16pt)[ORAL IMMUNOTHERAPY]\
    #text(weight: "bold", size: 14pt)[PHYSICIAN REVIEW SHEET]
  ]

  v(1em)

  rect(width: 100%, inset: 15pt, stroke: 1pt + gray, radius: 4pt)[
    #grid(
      columns: (4fr, 3fr),
      gutter: 0pt,
      // LEFT COLUMN: The Sticker Space
      rect(width: 100%, height: 9em, stroke: (right: 1pt + gray), inset: 12pt)[
        #set align(center + horizon)
        #text(fill: gray, style: "italic")[
          \
          [ Patient Label / Sticker if available]
          \ \
        ]
      ],

      // RIGHT COLUMN: info if no sticker
      rect(width: 100%, height: 6em, stroke: none, inset: 12pt)[
        #set align(left + horizon)
        #text(size: 9pt)[
          *Patient Name:* #patient-name\
          \
          \
          *Food:* #food
        ]
      ],
    )
  ]

  v(1em)

  // The legal bits
  text(weight: "bold", size: 12pt)[CLINICAL ATTESTATION (required):]
  v(0.5em)
  text(
    style: "italic",
    size: 10pt,
  )[By signing below, the physician certifies the following:]
  v(0.5em)
  enum(
    spacing: 1.2em,
    [*Protocol review:* I have personally reviewed the food protein concentration(s), doses and calculations in the attached protocol, and confirm they are clinically appropriate for the patient.],
    [*Patient-facing material review:* I have reviewed the handout and patient education content, and confirm they are applicable and appropriate for the patient.],
    [*Informed Consent:* I have obtained informed consent from the patient/caregiver(s), which included a discussion on the benefits and risks of OIT and alternative options.],
  )

  // Signature
  v(5em)

  grid(
    columns: (1fr, 1fr),
    gutter: 2em,
    [
      #line(length: 100%, stroke: 0.5pt)
      *Physician Signature*
    ],
    [
      #line(length: 100%, stroke: 0.5pt)
      *Date (D/M/Y) *
    ],
  )

  v(1em)
  [
    #line(length: 100%, stroke: 0.5pt)
    *Printed Name / Stamp*
  ]

  v(1fr) // Push footer to bottom

  align(center)[
    #text(size: 10pt, fill: gray)[
      GENERATED CONTENT WARNING:
      This document was created using an open-source calculation tool. You should review available literature and local OIT guidelines, and decide if this protocol and general handout are applicable to your practice. This tool does not exercise clinical judgment. This document is NOT valid until reviewed and signed by a licensed physician. Any use of this document without direct physician supervision is strictly prohibited.
    ]
  ]
}

#physician-review-sheet()

// Add parental checklist sheet too?
