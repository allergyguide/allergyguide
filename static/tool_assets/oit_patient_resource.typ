#import "@preview/cetz:0.4.2"
#import "@preview/cetz-plot:0.1.3": chart, plot

// --- DOCUMENT SETUP ---
#let commit_hash = sys.inputs.at("commit_hash", default: "dev-build")

#set page(
  paper: "us-letter",
  margin: (x: 0.75in, y: 0.75in),
  numbering: "— 1 —",
  footer: {
    [#text(style: "italic", size: 0.6em)[
        version: #commit_hash
      ] #h(
        1fr,
      ) #text(
        size: 0.7em,
      )[NOT FOR USE WITHOUT DIRECT MEDICAL SUPERVISION. Source: allergyguide. Content licensed under CC 4.0 BY]
    ]
  },
  header: context {
    if counter(page).get().first() in (1, 2) {
      align(right)[GENERAL INFORMATION - #counter(page).display("1")]
    } else if counter(page).get().first() in (3, 4) {
      align(right)[EQUIPMENT - #counter(page).display("1")]
    } else if counter(page).get().first() in (5, 6) {
      align(right)[GIVING DAILY DOSES - #counter(page).display("1")]
    } else if counter(page).get().first() in (7,) {
      align(right)[TROUBLESHOOTING: REACTIONS - #counter(page).display("1")]
    } else if counter(page).get().first() in (8,) {
      align(right)[TROUBLESHOOTING: SICKNESS - #counter(page).display("1")]
    } else if counter(page).get().first() in (9,) {
      align(right)[TROUBLESHOOTING: MISSED DOSES - #counter(page).display("1")]
    } else if counter(page).get().first() in (10,) {
      align(right)[TROUBLESHOOTING: MISC - #counter(page).display("1")]
    } else {
      align(right)[X - #counter(page).display("1")]
    }
  },
)
#show heading.where(level: 1): it => block(
  width: 100%,
  stroke: (bottom: 0.5pt + gray), // The underline line
  inset: (bottom: 0.5em), // Space between text and line
  below: 1em, // Space after the line
  it,
)
#set text(font: "Arimo", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.65em)

// --- CUSTOM STYLES ---
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

#let check-box = box(
  stroke: 1pt + black,
  width: 10pt,
  height: 10pt,
  radius: 2pt,
  inset: 0pt,
  baseline: 2pt,
)

#align(center)[
  #text(size: 24pt, weight: "bold")[Oral Immunotherapy (OIT)]\
  #v(0.1pt)
  #text(size: 14pt, style: "italic")[Patient & Family Guide]
  \
  #line(length: 100%, stroke: 2pt)
]

= What is OIT?
OIT is a medical treatment for food allergies that helps patients gradually gain tolerance to the allergen. By slowly giving tiny amounts of the allergen and then slowly increasing the dose over time, the body gradually becomes used to the allergen. _In other words, the body becomes trained to tolerate doses of the allergen it previously could not_.

*OIT has two main phases:*

1. *Phase 1: Build-up.* Starting with a _*tiny*_ daily dose, every 2-4 weeks we slowly increase the dose until we reach a maintenance dose (usually a bit less than a serving size). This takes 6 - 12 months.
2. *Phase 2: Maintenance.* Once your child reaches the maintenance dose, it will be eaten daily for 12 months.
#v(0.5em)
// --- CETZ DIAGRAM: OIT PHASES ---
// https://www.csaci.ca/wp-content/uploads/2020/02/Key-concepts-teaching-tool.pdf
#figure(
  cetz.canvas({
    import cetz.draw: *

    // Setup the plot area
    plot.plot(
      size: (15, 5),
      x-tick-step: none,
      y-tick-step: none,
      x-label: none,
      y-label: none,
      axis-style: "school-book",
      {
        // The Build-up Phase (Sloping up)
        plot.add(
          (
            (0, 0),
            (0.5, 0.25),
            (1, 0.5),
            (1.5, 0.75),
            (2, 1),
            (2.5, 1.25),
            (3, 1.5),
            (3.5, 1.75),
            (4, 2),
            (4.5, 2.5),
            (5, 3),
            (5.5, 3.5),
            (6, 4),
          ),
          style: (stroke: (thickness: 2pt, dash: "solid")),
          line: "hv",
        )

        // The Maintenance Phase (Flat line)
        plot.add(
          ((6, 4), (14, 4)),
          style: (stroke: (thickness: 2pt)),
        )
      },
    )

    // Annotations for clarity
    line((6.5, 0), (6.5, 5.5), stroke: (dash: "dashed", paint: gray))
    content((2.5, 4), box(
      fill: white,
      inset: 2pt,
    )[*Build-up Phase* \ (Slowly increasing)])
    content((11, 4), box(
      fill: white,
      inset: 2pt,
    )[*Maintenance Phase* \ (Daily steady dose)])

    // Axis Labels
    content((7.5, -0.5), [*Time*])
    content((-0.5, 2.8), [*Daily dose of food*], angle: 90deg)
  }),
)

= What are the possible outcomes with OIT?

1. *Full Freedom (Tolerance):* your child can eat a full serving of the food (like a whole glass of milk or a peanut butter sandwich) without reaction. Around 80% of preschoolers will get here.

2. *Safety (Bite-proof):* While your child may still react if they eat a full serving, they can tolerate smaller amounts. This protects them from severe reactions if they accidentally eat the food. Around 18% of preschoolers will get here.

3. *Stopping:* Sometimes, OIT is stopped. This may be due to taste aversion, lack of time to commit for patient/family, side effects, or other reasons. This is rare: only around 2% of preschoolers have to stop.

#warning-box("Important Safety Note:")[
  #v(0em)
  *Remember:* Even after your child finishes the maintenance phase, if the food is not regularly consumed at least weekly to help the body 'remember' the food is not harmful, the allergy may return.
]

#pagebreak()

= Is OIT right for the patient?
#table(
  columns: (1fr, 1fr),
  inset: 10pt,
  align: top + left,
  stroke: none,
  table.header([*Who is a GOOD candidate?*], [*Who might NOT be?*]),
  table.hline(stroke: 1pt),
  [
    - *Confirmed food allergy:* convincing story of reaction + either positive skin or blood testing.

    - *Young children:* Infants and preschoolers (under age 6) have immune systems that more easily 'unlearn' allergies.They are much less likely to have severe reactions during OIT than older children (imagine 1% versus 14%).

    - *Ability to be consistent:* The ideal patient eats their dose every day at around the same time. Their family must be willing, able, and ready to recognize and treat allergic reactions, including using self-injectable epinephrine properly.
  ],
  [
    - *Have uncontrolled asthma:* asthma *must* be well-managed before starting. Badly controlled asthma is a strong risk factor for severe allergic reactions during OIT.

    - *Severe active eczema:* Severe eczema can make it hard to tell when an allergic reaction is happening.

    - *Older patients:* while not a strict rule, once over 6 years old, patients are more likely to have anaphylaxis, and less likely to be consistent with doses.

    - *Inability to obtain required equipment, language barriers, or inconsistent schedule*
  ],
)

= Benefits vs. Risks

#table(
  columns: (1fr, 1fr),
  inset: 10pt,
  align: top + left,
  stroke: none,
  table.header([*Benefits (The Good)*], [*Risks (The Bad)*]),
  table.hline(stroke: 1pt),
  [
    - *Diet:* At the best outcome, your child can eat a full serving size of allergen without reacting.

    - *Safety:* Much lower risk of a scary reaction from accidental bites.

    - *Anxiety:* Less fear when going to restaurants or school.
  ],
  [
    - *Allergic reactions:* Mild reactions (itchy mouth, mild hives) *are common and expected, especially during the build-up phase*. Severe life-threatening reactions are rare, especially in preschoolers.

    - *Food pipe (esophagus) inflammation:*\ During OIT, around 3% develop inflammation of their esophagus. This condition is more common in those with food allergies in general, and we're not sure if OIT causes this, or is simply a bystander. If this occurs, we consider stopping OIT and involving our Gastroenterology specialists. In the majority of patients, this inflammation is transient and goes away when OIT is stopped.
  ],
)

