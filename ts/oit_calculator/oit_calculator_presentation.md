---
title: "Oral Immunotherapy Calculator\n(& allergyguide.ca)"
sub_title: An unmet need in the wild west
author: Joshua Yu
---

# OIT Calculator

## The current landscape of OIT implementation

## Goals of this tool

## How it works: A walkthrough

## Observations about OIT; defining common implementations

## Principles of good design, and key assumptions

## The "Safety Net": Real-time validation

## Research & QI Opportunities

## Next steps

<!-- end_slide -->

# allergyguide.ca

## Goals

## Examples of content

## Next steps

<!-- end_slide -->

# The current landscape of OIT implementation

## ... is filled with substantial heterogeneity

- Progressions of protein targets, food form (e.g., powder, whole food, liquid), dilution methods, and total steps varies significantly between clinicians, even within a single food.
- _<span style="color: yellow">This heterogeneity makes standardized protocol generation a difficult problem</span>_.

## An unmet need:

> Existing tooling for generating OIT protocols are sparse and _do not offer sufficient flexibility for the diversity of protocol phenotypes seen in clinical practice_.

- While all discrete calculations for a protocol are easy/trivial, manual protocol generation is tedious and time-consuming; human error more likely
- Lack of standardization = constantly reinventing the wheel

<!-- end_slide -->

# Goals of this tool

> Simplify protocol creation, reduce manual errors, & create clear exportable plans for patients and the health team.

<!-- list_item_newlines: 2 -->

- _**<span style="color: yellow">Customizable Dose Progression</span>**_: Generate OIT protocols with editable dose progressions: sensible (but opinionated) initial defaults. Base on published papers if available.
- _**<span style="color: yellow">Diverse Food Support</span>**_: Handle both solid and liquid foods, performing automatic dilution calculations where necessary.
- _**<span style="color: yellow">Food Transitioning</span>**_: Support transitions from a primary food (Food A) to a secondary food (Food B) at a customizable threshold.
- _**<span style="color: yellow">Interactive Protocol Tables</span>**_: Fully editable tables for protocol steps, food characteristics, and dilution strategies.
- _**<span style="color: yellow">Real-time Validation</span>**_: Immediate, colour-coded warnings for potential safety or practicality concerns during protocol creation.
- _**<span style="color: yellow">Export Options</span>**_: ASCII export to clipboard and PDF export of plan for patients.

<!-- end_slide -->

# How it works: A walkthrough

<!-- list_item_newlines: 2 -->

1. **<span style="color: yellow">Select Food or Protocol:</span>** Search for a primary food (e.g., "Peanut flour"), loading a pre-existing protocol template, or make a custom food.

2. **<span style="color: yellow">Customize Protocol:</span>** Adjust Food A settings (protein concentration, form), select a dosing strategy (Standard, Slow), and modify individual steps. Optionally, add a transition to a second food (Food B).

3. **<span style="color: yellow">Review and Refine:</span>** The tool displays real-time warnings (red for critical, yellow for caution). The protocol table is fully editable.

4. **<span style="color: yellow">Export:</span>** ASCII format for EMR or patient-friendly PDF handout.

<!-- end_slide -->

<!-- jump_to_middle -->

# What is the problem space we're dealing with? OIT is so variable ...

## Some personal observations ...

<!-- end_slide -->

# Observations about OIT and defining common implementations

## There are ~~five~~ four main phenotypes of OIT

<!-- incremental_lists: true -->
<!-- list_item_newlines: 2 -->

1. _<span style="color: yellow">Food A with initial dilutions</span>_, transitioning to direct dosing once the weight of undiluted food is easily measurable.
2. _<span style="color: yellow">Food A with dilutions maintained throughout</span>_ the protocol.
3. _<span style="color: yellow">Food A with no dilutions</span>_ (e.g., using pharmacy-compounded products).
4. _<span style="color: yellow">Transition from Food A to Food B</span>_, where Food B is given directly without dilution.
5. ~~_<span style="color: yellow">Cumbersome units</span>_, ie. 1/64 of a bamba~~

> This tool is designed to handle all four of these common clinical scenarios.

<!-- end_slide -->

# Principles of tool design

> This tool will have both 1) Physician and 2) Patient/family facing UI and instructions

<!-- list_item_newlines: 2 -->

- **<span style="color: yellow">Simple and Fast:</span>** expect a standard result <span style="color: green">**should be quick**</span> with one search and click.

  - **<span style="color: yellow">To be simple and fast in a large problem space requires sensible defaults.</span>** Not everyone will agree on these defaults, <span style="color: green">but they should be easy to change</span>.

- **<span style="color: yellow">What You See Is What You Get:</span>** Most of the protocol should be manually editable _without surprising re-calculation behaviour_. That means: if you decide to shoot yourself in the foot and ask for an impossible situation, <span style="color: yellow">**you will get it**</span>.

  - **<span style="color: yellow">Freedom with safety railings:</span>** If you give a user +++ freedom, <span style="color: yellow">unintended side-effects inevitably arise</span>.
  - While we block some egregious user changes, with how variable OIT is we prefer to allow flexibility and thereafter flag potential issues with clear warnings.

<!-- end_slide -->

# Key assumptions

<!-- list_item_newlines: 2 -->

- **<span style="color: yellow">Measurement resolution and limits:</span>** Defaults to 0.01g for scales and 0.1ml for syringes; practically, I personally have found a minimum measurement of 0.2g or 0.2ml to be reasonable for measuring amounts
- **<span style="color: yellow">Limit measurements to whole numbers or single decimals if possible:</span>** for dilutions, daily amount and food mix amounts that are easily measurable (ie 0.5ml, 1 ml, ...) are given high priority. <span style="color: #ff0000">For precision, the families to have to measure the water for dilution accurately to a resolution of 0.1ml.</span>

  - **<span style="color: yellow">Daily amount for dilutions</span>**: 0.5 ml default: as simple to measure as 1 ml, easier to administer / mix with other food vehicles
  - **<span style="color: yellow">Servings for dilutions aim for 3-5</span>**: the less work families have to do, the better; however, don't want risk of spoilage.

