#import "templates/handout-base.typ": (
  fill-in, info-box, patient_handout, sig-line, standard-table, warning-box,
)
#show: patient_handout.with(last-updated: "September 2026")

= Patient Handout Style Guide

Covers editorial guidelines, structural rules, and standard component library.

== 1. Core Principles

- *Print First:* Assume every handout will be printed in black and white by a standard clinic laser printer.
- *Grayscale Only:* Use shades of gray (`luma()`) instead of named colors or RGB. Ensure high contrast.
- *Grade 8 Reading Level:* Use active voice, simple sentences, and avoid medical jargon unless immediately defined.
- *Scannability:* Use bullet points, bold text for key terms, and short paragraphs. Avoid walls of text.

== 2. Structural Guidelines

=== Headings
Use numbered headings for core questions (e.g., `1. What is Allergic Rhinitis?`).

=== Formatting
- Emphasize important terms using *bold text*.
- Use _italics_ sparingly.
- Use standard bullet lists for any sequence of 3 or more items.

#pagebreak()

== 3. Standard Components

For consistency, check if you can use components provided in `templates/handout-base.typ`. For more specialized graphics/figures, make them within the relevant handout file.

=== Admonition Boxes
Use boxes to separate critical information from the main text flow.

*Code Example:*
```typst
#warning-box(title: "Important Warning")[
  Stop taking antihistamines 5 days before your skin test.
]
```

*Result:*
#warning-box(title: "Important Warning")[
  Stop taking antihistamines 5 days before your skin test.
]

#v(1em)

*Code Example:*
```typst
#info-box(title: "Did You Know?")[
  Most children outgrow their milk and egg allergies by school age.
]
```

*Result:*
#info-box(title: "Did You Know?")[
  Most children outgrow their milk and egg allergies by school age.
]

=== Tables

Use `standard-table` for data that needs to be compared.

*Code Example:*
```typst
#standard-table(
  columns: 2,
  [*Symptom*], [*Action Plan*],
  [Mild hives], [Take an antihistamine.],
  [Difficulty breathing], [Use your epinephrine auto-injector.]
)
```

*Result:*
#standard-table(
  columns: 2,
  [*Symptom*],
  [*Action Plan*],
  [Mild hives],
  [Take an antihistamine.],
  [Difficulty breathing],
  [Use your epinephrine auto-injector.],
)

=== Forms & Signatures

Use `fill-in` for blank lines within sentences, and `sig-line` with a `#grid` layout for professional signature blocks.

*Code Example:*
```typst
#fill-in(width: 2in) (Last name), #fill-in(width: 2in) (First name)

#v(2em)
#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Patient (Printed name)"),
  sig-line("Patient (Signature)"),
)
```

*Result:*
#fill-in(width: 2in) (Last name), #fill-in(width: 2in) (First name)

#v(2em)
#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Patient (Printed name)"), sig-line("Patient (Signature)"),
)

== 4. Getting Started

To create a new handout, start your file with:

```typst
#import "templates/handout-base.typ": (
  patient_handout, warning-box, info-box, standard-table,
  sig-line, fill-in
)
#show: patient_handout.with(last-updated: "Month Year")

// Your content here...
```