#place(bottom)[
  #warning-box(
    "Strict Food Avoidance Is Not “Risk Free” either:",
  )[
    Even with strict avoidance, accidental allergic reactions are possible (despite trying to strictly avoid them, the author of this handout had two episodes of anaphylaxis to nuts in the past 5 years alone).
  ]
  #v(2pt)
]

#pagebreak()
#let qr-code(path, label) = {
  figure(
    numbering: none,
    image(path, width: 4cm),
    caption: text(size: 1em, label),
  )
}

#align(center)[
  #text(size: 24pt, weight: "bold")[Equipment, and how to use them]\
  #v(0.1pt)
  #line(length: 100%, stroke: 2pt)
]
#text(size: 0.9em, style: "italic", fill: luma(30))[
  *Disclaimer*: These product links are examples for your convenience.
  We do not endorse specific brands. Any product meeting the specifications is acceptable. Let your doctor know if there are better deals!
]
#v(-0.5em)

#counter(heading).update(0)
= Equipment and how to get them

== A) 1 ml, 5ml, and 10ml disposable oral syringes (without needles)
#v(0.5em)
#list(
  spacing: 0.8em,
  [Look for markings every *0.1 mL* for the 1ml syringes.],
  [*Cleaning:* If used for liquid food (like milk), wash with hot soapy water within an hour of use, and air dry. If used only for water, just air dry.],
  [*Examples:* BD eclipse 1mL oral syringes or Terumo 1mL oral tuberculin syringes. We have also included more examples below:],
)
#v(-1em)
#align(center)[
  #grid(
    columns: 3,
    gutter: 3em,
    qr-code("qr-1ml.png", "1 ml syringes"),
    qr-code("qr-5ml.png", "5 ml syringes"),

    qr-code("qr-10ml.png", "10 ml syringes"),
  )
]
#line(length: 100%, stroke: 0.5pt + gray)