<!-- end_slide -->

# Key assumptions

<!-- list_item_newlines: 2 -->

- **<span style="color: yellow">Dilution Mechanics:</span>** Assume negligible volume for solids in liquid if <5% w/v.

- **<span style="color: yellow">Food Data:</span>** Uses Health Canada data as base; custom foods are addable.

```json
{
  "Food": "PB&Me Powdered Natural Peanut Butter",
  "Mean protein in grams": 6,
  "Serving size": 12,
  "Type": "Solid"
}
```

- **<span style="color: yellow">Dosing Strategies:</span>** Provides three default progressions (Standard, Slow) as starting points; more are easily addable.

```ts
STANDARD: [1, 2.5, 5, 10, 20, 40, 80, 120, 160, 240, 300] 
SLOW: [ 0.5, 1, 1.5, 2.5, 5, 10, 20, 30, 40, 60, 80, 100, 120, 140, 160, 190, 220, 260, 300, ]
```

<!-- end_slide -->

# How do we calculate dilutions?

<!-- list_item_newlines: 2 -->

- For a given target protein, we algorithmically search through many possible recipes (combinations of daily amount, food amount, water amount)
- It ranks recipe higher that:
  - Respect scale/syringe resolution: based on defaults noted prior
  - Achieve protein target within relative tolerance (ie. 5%)
  - Create a mixture that lasts at least 3 servings
  - For solid dilutions, are at most 5% w/v
  - Avoids waste
- The "best" recipe is then automatically selected and displayed.

<!-- end_slide -->

# Real-time validation

> With freedom comes consequences. Protocol is re-validated on every change based on a set of rules to warn the user:

<!-- list_item_newlines: 2 -->

- <span style="color:red">**Red Warnings (Critical):**</span> For issues that are likely unsafe or impossible.
  - _Example: Dose mismatch - calculated protein dose for step differs from the intended target dose by more than the acceptable tolerance_

- <span style="color: #FFA500">**Yellow Warnings (Caution):**</span> For things that might be impractical or unusual.
  - _Example: Non-Ascending Doses, Impractical Measurements_

These checks are NOT EXHAUSTIVE. They do NOT GUARANTEE that the protocol is 'correct'.

<!-- end_slide -->

# Action items!

<!-- list_item_newlines: 2 -->

## 1. Remaining features to add:

- Review validation rules, ? others to add
  - Add yellow warnings for excessively high target protein doses (e.g., >5000mg)
- Complete patient instructions in PDF handout
  - <span style="color: #ff0000">Am I OK to adapt the current FAIT handout?</span>
- Implement current BCCH protocols and custom foods for all foods (time-intensive, wait until structure of tool solidified)

## 2. Beta test: iron out bugs / unexpected behaviours

- Ensure it works on all browsers
- Is the tool intuitive to clinicians? (So far well-received amongst fellows)

## 3. Research - QI project

- Once tool structure and main features are finalized

<!-- end_slide -->

# Research & QI Opportunities

<!-- list_item_newlines: 2 -->

### What I need:

- Direction on setting up a QI project structure wise, logistically, red-tape hoops to be aware of, connection with interested allergists (BCCH, BCSAI, ARISE), etc.
  - I don't know what I don't know
- Any direction towards financial backing? Applying for Resident Innovation Fund

<!-- end_slide -->

---

# allergyguide.ca

## Goals of allergyguide.ca

## Where we are at

## Difficulties and road-blocks

## Next steps for allergyguide.ca

<!-- end_slide -->

# Goals of allergyguide.ca

> To create a cross-Canada resident-led and faculty reviewed resource, meant for residents/fellows/early staff, or other non-allergist physicians looking to learn.

<!-- list_item_newlines: 2 -->

- Guides for major conditions, including copy-pasteable macros, patient handouts
- Guides for therapies and common medication references
- Clinical tools, consent forms
- Critical appraisal of landmark research

## secondary goals

- Informal case reports with well-defined learning points
- Patient resources translated into different languages -- also with specific geographies (ie. BC, ON, etc.)
- Setting up practice; how to bill (for fellows)
  - *** I have built in options for private/password protected content

<!-- end_slide -->

# Where we are at

<!-- list_item_newlines: 2 -->

- Site live and deployed
- Articles: mostly still in progress
- Medications: slowly being added
- Have interested residents/fellows
- Staff support: mainly reviewers (UBC faculty, respirologist in Ontario)

# What is required to make this succeed both short and long term?

- A consistent editor (Josh)
- A well-defined contributing process, with a way for non-coders to contribute
- Resident contribution across Canada
- Financial backing of some sort, ? Society backing?

<!-- end_slide -->

## Difficulties and road-blocks

- ? Barriers to accreditation with professional societies, hoops to jump through, e.g.:
  - learning objectives, CANMEDs, monitoring user progress forces us towards 'modules', which is somewhat against the spirit / goals of the project being free / open source
  - Disagreements about content, given lack of consensus for various topics.
- Financial backing

## Next steps for allergyguide.ca

### Content

- Push OIT tool live once ready
- Topics
- Drug desensitization protocol generator
  - Existing tool: https://globalrph.com/medcalcs/desensitization-protocol-12-step/
- Vaccine schedule checklist calculator: for given age range, what vaccines to check for? Checklist to put in EMR
- guideline compilation section (way to automate this?)
- Allergic rhinitis seasonal calendar for allergens: per Province
