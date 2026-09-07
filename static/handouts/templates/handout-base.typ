// handout.typ
#let patient_handout(body) = {
  let commit_hash = sys.inputs.at("commit_hash", default: "dev-build")

  set page(
    paper: "us-letter",
    margin: (x: 0.75in, y: 0.75in),
    header: align(right)[
      #text(style: "italic", size: 0.8em)[version: #commit_hash]
    ],
  )
  set text(font: "Arimo", size: 12pt, lang: "en")
  set par(justify: true, leading: 0.65em)

  body
}