#grid(
  columns: (1fr, auto),
  gutter: 1.5em,
  [
    == B) Digital Scale and measuring aids
    #v(0.5em)
    #list(
      spacing: 0.8em,
      [*Precision:* Must measure up to *0.01 grams* (two decimal places).],
      [*Calibration:* Buy one that includes a calibration weight.],
      [*Cost:* Usually \$20 - \$30 online.],
      [*Measuring aids:* You will need cupcake liners, parchment paper, or small light containers to measure food on the scale.],
    )

  ],
  align(center + horizon, qr-code("qr-scale.png", "0.01g Precision Scale")),
)
#line(length: 100%, stroke: 0.5pt + gray)

== C) Medicines
#v(0.5em)
#block()[
  #set list(spacing: 0.8em)
  - *Epinephrine Auto-injector:* *#underline()[THIS IS MANDATORY]*. Must be up to date and nearby at each dose.
  - *Non-drowsy antihistamine:* Optional but highly recommended. The following can be bought over the counter.
    - Cetirizine, Loratadine, Desloratadine, Fexofenadine; of these, X availble for children < X
    - Example: Reactine. For children under 2, give half of the smallest indicated dosage on the bottle. This usually is 2.5-5mg.
    - *Avoid Benadryl* - it is less effective and comes with more side effects. It also makes many children sleepy, which can make it more difficult to see the early stages of a developing allergic reaction.
]

#pagebreak()

= Measuring solids and liquids accurately
#v(-0.5em)
#table(
  columns: (1fr, 1fr),
  inset: 10pt,
  align: top + left,
  stroke: none,
  table.header(
    [*Measuring solids (powders, butters, etc.)*],
    [*Measuring liquids (water, milks, etc.)*],
  ),
  table.hline(stroke: 1pt),
  [
    + Turn on the scale, and place a small cup/bowl/cupcake liner or wax paper on the scale.
    + Press the *"Tare"* or "*Zero*" button so the scale reads `0.00`.
    + Slowly add the solid until you reach the target number.
    + Mix the solid with a tasty wet food (applesauce, pudding, yogurt).
  ],
  [
    + Push the plunger of the syringe all the way down.
    + Put the tip into the liquid.
    + Pull back slowly to the line matching your dose. If you pull too fast, too much air can enter the syringe.
  ],
)
#v(-1em)
= Making dilutions

Sometimes the daily dose is too tiny to measure directly with a scale or syringe. To get the right amount, you must mix the food with water first. This is called a *dilution*. Below are two examples:

#block()[
  #show figure.caption: set align(left)
  #show figure.where(kind: table): set figure.caption(position: top)
  #figure(
    caption: [*Example A*: diluting a solid (e.g. peanut powder) into water],
    kind: table,
    supplement: none, // Removes the word "Table"
    numbering: none, // Removes the number "1"
    table(
      // Define column widths
      columns: (auto, auto, auto, 2fr, auto, auto),
      // Align the columns
      align: (col, row) => (
        (center, center, center, left, center, center).at(col) + horizon
      ),
      // Add padding inside cells
      inset: 8pt,
      // Remove default stroke (borders)
      stroke: 1pt + rgb("cccccc"),
      // Add the light gray background to the header row only
      fill: (col, row) => if row == 0 { rgb("e6e6e6") } else { none },
      // Header row
      table.header(
        [*Step*],
        [*Protein*],
        [*Method*],
        [*How to make mix*],
        [*Daily Amount*],
        [*Interval*],
      ),
      // Data rows
      [1],
      [1.0 mg],
      [DILUTE],
      [0.50 g of food + 15.3 ml water],
      [1 ml],
      [2-4 weeks],
    ),
  )
  #figure(
    caption: [*Example B*: diluting a liquid (e.g. almond milk) into water],
    kind: table,
    supplement: none, // Removes the word "Table"
    numbering: none, // Removes the number "1"
    table(
      // Define column widths
      columns: (auto, auto, auto, 2fr, auto, auto),
      // Align the columns: mostly centered, but the instructions are left-aligned
      align: (col, row) => (
        (center, center, center, left, center, center).at(col) + horizon
      ),
      // Add padding inside cells
      inset: 8pt,
      // Remove default stroke (borders)
      stroke: 1pt + rgb("cccccc"),
      // Add the light gray background to the header row only
      fill: (col, row) => if row == 0 { rgb("e6e6e6") } else { none },
      // Header row
      table.header(
        [*Step*],
        [*Protein*],
        [*Method*],
        [*How to make mix*],
        [*Daily Amount*],
        [*Interval*],
      ),
      // Data rows
      [1],
      [1.0 mg],
      [DILUTE],
      [0.5 ml of food + 15.3 ml water],
      [1 ml],
      [2-4 weeks],
    ),
  )
]

