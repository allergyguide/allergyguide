// handout.typ
#let patient_handout(
  last-updated: none,
  body,
) = {
  let commit_hash = sys.inputs.at("commit_hash", default: "dev-build")

  let header-text = if last-updated != none {
    [Updated: #last-updated | version: #commit_hash]
  } else {
    [version: #commit_hash]
  }

  set page(
    paper: "us-letter",
    margin: (x: 0.75in, y: 0.75in),
    header: align(right)[
      #text(style: "italic", size: 0.8em, header-text)
    ],
    footer: [
      #line(length: 100%, stroke: 0.5pt + black)
      #align(center)[
        #text(size: 8pt)[
          Handout for informational purposes only. © 2026 allergyguide. Licensed under CC BY 4.0.
        ]
      ]
    ],
  )
  set text(font: "Arimo", size: 12pt, lang: "en")
  set par(justify: true, leading: 0.65em)

  body
}
