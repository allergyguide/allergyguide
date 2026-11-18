+++
title = "OIT Calculator"
description = "Generate EMR and patient ready protocols for oral immunotherapy to any food."
date = 2025-11-08
draft = false

template = "oit_page.html"
path = "oit"

[taxonomies]
tags = ["tools"]
[extra]
keywords = "immunotherapy"
tool_name = "oit_calculator"
changelog = "@/tools/resources/oit_calculator_changelog.md"
terms = "@/tools/resources/oit_calculator_terms.md"
disclaimer = "Strictly for informational and planning support by qualified health care professionals. All dosing decisions must be confirmed. Not for PHI."
toc = false
authors = ["Joshua Yu"]
math = true
math_auto_render = true
+++

{{ <oit_calculator /> }}

<div class="clinical-app-prose">

<details id="how-to-check-calculations">
<summary><b style="font-size: 1rem">How to Check Calculations</b></summary>

First determine the <b>Protein Concentration ($ C_{food} $)</b> of the food being used.

The concentration is the amount of protein in milligrams (mg) per unit (gram or ml) of the food.

{% <katex block={true}> %}
C_{food} \text{ (mg/unit)} = \frac{\text{Protein per serving (g)} \times 1000}{\text{Serving Size (g or ml)}}
{% </katex> %}

---

#### Direct Dosing

In direct dosing, the patient consumes the food without dilution. To find the mg dose ($ P_{dose} $):

{% <katex block={true}> %}
P_{dose} \text{ (mg)} = \text{Daily Amount (unit)} \times C_{food}
{% </katex> %}

**Example:** If using a food with 10g of protein per 20g serving:

1. **Calculate Concentration:** $ C_{food} = \frac{10 \times 1000}{20} = 500 \text{ mg/g} $.
2. **Calculate Dose:** For a daily amount of 0.24g, the protein is $ 0.24 \text{ g} \times 500 \text{ mg/g} = 120 \text{ mg} $.

---

#### Diluted Dosing

Dilution is used for small doses. A "mixture" is created, and the patient takes a "daily amount" of that mixture.

**A. Determine Total Volume ($ V_{total} $)**

- **Solid Foods:** The tool assumes the volume of the solid is negligible as long as the _w/v_ is < 5%.
  {% <katex block={true}> %} V_{total} \approx \text{Water for mixture (ml)} {% </katex> %}
- **Liquid Foods:** The volumes are additive.
  {% <katex block={true}> %} V_{total} = \text{Amount for mixture (ml)} + \text{Water for mixture (ml)} {% </katex> %}

**B. Determine Protein in Mixture ($ P_{mix} $)**
{% <katex block={true}> %} P_{mix} = \text{Amount for mixture} \times C_{food} {% </katex> %}

**C. Calculate Final Dose ($ P_{dose} $)**
{% <katex block={true}> %}
P_{dose} \text{ (mg)} = \frac{P_{mix}}{V_{total}} \times \text{Daily Amount (ml)}
{% </katex> %}

**Example:** Using the same example food ($ 500 \text{ mg/g} $), with 0.20g of food mixed in 10 ml of water:

1. **Total Volume:** $ 10 \text{ ml} $.
2. **Mix Protein:** $ P_{mix} = 0.20 \text{ g} \times 500 \text{ mg/g} = 100 \text{ mg} $.
3. **Final Dose:** For a daily amount of 1 ml, the protein is $ \frac{100 \text{ mg}}{10 \text{ ml}} \times 1 \text{ ml} = 10 \text{ mg} $.

</details>

## References:

See the following for information on OIT implementation that this tool is based on:

{{ <references showBib={true} path="content/tools/resources/oit_calculator.bib" /> }}

</div>