=== Instructions:
#v(0.5em)
#enum(
  tight: false, // Adds spacing between numbered items for readability
  spacing: 1.2em,

  [
    *Measure the Water*: \
    - Measure the exact water amount listed in "*How to make mix*" (e.g., 15.3 ml), and place in a small container. Note: you can use a combination of syringe sizes to measure. For example, to measure 15.3 ml you could use a 10 ml syringe and 1 ml syringe.
  ],
  [
    *Add the Food*: \
    - *If solid:* weigh the amount (e.g., 0.50 g). If possible, do this in a different room from the patient.
    - *If liquid:* Use a syringe to measure the volume (e.g., 0.5 ml).

    Add the food to the water you prepared in step 1.
  ],
  [
    *Mix Well*: \
    - Stir the mixture thoroughly until combined (no more large chunks). We recommend using a fork.
  ],
  [
    *Measure out the Daily Amount*: \
    - Measure the *Daily Amount* using a syringe, immediately after the mixture is thoroughly combined to prevent particles from settling. This is the amount that will actually be eaten.
    - *Important:* _Do not give more than the daily amount in a day_!
  ],
)
// #place(bottom)[
//   #warning-box("Note:")[
//     - *Sediment is normal:* For some high-fiber foods, you might see powder settle at the bottom of the mixture. This is safe to consume.
//     - *Avoid the dust:* When preparing powders, //   ]
// ]
#pagebreak()

#align(center)[
  #text(
    size: 24pt,
    weight: "bold",
  )[Giving daily doses]\
  #v(0.1pt)
  #line(length: 100%, stroke: 2pt)
]
#warning-box("READ THIS SECTION CAREFULLY.")[
  - While consistency is important for OIT, *safety is always a priority*.
  - *It is OK to miss or postpone doses if required.*
]

= Safety checklist before giving a dose

== 1. THERE ARE NO COFACTORS
#v(0.5em)
*Cofactors* are things that increase the risk of severe allergic reactions. *If any of these are present, that dose should not be given*.

#rect(width: 100%, stroke: 1pt, radius: 4pt, inset: 12pt)[
  #set list(marker: check-box)
  - Fever or severe illness. *See page X* for what to do when your child is sick.
  - Uncontrolled asthma. If you’re unsure, please inform your doctor.
  - Heavy exercise (sweating) or hot showers/baths 2 hours before and after the dose: regular play is fine.
  - Getting the dose on an empty stomach.
  - Sleep deprivation (e.g. overnight flight).
  - Symptoms of food-pipe inflammation (e.g. food getting stuck, chest pain, using more water to wash down food).
]

== 2. I HAVE THE RIGHT TIMING, EQUIPMENT, AND FOOD
#rect(width: 100%, stroke: 1pt, radius: 4pt, inset: 12pt)[
  #set list(marker: check-box)
  - The protein content per serving on the food label matches the protocol.
  - Have an Epinephrine Auto-injector (e.g. EpiPEN) available, that is up-to-date.
  - Someone is available to watch your child for at least 2 hours after the dose.
  - Your child can avoid naps or bedtime within 2 hours of dose.
]

= How to give a daily dose, once it's safe

#enum(
  spacing: 1em,
  [*Optional*: consider giving a non-drowsy antihistamine 1 hour before the dose. This is purely for symptom relief and is not mandatory],
  [*Prepare the daily dose*. Doses should be given around 22-26 hours apart, ideally at same time of day.],
  [*TIP*: if you are a very messy eater or have chapped lips, consider Vaseline around the lips/mouth first],
  [*Give the dose with a meal or light snack*! To improve the taste, we suggest mixing it with a strongly flavoured food.],
  [*Space out doses*. If you are doing OIT to multiple foods, give each food sequentially at least 1 minute apart from each other.],
)

#pagebreak()

= What to expect from the first few weeks

- Especially near the beginning of OIT, mild reactions are common, and expected. Examples of mild reactions may include mild hives around the mouth, an itchy mouth, or mild stomachache. Refer to page X for full details about what to do if there is a reaction.
- Mild symptoms can be improved / potentially prevented by taking a non-drowsy antihistamine 1 hour before the dose. They do not prevent severe reactions.

= When do we move onto the next step?

Each step has a different _protein target_. In the example below, during Step 1 the patient will eat 1.0 mg of allergen protein daily for 2-4 weeks. At some point, they will increase the dose to Step 2, which is 2.5 mg of protein daily. But when exactly are they supposed to move from one step to the next step?

