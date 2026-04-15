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
#set text(font: "Arimo", size: 12pt, lang: "en")
#set par(justify: true, leading: 0.65em)

#let warning-box(title, body) = {
  block(
    fill: luma(240),
    stroke: (left: 4pt + black),
    inset: 12pt,
    radius: 4pt,
    width: 100%,
    [*#title* \ #body],
  )
}

#let result-box(title: none, stroke-style: 1pt + black, body) = block(
  stroke: stroke-style,
  width: 100%,
  inset: 12pt,
  radius: 4pt,
  [
    #if title != none [
      #text(weight: "bold", size: 12pt)[#title]
      #v(0.5em)
    ]
    #body
  ],
)

#let genetic-testing-handout() = {
  // Header
  align(center)[
    #text(weight: "bold", size: 18pt)[UNDERSTANDING GENETIC TESTING]\
  ]

  v(0.5em)
  line(length: 100%, stroke: 0.5pt + black)
  v(1em)

  text(weight: "bold", size: 14pt)[1. What is DNA and what are genes?]
  v(0em)
  [
    Your body is made up of trillions of cells. Inside almost nearly all of them is your DNA, the instruction manual that tells your body how to develop, grow, and function.

    DNA does this by providing the exact recipes/blueprints for making proteins. If DNA is the manual, proteins are the active workers. They build your physical structures, fight off infections, and carry out the tasks that keep you alive. They also determine things like your eye colour and height.

    #v(0.5em)

    Think of your DNA as a set of massive instruction manuals or recipe books:

    - *The Books (DNA):* You have two sets of books, one inherited from each parent.

    - *The Chapters (Genes):* Each book has thousands of chapters called genes.

    - *The Recipes:* Each gene contains instructions for making a specific protein.
  ]
  v(1.5em)
  align(center)[
    #block(
      fill: luma(241), // Very light gray placeholder background
      width: 100%,
      inset: 5pt,
      radius: 4pt,
      [
        #image("assets/genetics-flow.png", width: 100%)
      ],
    )
  ]
  v(1.5em)

  warning-box("Everyone has a unique set of books.")[
    #v(0em)
    *Small differences in your books and recipes are completely normal*---they are what make you unique!

    Most of these differences are harmless. However, sometimes a variation acts like a major typo in a recipe, or causes pages and chapters to be missing or duplicated. When these specific errors happen, they sometimes change how your proteins work, and lead to certain health conditions.
  ]

  pagebreak()

  text(weight: "bold", size: 14pt)[2. What kinds of genetic changes can occur?]

  let frame(row-line) = (x, y) => (
    left: 0pt,
    right: 0pt,
    top: if y < 2 { 1pt + rgb("21222C") } else { row-line },
    bottom: 1pt + rgb("21222C"),
  )
  set table(
    fill: (luma(241), none),
    stroke: frame(0.5pt + luma(180)),
  )
  text(size: 10.5pt, table(
    columns: 2,
    inset: 7pt,

    [*Type of Genetic Change*], [*What It Means* (_and associated analogy_)],

    [*Gene variant*],
    [A small change in the DNA sequence of a gene. _A spelling change in a recipe_.],

    [*Rearrangement*],
    [DNA pieces are moved or flipped. _Pages are rearranged between books_.],

    [*Inversion*],
    [A section of DNA is flipped in the opposite direction. _A recipe is written backwards._],

    [*Duplications / Deletions*],
    [There are extra or missing copies of genes. _Extra or missing chapters in the book._],

    [*Whole Chromosome*],
    [An entire chromosome is extra or missing. _An entire book is extra or missing._],
  ))

  text(weight: "bold", size: 14pt)[3. What are some types of genetic tests?]
  text(size: 10.5pt, table(
    columns: 2,
    inset: 8pt,

    [*Test Type*], [*What It Looks For* (_and associated analogy_)],

    [*Panel Testing*],
    [A specific group (panel) of hundreds of genes potentially related to your health condition. _Reading #underline()[many] relevant chapters_.],

    [*Chromosomal Microarray*],
    [Missing or extra DNA. _Detects missing or extra chapters._],

    [*Whole Exome Sequencing*],
    [Most genes that make proteins. _Reads the majority of important chapters._],
  ))

  text()[*Note:* Test availability can vary significantly based on medical profile, hospital resources, and healthcare coverage. Your physician will recommend the most appropriate option.]

  v(0.5em)
  text(weight: "bold", size: 14pt)[4. What are the possible test results?]
  [When we analyze your genes, there are four possible results we may find:]
  v(0.5em)

  grid(
    columns: (1fr, 1fr),
    gutter: 8pt,
    result-box(title: "Positive (Diagnosis)", stroke-style: 1.5pt + black)[
      #v(-0.7em)
      We find a specific variant that explains the health condition. \ #text(fill: white)[. \ .]
    ],
    result-box(title: "Negative (Uninformative)", stroke-style: 0.5pt + black)[
      #v(-0.7em)
      *This is the most common result.* We did not find any genetic variations that explain the health condition. This does not completely rule out a genetic cause.
    ],

    result-box(
      title: "Variant of Uncertain Significance",
      stroke-style: (thickness: 1pt, dash: "dashed"),
    )[
      #v(-0.7em)
      We found a variant, *but we don't know yet if it changes the protein(s) enough to cause a problem*. It might be harmless, or it might cause disease. We track these as research evolves.
    ],
    result-box(
      title: "Secondary Findings",
      stroke-style: (thickness: 1.5pt, dash: "dotted"),
    )[
      #v(-0.7em)
      We found a typo in a completely different chapter that we were not originally looking for. This usually involves genes related to other medically actionable conditions, unrelated to the initial reason we tested.
    ],
  )

  v(1.5em)

  text(weight: "bold", size: 14pt)[
    5. How does this information help?
  ]
  v(0.5em)
  [
    Finding a specific genetic cause can significantly change how we approach medical care:

    - *Better Treatments and Monitoring:*  If we know exactly which protein(s) are affected, it can help us pick the optimal treatments. Some genetic conditions are associated with development of complications later in life, and knowing the condition also tells us which parts of the body we need to check regularly.

    - *Testing Relatives:* Because we inherit our "books" from our parents, a genetic change might be shared with other family members. Identifying certain genetic variants may prompt us to offer testing to other family members to see if they share the same variation.

    - *Family Planning:* For parents or those wanting to start a family, this test provides a clearer picture of the chances a condition might be passed on to future children.
  ]
}

#set page(footer: [
  #line(length: 100%, stroke: 0.5pt + black)
  #align(center)[
    #text(size: 9pt, style: "italic")[
      This handout is for informational purposes only.
    ]
  ]
])

#genetic-testing-handout()
