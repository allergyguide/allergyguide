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

// --- Standard Components ---

/// Uses a heavy left border
#let warning-box(title: none, body) = {
  block(
    fill: luma(240),
    stroke: (left: 4pt + black),
    inset: 12pt,
    radius: 4pt,
    width: 100%,
    [
      #if title != none [
        *#title* \
      ]
      #body
    ],
  )
}

/// A standard informational box with a subtle border
#let info-box(title: none, body) = {
  block(
    fill: luma(250),
    stroke: 1pt + luma(180),
    inset: 12pt,
    radius: 4pt,
    width: 100%,
    [
      #if title != none [
        *#title* \
      ]
      #body
    ],
  )
}

/// A standard table
#let standard-table(columns: 1, ..cells) = {
  table(
    columns: columns,
    stroke: (x, y) => (
      bottom: if y == 0 { 0pt + black } else { 1pt },
      top: if y == 0 { 1pt + black } else { 0pt },
      left: 0pt,
      right: 0pt,
    ),
    fill: (x, y) => if y == 0 { luma(245) } else { none },
    inset: 8pt,
  )
}

/// A fill-in-the-blank line for forms
#let fill-in(width: 2.5in) = box(
  width: width,
  stroke: (bottom: 0.5pt),
  outset: (bottom: 2pt)
)[]

/// A signature line with a small, gray label underneath
#let sig-line(label) = block(width: 100%, [
  #line(length: 100%, stroke: 0.5pt)
  #v(0.3em)
  #text(size: 9pt, fill: luma(80), label)
])