#figure(
  kind: table,
  supplement: none,
  numbering: none,
  table(
    columns: (auto, auto, auto, 2fr, auto, auto),
    align: (col, row) => (
      (center, center, center, left, center, center).at(col) + horizon
    ),
    inset: 8pt,
    // Global stroke for the standard cells
    stroke: 1pt + rgb("cccccc"),
    fill: (col, row) => if row == 0 { rgb("e6e6e6") } else { none },

    table.header(
      [*Step*],
      [*Protein*],
      [*Method*],
      [*How to make mix*],
      [*Daily Amount*],
      [*Interval*],
    ),

    // --- Step 1 Row ---
    [1],
    [1.0 mg],
    [DILUTE],
    [0.20 g of food + 77 ml water],
    [1 ml],
    [2-4 weeks],

    // --- INTERSTITIAL "SPLIT" ROW ---
    table.cell(
      colspan: 6, // Span across all columns
      align: center,
      // Keep top/bottom borders to close the tables, but remove X (vertical) borders
      stroke: (
        top: 1pt + rgb("cccccc"),
        bottom: 1pt + rgb("cccccc"),
        x: none,
      ),
      inset: 1.5em,
      [
        #set text(fill: black.lighten(10%))
        #stack(
          dir: ltr,
          spacing: 0.5em,
          text(
            weight: "bold",
          )[#sym.arrow.b],
          [*For example, when should I start eating 2.5 mg of protein daily?*],
          text(
            weight: "bold",
          )[#sym.arrow.b],
        )
      ],
    ),

    // --- Step 2 Row ---
    [2],
    [2.5 mg],
    [DILUTE],
    [0.20 g of food + 30 ml water],
    [1 ml],
    [2-4 weeks],
  ),
)

#v(0.5em)
== The answer: ask your doctor, it depends.
#v(1em)
- Usually, the daily dose is _escalated_ or _'updosed'_ (increased to the next step's dose) every 2-4 weeks *if there are no/minimal reactions*. _It may take more than 4 weeks for a step for some patients_.

- There are four different approaches for dose escalation, based on patient/family/physician preference, risk profile, and resources available:
#v(1em)
#[
  #set list(spacing: 0.9em)
  #grid(
    columns: (1fr, 1fr),
    gutter: 1em,
    // Set a fixed height for the rows here.
    rows: 9.5em,

    // Card 1
    rect(
      width: 100%,
      height: 100%,
      inset: 12pt,
      radius: 4pt,
      stroke: 1pt + gray,
      [
        *A. In-clinic supervision*
        #v(0em)
        - You come to the clinic for _every_ dose increase, every 2-4 weeks.\
        - You do the rest of the step's daily maintenance doses at home.
      ],
    ),

    // Card 2
    rect(
      width: 100%,
      height: 100%,
      inset: 12pt,
      radius: 4pt,
      stroke: 1pt + gray,
      [
        *B. Virtual-assistance*
        #v(0em)
        - You increase the dose at home, but on a video call with the allergy team.
        - You do the daily maintenance doses at home.
      ],
    ),

    // Card 3
    rect(
      width: 100%,
      height: 100%,
      inset: 12pt,
      radius: 4pt,
      stroke: 1pt + gray,
      [
        *C. Home-based*
        #v(0em)
        - The very first dose is done in the clinic.
        - After that, you increase the dose at home on your own, and do the maintenance doses at home too.
      ],
    ),

    // Card 4
    rect(
      width: 100%,
      height: 100%,
      inset: 12pt,
      radius: 4pt,
      stroke: 1pt + gray,
      [
        *D. Hybrid*
        #v(0em)
        - A mix of the others. E.g. you might do early doses in-clinic, and later doses at home.
      ],
    ),
  )
]

#pagebreak()

