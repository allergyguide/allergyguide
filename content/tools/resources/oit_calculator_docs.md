+++
title = "Oral Immunotherapy Calculator Documentation"
date = 2025-11-23
draft = false

[extra]
toc = true
authors = ["Joshua Yu"]
+++

## 1. Overview and Rationale (Non-Technical)

Oral Immunotherapy (OIT) is a treatment for IgE-mediated food allergies that involves gradually introducing increasing amounts of allergen to desensitize the patient. Implementing effective OIT protocols for at-home use by patients and their families requires careful planning; however, existing tooling for generating OIT protocols are sparse and do not offer sufficient flexibility for the diversity of protocol phenotypes seen in clinical practice.

This open-source tool aims to addresses these challenges by providing a robust and flexible platform to generate safe and customizable OIT protocols. It aims to simplify protocol creation, reduce manual errors, and support clinicians and patients with clear, exportable, and verifiable plans.

**Key Capabilities:**

- **Customizable Dose Progression:** Generate OIT protocols with configurable dose progressions, with sensible initial defaults based on existing published literature.
- **Diverse Food Support:** Handle both solid and liquid foods, performing automatic dilution calculations where necessary.
- **Food Transitioning:** Support transitions from a primary food (Food A) to a secondary food (Food B) at a customizable threshold.
- **Interactive Protocol Tables:** Fully editable tables for protocol steps, food characteristics, and dilution strategies.
- **Real-time Validation:** Immediate, colour-coded warnings for potential safety or practicality concerns during protocol creation.
- **Export Options:** ASCII export to clipboard and PDF export of plan for patients.

### 1.1 There is substantial variability in OIT implementation

OIT protocols involve a series of increasing allergen doses over time. The specific progression of protein targets, food form (e.g., powder, whole food, liquid), dilution methods, and total steps can vary significantly between clinicians, even within a single food. This heterogeneity makes standardized protocol generation difficult: while the calculations are easy, there are many steps and repetitions: manual methods are time-consuming and are more prone to human error.

From personal experience:

- OIT is done many different ways
- Current approaches do not handle this complexity and diversity well enough to provide an efficient way to individualize protocols easily for patients
- Manual calculations are easy but very time consuming, and there are many variables, heuristics, and assumptions to keep in mind that don't appear in calculations - what is a practical dose to aim for? Should I keep the daily dose consistent? What are the limits of my instrument resolution? As a rule of thumb what should I am for in dilutions? There are MANY possible solutions.
- => need opinionated tool in some ways to select certain solutions out of many and present them in a neat, easily editable way

### 1.2 Underlying Assumptions and Defaults

The calculator operates based on a set of clinical and practical assumptions to ensure generated protocols are both safe and measurable in a home setting:

- **Dosing Strategies:** Three common protein dose progression strategies are provided as starting points: Standard, Slow, and Rapid. These can be adjusted by the user, but also on the backend (ie. new starting strategies can be added to the tool). The standard progression comes directly from published papers.
  - **Standard** (11 steps): [1, 2.5, 5, 10, 20, 40, 80, 120, 160, 240, 300] mg
  - **Slow** (19 steps): [0.5, 1, 1.5, 2.5, 5, 10, 20, 30, 40, 60, 80, 100, 120, 140, 160, 190, 220, 260, 300] mg
- **OIT Phenotypes:** We assume four main OIT implementation types based on the author's observations:
  1. _Food A with initial dilutions_, transitioning to direct dosing once the weight of undiluted food is easily measurable. By default, that threshold is set at 0.2 grams or 0.2 ml.
  2. _Food A with dilutions maintained throughout the protocol._
  3. _Food A with no dilutions_. Usually not feasible especially with low dose steps; can be done if compounded by pharmacy but not widely available.
  4. _Transition from Food A to Food B_, where Food A can follow any of the above dilution strategies. Food B is assumed to always be given directly without dilution. Food B is switched to once the weight of undiluted food is easily measurable: by default, that threshold is 0.2 grams or 0.2 ml.
- **Dilution Mechanics:**
  - For solid foods diluted in liquid, the volume contribution of the solid is considered negligible if its weight-to-volume ratio is below 5%. This threshold is arbitrary and later can be adjusted if required. For example: if 1 ml of a solution of 0.2g of peanut powder in 40ml of liquid is given, we assume that only 0.2g * 1/40 = 0.005g is actually ingested.
  - For liquid foods, the volume contribution of the food is considered non-negligible in calculations.
  - Dilution calculations prioritize practical patient measurements (e.g., minimum measurable mass/volume by standard scales/syringes - see below). They also aim to make at least 3 servings of daily doses for ease of use.
- **Measurement resolution:** We assume default precision settings for scales (0.01g resolution) and syringes (0.1ml resolution).
- **Practical minimum measurements:** We assume the minimum measurable mass and volume are 0.2g and 0.2ml, respectively. This is arbitrary but comes from personal experience.
- **Validation:** Because of the freedom provided to the user to edit a protocol, unintended side-effects inevitably can arise despite best efforts to programmatically limit 'unreachable' or 'unrealistic' scenarios. Protocols are therefore continuously validated against a set of rules (critical "red" warnings and cautionary "yellow" warnings) to highlight potential issues _without blocking_ the user's workflow. Detailed validation rules are available [here](@/tools/resources/oit_calculator_validation.md). These validation rules **ARE NOT EXHAUSTIVE** and it is stressed that the tool user still has to self-verify the outputs.
- **Pre-defined Foods:** The tool utilizes food protein data from Health Canada's Canadian Nutrient File (2015). If an actual Nutrition Facts label is available, it should ALWAYS be used for accuracy. The original CNF 2015 dataset does not specify what is a solid versus a liquid, and _that characteristic has been added in with an error-prone method_. An assumption is made that for liquids, 100g is approximately equivalent to 100ml for protein concentration purposes; however, users should verify this in practice.
- **Pre-defined protocols:** existing protocols with real-world use can be added on the backend and be available for search. These protocols are loaded 'as-is', but can still be edited by the user after.

### 1.3 User Workflow

1. **Select Food A or Pre-existing Protocol:** Begin by searching for a primary food (Food A) or loading a pre-existing protocol template. Users can also define custom foods.
2. **Customize Protocol:** Adjust Food A settings (name, protein concentration, form, dilution strategy, threshold), select a dosing strategy (Standard, Slow, Rapid), and modify individual steps. Optionally, add a transition Food B, whose settings (name, protein concentration, form, threshold) can also be customized. A custom note can also be added.
3. **Review and Refine:** The tool displays real-time warnings (red for critical, yellow for caution) and can edit the protocol as required to fix these.
4. **Export:** Once satisfied, export the protocol in ASCII format or as a PDF for patient handout.
