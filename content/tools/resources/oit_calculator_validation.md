+++
title = "OIT Calculator Validation Rules"
date = 2025-11-22
updated = 2025-12-08
draft = false

[extra]
keywords = "OIT"
toc = true
authors = ["Joshua Yu"]
+++

Each time a protocol is loaded or edited in the OIT Calculator, it is validated against a set of rules that assess for both **critical issues** and **practical cautions**. These checks are **NOT EXHAUSTIVE** and **DO NOT GUARANTEE** the protocol is 'correct' - it _does not replace clinical judgement_. The protocol should always be checked by the physician.

- **Critical issues** represent potential serious flaws in the protocol that could compromise safety or make the protocol impossible to follow.
- **Practical cautions** are potential non-threatening issues that could be acceptable under the right clinical context, but in many circumstances may hinder implementation of the protocol or violate assumptions made by the tool.

<br>

{% admonition(type="danger", icon="danger", title="CRITICAL ISSUES") %}

**Protocol too rapid**

- A protocol with fewer than 5 steps is short for a standard full immunotherapy schedule. May be acceptable if the protocol being built is for a patient already tolerating certain doses of allergen (e.g. already finished a portion of the OIT build-up phase).

<div style="height:0.75rem;"> </div>

**Dose mismatch**

- The calculated protein dose for a given step differs from the intended target dose by more than the acceptable tolerance (typically 5%).

<div style="height:0.75rem;"> </div>

**Invalid Food Protein Content**

- A food for OIT cannot have a protein concentration of zero or a negative value. It also cannot have a protein content that exceeds the serving size (e.g., 110g of protein in a 100g serving).

<div style="height:0.75rem;"> </div>

**Invalid Dose Target**

- A step in the protocol has a target protein dose that is zero or negative. All updosing and maintenance steps must have a positive protein target.

<div style="height:0.75rem;"> </div>

**Invalid Amounts for Dosing or Mixing**

- An amount entered for a dose or for preparing a dilution (e.g., food amount, water amount) is zero or negative. These values must always be positive. A negative water amount can sometimes be calculated in liquid-in-liquid dilutions if the parameters are set incorrectly, representing an impossible scenario.

<div style="height:0.75rem;"> </div>

**Insufficient Protein in Mixture**

- When preparing a dilution, flags if the total amount of the allergenic food in the mixture is not enough to provide even a single dose of the target protein. To fix this, the amount of food used to prepare the mixture must be increased.

<div style="height:0.75rem;"> </div>

**Impossible Dilution Volume**

- The specified daily dose volume for a dilution step is greater than the total volume of the entire mixture. This is physically impossible.

{% end %}

<br>

{% admonition(type="warning", icon="warning", title="PRACTICAL CAUTIONS") %}

**Impractical Measurement**

- A calculated amount for a dose or a mixture ingredient is too small to be measured accurately with standard household tools. We have arbitrarily flagged amounts less than 0.2g (for solids) or 0.2ml (for liquids) as they are difficult to measure precisely with typical kitchen scales or oral syringes, increasing the risk of dosing errors.

<div style="height:0.75rem;"> </div>

**Non-Ascending Doses**

- A step has a lower target protein dose than the step preceding it.

<div style="height:0.75rem;"> </div>

**Mixture Provides Too Few Servings**

- A dilution mixture is calculated to yield a very low number of servings (e.g., fewer than 3).

<div style="height:0.75rem;"> </div>

**High Food-to-Water Ratio in Dilution**

- When diluting a solid food (e.g., powder) in a liquid, the calculator assumes the volume of the solid is negligible. This assumption holds for low concentrations. However, if the ratio of solid food to water becomes too high (e.g., >5% weight/volume, or >1g of food per 20ml of water), the food's volume can become significant. This may lead to a larger total volume than calculated, effectively diluting the mixture more than intended and causing the patient to be under-dosed.

<div style="height:0.75rem;"> </div>

**Food B Transition Not Met**

- A second food (Food B) and a transition threshold have been specified, but the protocol does not contain any steps that meet or exceed the dose required for the transition. To enable the transition, you must either lower the dose threshold for Food B or add higher-dose steps to the protocol.

<div style="height:0.75rem;"> </div>

**Duplicate Step**

- Two adjacent steps have the same target protein dose using the same food. This is redundant.

<div style="height:0.75rem;"> </div>

**Impractically High Daily Amount**

- A step requires a daily amount of food (liquid or solid) that exceeds practical limits (e.g., > 250 g or ml).

<div style="height:0.75rem;"> </div>

**Impractically High Mix Water**

- A dilution step requires an excessive amount of water for mixing (e.g., > 500 ml).

<div style="height:0.75rem;"> </div>

**Rapid dose progression**

- A step increases by more than double from the previous. Most protocols do not exceed this, except potentially during initial very low magnitude protein targets.

{% end %}