#page(flipped: true)[
  #align(center)[
    #text(size: 24pt, weight: "bold")[Troubleshooting]\
    #v(0.1pt)
    #line(length: 100%, stroke: 2pt)
  ]
  = What if there are symptoms after a dose?

  Symptoms can be either MILD or SEVERE. Mild symptoms are expected, especially in the beginning.

  #let height = 78%
  #let mild-card(body) = {
    rect(
      width: 100%,
      height: height,
      radius: 4pt,
      stroke: (paint: black, thickness: 1pt), // Thin border
      inset: 0pt, // handle padding inside
    )[
      #block(
        width: 100%,
        inset: 12pt,
        fill: luma(240), // Very light gray header
        stroke: (bottom: 0.5pt + black),
      )[
        #set align(center)
        #text(weight: "bold", size: 1.2em)[If there are MILD Symptoms]
      ]
      #block(inset: 12pt)[#body]
    ]
  }

  #let severe-card(body) = {
    rect(
      width: 100%,
      height: height,
      radius: 4pt,
      stroke: (paint: black, thickness: 3pt), // Thick border
      inset: 0pt,
    )[
      // Inverted Header: Black background, White text
      #block(
        width: 100%,
        inset: 12pt,
        fill: black,
        radius: (top: 2pt),
      )[
        #set align(center)
        #set text(fill: white, weight: "bold", size: 1.2em)
        If there are SEVERE Symptoms
      ]
      #block(inset: 12pt)[#body]
    ]
  }

  #let icon-item(icon, term, desc) = {
    grid(
      columns: (2.5em, 1fr),
      column-gutter: 0.8em,
      align: horizon,
      image(icon, width: 100%), [#strong(term): #desc],
    )
  }

  #grid(
    columns: (1fr, 1fr),
    gutter: 1em,

    // --- MILD COLUMN ---
    mild-card([
      #v(-1em)
      _Monitor closely. Usually resolves in 30-60 mins._

      #v(0.5em)
      *What to look for:*
      #icon-item("nose.svg", "Nose", "itchy, congested, runny, sneezing")
      #v(-0.5em)
      #icon-item("skin.svg", "Skin", "mild hives, itch, redness, warmth
")
      #v(-0.5em)
      #icon-item(
        "mouth.svg",
        "Mouth",
        "throat or mouth itch, tingle, lip swelling",
      )
      #v(-0.5em)
      #icon-item("eyes.svg", "Eyes", "itchy, red, watery, swelling
")
      #v(-0.5em)
      #icon-item("gut.svg", "Stomach", "mild nausea, stomach ache, burping/gas")

      #line(length: 100%, stroke: (dash: "dashed"))

      *Action Plan:*
      - Give non-drowsy antihistamine.
      - Avoid strenuous activity for at least 2 hours.
      - Record in diary.
      - *No need* to contact doctor.
    ]),

    // --- SEVERE COLUMN ---
    severe-card([
      #v(-1em)
      *Look for ANY of the following:*
      #icon-item(
        "lungs.svg",
        "Lungs",
        "new shortness of breath, wheeze, persistent cough
",
      )
      #v(-0.5em)
      #icon-item(
        "throat.svg",
        "Throat",
        "tightness, trouble swallowing, hoarse voice",
      )
      #v(-0.5em)
      #icon-item("heart.svg", "Heart", "pale, blue, dizzy, weak pulse")
      #v(-0.5em)
      #icon-item(
        "nose.svg",
        "Other",
        "anxiety, confusion, loss of consciousness",
      )
      #v(-0.5em)
      #icon-item("gut.svg", "Stomach", "repetitive vomiting or nausea")
      #v(-0.5em)
      #icon-item("skin.svg", "Skin", "body-wide hives")
      #v(-0.5em)

      #text(size: 0.8em)[
        \* _Watch & wait if vomiting x1 or hives only_
      ]

      #line(length: 100%, stroke: (paint: black, thickness: 2pt))

      *Action Plan:*
      + #text(weight: "black", size: 1.1em)[GIVE EPINEPHRINE]
      + Call 911 / Transport to ER.
      + Lay your child flat (side if vomiting).
      + *Stop OIT* & contact doctor.
    ]),
  )
]

#pagebreak()

#page(flipped: true)[
  = What if your child is sick? SICK DAY PLAN

  Being sick can make reactions more likely to happen. Use this guide to decide if you should give the daily dose.

  #let height = 88%
  #let mild-card(body) = {
    rect(
      width: 100%,
      height: height,
      radius: 4pt,
      stroke: (paint: black, thickness: 1pt), // Thin border
      inset: 0pt, // handle padding inside
    )[
      #block(
        width: 100%,
        inset: 12pt,
        fill: luma(240), // Very light gray header
        stroke: (bottom: 0.5pt + black),
      )[
        #set align(center)
        #text(weight: "bold", size: 1.2em)[If there are MILD Symptoms]
      ]
      #block(inset: 12pt)[#body]
    ]
  }

  #let severe-card(body) = {
    rect(
      width: 100%,
      height: height,
      radius: 4pt,
      stroke: (paint: black, thickness: 3pt), // Thick border
      inset: 0pt,
    )[
      #block(
        width: 100%,
        inset: 12pt,
        fill: black,
        radius: (top: 2pt),
      )[
        #set align(center)
        #set text(fill: white, weight: "bold", size: 1.2em)
        If there are SEVERE Symptoms
      ]
      #block(inset: 12pt)[#body]
    ]
  }

  #let icon-item(icon, term, desc) = {
    grid(
      columns: (2.5em, 1fr),
      column-gutter: 0.8em,
      align: horizon,
      image(icon, width: 100%), [#strong(term): #desc],
    )
  }

  #grid(
    columns: (1fr, 1fr),
    gutter: 1em,

    mild-card([
      #set text(size: 0.95em)
      #set list(spacing: 1em)
      #v(-0.5em)
      _Generally well, but with minor symptoms._
      #v(0.5em)

      *Acceptable Symptoms:*

      - Mild cough or runny nose
      - Mild headache or tummy ache
      - *No* fever
      - *No* change in energy or appetite
      - *No* large change in behaviour
      - *No* asthma symptoms

      #v(1fr)
      #line(length: 100%, stroke: (dash: "dashed"))

      *Action Plan:*
      + #text(weight: "black")[GIVE THE DOSE]
      + Give with a solid snack.
      + *Avoid* exercise for 2 hours after the dose.
      + Optional: give a non-drowsy antihistamine 1 hour prior.
    ]),

    severe-card([
      #set text(size: 0.95em)
      #v(-0.5em)
      _Do not dose if there is *ANY* of the following:_
      #v(0.5em)

      #icon-item("fever.svg", "Fever", "Requiring treatment/medication")
      #v(-0.2em)
      #icon-item(
        "inhaler.svg",
        "Asthma",
        "Sickness causing flare, requiring >1 puff of rescue inhaler in a day",
      )
      #v(-0.2em)
      #icon-item(
        "throat.svg",
        "Throat/lungs",
        "Sore throat, persistent cough, shortness of breath",
      )
      #v(-0.2em)
      #icon-item(
        "gut.svg",
        "Stomach",
        "Vomiting, diarrhea, or severe stomach pain",
      )
      #v(-0.2em)
      #icon-item(
        "malaise.svg",
        "General",
        "Fatigued/lethargic, poor sleep/appetite, muscle aches",
      )

      #v(1fr)
      #line(length: 100%, stroke: (paint: black, thickness: 2pt))

      *Action Plan:*
      #v(0.2em)
      #box(
        fill: black,
        inset: (x: 4pt, y: 0pt),
        radius: 2pt,
        outset: (y: 2pt),
      )[
        #text(size: 1.5em, weight: "bold", fill: white)[DO NOT GIVE THE DOSE]
      ]

      #v(0.2em)
      // Restart Logic Box
      #block(
        fill: white,
        inset: 8pt,
        radius: 4pt,
        width: 100%,
        stroke: 1pt + black,
      )[
        *When to restart #underline()[once symptoms resolve]:*

        - *Missed 1-2 days of doses consecutively:* \ #v(0em) Resume same dose.

        - *Missed 3 or more days of doses consecutively:* \
          #v(0em)
          #text(weight: "black")[STOP OIT.] See page X for how to safely restart.
      ]
    ]),
  )
]
#pagebreak()

