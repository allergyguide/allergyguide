+++
title = "OIT Calculator"
description = "Generate EMR and patient ready protocols for oral immunotherapy to any food."
date = 2025-11-08
draft = false

[taxonomies]
tags = ["tools"]
[extra]
keywords = "immunotherapy"
toc = false
authors = ["Joshua Yu"]
math = true
math_auto_render = true
+++

<br>
<br>
{% admonition(type="danger", icon="info", title="TERMS OF USE") %}

**This tool is strictly for informational and planning support by qualified clinicians. It does not replace professional medical advice**. _All dosing decisions must be reviewed and confirmed by the physician responsible for the patient’s care._ See [full terms of use](/tools/resources/oit-calculator-terms/). This tool is explicitly not intended to process any PHI. **Do NOT enter any PHI**.

{% end %}

{{ oit_calculator() }}

<details>
<summary><b style="font-size: 1.7rem">How to Check Calculations</b></summary>

First determine the **Protein Concentration ({% katex(block=false) %} C_{food} {% end %})** of the food being used.

The concentration is the amount of protein in milligrams (mg) per unit (gram or ml) of the food.

{% katex(block=true) %}
C_{food} \text{ (mg/unit)} = \frac{\text{Protein per serving (g)} \times 1000}{\text{Serving Size (g or ml)}}
{% end %}

---

#### Direct Dosing

In direct dosing, the patient consumes the food without dilution. To find the mg dose ({% katex(block=false) %} P_{dose} {% end %}):

{% katex(block=true) %}
P_{dose} \text{ (mg)} = \text{Daily Amount (unit)} \times C_{food}
{% end %}

**Example:** If using a food with 10g of protein per 20g serving:

1. **Calculate Concentration:** {% katex(block=false) %} C_{food} = \frac{10 \times 1000}{20} = 500 \text{ mg/g} {% end %}.
2. **Calculate Dose:** For a daily amount of 0.24g, the protein is {% katex(block=false) %} 0.24 \text{ g} \times 500 \text{ mg/g} = 120 \text{ mg} {% end %}.

---

#### Diluted Dosing

Dilution is used for small doses. A "mixture" is created, and the patient takes a "daily amount" of that mixture.

**A. Determine Total Volume ({% katex(block=false) %} V_{total} {% end %})**

- **Solid Foods:** The tool assumes the volume of the solid is negligible as long as the _w/v_ is < 5%.
  {% katex(block=true) %} V_{total} \approx \text{Water for mixture (ml)} {% end %}
- **Liquid Foods:** The volumes are additive.
  {% katex(block=true) %} V_{total} = \text{Amount for mixture (ml)} + \text{Water for mixture (ml)} {% end %}

**B. Determine Protein in Mixture ({% katex(block=false) %} P_{mix} {% end %})**
{% katex(block=true) %} P_{mix} = \text{Amount for mixture} \times C_{food} {% end %}

**C. Calculate Final Dose ({% katex(block=false) %} P_{dose} {% end %})**
{% katex(block=true) %}
P_{dose} \text{ (mg)} = \frac{P_{mix}}{V_{total}} \times \text{Daily Amount (ml)}
{% end %}

**Example:** Using the same example food ({% katex(block=false) %} 500 \text{ mg/g} {% end %}), with 0.20g of food mixed in 10 ml of water:

1. **Total Volume:** {% katex(block=false) %} 10 \text{ ml} {% end %}.
2. **Mix Protein:** {% katex(block=false) %} P_{mix} = 0.20 \text{ g} \times 500 \text{ mg/g} = 100 \text{ mg} {% end %}.
3. **Final Dose:** For a daily amount of 1 ml, the protein is {% katex(block=false) %} \frac{100 \text{ mg}}{10 \text{ ml}} \times 1 \text{ ml} = 10 \text{ mg} {% end %}.

</details>

## References:

See the following for information on OIT implementation that this tool is based on:

{{ references(showBib=true, path="content/tools/resources/oit_calculator.bib") }}