#page(flipped: true)[
  #block()[

    #let phase-header(title) = {
      block(
        width: 100%,
        fill: black,
        inset: 1em,
        radius: (top: 5pt),
        stroke: 0.5pt + black,
        below: 0pt, // connects to the content box below
        [
          #set align(center)
          #text(fill: white, size: 1.4em, weight: "black", title) \
        ],
      )
    }

    #let phase-body(body) = {
      rect(
        width: 100%,
        height: 70%,
        inset: 0.8em,
        stroke: 0.5pt + black,
        radius: (bottom: 5pt),
        fill: luma(250), // Very faint gray to differentiate from page white
        body,
      )
    }

    #let scenario-block(days, body) = {
      block(
        width: 100%,
        stroke: 0.5pt + black,
        fill: white,
        radius: 4pt,
        inset: 0pt,
        above: 0.8em,
        breakable: false,
        [
          // Header of the scenario
          #block(
            width: 100%,
            fill: luma(230), // Light gray header
            inset: 0.8em,
            stroke: (bottom: 1pt + black),
            radius: (top: 4pt),
            [
              #grid(
                columns: (1fr, auto),
                align: horizon,
                [#text(weight: "bold", size: 1.1em)[Missed #days]],
              )
            ],
          )
          #block(inset: 0.8em, above: 0.3em, body)
        ],
      )
    }

    #let arrow-down = align(center, block(
      above: 0.5em,
      below: 1em,
      stack(
        dir: ltr,
        spacing: 0.5em, // Adjust space between arrow and text
        align(horizon)[#text(size: 3em, weight: "bold")[↓]],
        align(horizon)[#v(0.2em)If no / minimal symptoms with doses],
      ),
    ))

    = What if daily doses are missed? SAFE-RESTART PLAN
    #grid(
      columns: (2fr, 1fr),
      gutter: 2em,
      [
        Tolerance to allergens drops quickly! If you miss doses, your body may slowly "forget" the protection it has built up.
        Restarting at your current daily dose could cause a reaction.

        *General Rule:* If you missed only *1-2 consecutive days*, just resume the current daily dose.\
        *The restart strategy is different if you are in the BUILD-UP or MAINTENANCE phase.*
      ],
      [
        #set align(center + horizon)
        #rect(stroke: 1pt + black, radius: 4pt, inset: 8pt)[
          *Important:* \ If your child is currently sick, \ *DO NOT* restart until well.
        ]
      ],
    )

    #v(0.3em)

    #grid(
      columns: (1fr, 1fr),
      gutter: 1em,

      [
        #phase-header(
          "If in Build-up Phase",
        )
        #phase-body([
          _Instructions based on your "Current Step" before missing doses_
          #set list(indent: 1em)
          #scenario-block("3 - 7 Days", [
            *1: Go back one step, stay for at least 3-5 days*
            #arrow-down
            *2: Return to Original Step*
            #list(
              [Stay here for *at least 2-4 weeks*.],
            )
          ])

          #scenario-block("> 7 Days", [
            *1: Go back two steps, stay for at least 3-5 days*
            #arrow-down
            *2: Increase one step, stay for at least 3-5 days*
            #arrow-down
            *Step 3: Return to Original Step*
            #list(
              [Stay here for *at least 2-4 weeks*.],
            )
          ])
          #v(-0.2em)
          #text(
            size: 1em,
            style: "italic",
          )[If you were only on the very first step (step 1), just restart whenever you child is well.]
        ])
      ],
      [
        #phase-header(
          "If in Maintenance Phase",
        )
        #phase-body([
          _Instructions based on protein amount_

          #scenario-block("3 - 7 Days", [
            *1: Reduce Dose (240 mg), stay for at least 3-5 days*
            #arrow-down
            *2: Return to Maintenance*
            #list(
              [If well, return to full *300 mg* dose long term.],
            )
          ])

          #scenario-block("> 7 Days", [
            *1: Go to low dose (160 mg), stay for at least 3-5 days*
            #arrow-down
            *2: Increase to medium dose (240 mg), stay for at least 3-5 days*
            #arrow-down
            *Step 3: Return to Maintenance*
            #list(
              [If well, return to full *300 mg* dose long term.],
            )
          ])
        ])
      ],
    )

  ]

]

#pagebreak()

= Troubleshooting other problems with daily doses

== Your child dislikes the taste:
- *Masking:* Mix the dose with strong flavours like chocolate pudding, apple sauce, cranberry juice, ketchup.
- *Temperature:* Cold foods hide taste better.

For older childen
- Recommend against hiding doses from them, which can lead to mistrust
- Use a rewards chart

== Other

#pagebreak()
#align(center)[
  #text(size: 24pt, weight: "bold")[Frequently Asked Questions]\
  #v(0.1pt)
  #line(length: 100%, stroke: 2pt)
]

= OIT in general

*Q: Do I have to take a dose every single day?*\
Yes! OIT does require a time commitment. Of course, doses might be held in the case of sickness or if it is unsafe.

*Q: What if one dose is missed? E.g. it is forgotten?*\
Do not double-dose! Resume normal dosing the next day.

*Q: Can multiple foods be treated together during OIT?*\
Yes, many patients undergo OIT to multiple foods at the same time.

*Q: Can vaccines be given during OIT?*\
Yes, there are no barriers to receiving vaccines while on OIT. However, if a fever develops (> 38.5°C) the dose should be held.

*Q: Is OIT a cure once it's finished?*\
Not exactly. It is a treatment. After finishing OIT, if you stop regularly eating the food (e.g. every week), the body can 'forget' the protection it has built-up, and the allergy may likely come back.

*Q: Can OIT be continued if I move to another province or country?*\
Probably not due to safety and medical-legal reasons. Ask your doctor / allergy team.

= About giving doses

*Q: Can the immunotherapy dose be taken on an empty stomach?*\
NO. It is *VERY IMPORTANT the dose NOT be taken on an empty stomach*. Eating a dose with snack or meal will slow digestion and absorption of the dose, which reduces the risk of reaction.

*Q: Why do I need to avoid exercise before and after the dose?*\
Vigorous exercise 2 hours before and after the dose can increase allergen absorption speed and make it easier for the body to react. This is a very common cause of reactions in OIT. For example: if the patient takes their dose at 9:00 am, they should not be exercising between 7:00 am - 11:00 am.

*Q: Can I switch brands of food?*\
Ask us first. Different brands of food can have slightly different amounts of protein or degrees of processing.

*Q: What if my child spits out all or most of their dose?*\
This is not uncommon! Don't double-dose. Simply resume the regular daily dose the next day. If this is a recurring problem contact your doctor / allergy team to discuss.

*Q: Does my child need an antihistamine EVERY time before their dose of OIT?*\
No! It is not required. However, these are very well-tolerated medications that improve your child's comfort from mild symptoms, which are expected and common during OIT, especially during the build-up phase.

- Some patients have no symptoms at all from doses and don't need any antihistamines.
- Some patients only take antihistamines before doses for the first few days of each new updose / step.
- Some patients have very infrequent mild symptoms, and only take antihistamines after mild symptoms occur

*Q: Should my child avoid NSAIDs (non-steroidal anti-inflammatory drugs) during OIT?*\
In general, NSAIDs should be avoided. While good for pain, they can make it easier for reactions to OIT doses to occur in some patients. We suggest Tylenol instead. Examples of NSAIDs include: ibuprofen (Advil, Motrin) and naproxen (Aleve).

*Q: What if my child is going to have an unrelated surgery?*\
Contact your doctor / allergy team to discuss.

*Q: What do we do if are getting on an airplane, ferry, or long form of transport*\
Contact your doctor / allergy team to discuss.

= About potential side effects

*Q: Does OIT make eczema worse*?\

- OIT is very unlikely to cause worsening of eczema. More commonly, it worsens because of non-allergic triggers - dryness, irritants, stress, etc. instead of food itself.
- The eventual benefits of OIT tend to outweigh any small short-term risk of flaring eczema.
- If eczema is severe, discuss with your primary care physician about strategies to improve it.




