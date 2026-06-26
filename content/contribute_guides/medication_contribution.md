+++
title = "Medication Card contribution guide"
date = 2025-06-24
draft = false

[extra]
toc = true
authors = ["Allergyguide"]
+++

Medications can be found in this [page here](/medications/) and are also accessible through popups {% popup() %}

{{ med_card(id="dupilumab") }}

{% end %}

- The goal is cards that are succinct and relevant, not a deep dive – the user can look at the monograph if needed for more detail.
  - What do you think would be useful to see as a quick reference? What's helpful for counseling patients?
- As such, there's a relatively standardized structure/format for medications.
  - Monographs will be statically hosted and linked. Include a link for the Health Canada monograph in your draft file.
- Medication coverage is a tricky topic: some helpful links include:
  - BC:
    - https://pharmacareformularysearch.gov.bc.ca/
    - https://www.drugsearch.ca/
    - https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/pharmacare-for-bc-residents/who-we-cover
  - ON:
    - https://lucodes.ca/
    - https://lucodes.ca/ODB
    - https://www.ontario.ca/page/get-coverage-prescription-drugs

## How to Submit

If you are a contributor, **you do not need to know how to code!**

Copy the form below into a Word document, Google Doc, etc., fill it out with the relevant clinical information, and send it to the editorial team. We will handle converting it into the website's database format. You can leave `[Optional]` fields blank at your discretion. Feel free to use bolding, italics, or bulleted lists. Include any links for sources you feel are relevant that you want in-line within the medication card.

---

## 1. Core Information

- **Generic Name (Display Name):** `[e.g., Dupilumab]`
- **Brand Name(s):** `[e.g., Dupixent]`
- **Available OTC?** `[Yes / No / Both]`
- **Drug Categories:** `[e.g., Biologic, Topical, Inhaler (something very broad)]`
- **Common Abbreviations:** `[e.g., AD = Atopic Dermatitis]`
- **Available Forms/Strengths:**
  - `[e.g., 300mg/2mL syringe]`
  - `[e.g., 200mg/1.14mL pen]`
- **Author Credits (Primary / Editor):** `[Optional]`

## 2. Clinical Pharmacology

- **Mechanism of Action:** `[Brief 1-2 sentences]`
- **Pregnancy & Lactation:** `[Provide safety summary - add links if you have them]`
- **Half-Life:** `[Optional - e.g. "~6 hours", "15 days", etc.]`

## 3. Safety & Monitoring

- **Contraindications:** `[Optional - List absolute/relative contraindications]`
- **Severe Interactions:** `[Optional - e.g., CYP3A4 inhibitors]`
- **Investigations (Before Starting):** `[Optional - e.g., Baseline CBC]`
- **Investigations (Ongoing):** `[Optional - e.g., LFTs q3 months]`

## 4. Adverse Events

- **Side Effects Summary (1-2 sentences):** `[e.g., Well tolerated. Common AE is transient injection site erythema.]`
- **Severe Side Effects:** `[Optional - include frequency if possible, any black box warnings in here, extra context]`
- **Trial Data Source/Citation:** `[Optional - e.g., 2024 Cochrane Review with link]`

_(Optional) Specific Clinical Trial Data:_
If you wish to provide specific rates from trials, list them. You don't have to do _EVERY_ one; just the clinically relevant. What do you want to know when counseling the patient?

- **Symptom:** `[e.g., Conjunctivitis]`
  - **Indication:** `[e.g., Atopic Dermatitis]`
  - **Drug Rate:** `[e.g., 10%]`
  - **Placebo Rate:** `[e.g., 2%]`
  - **Notes:** `[Optional]`

## 5. Dosing

_Please copy and paste the block below for each different indication/dose._

**Indication:** `[e.g., Asthma]`

- **Age Group:** `[e.g., Adult 18+, >=2 years]`
- **Weight Range (if applicable):** `[Optional]`
- **Dose:** `[e.g., 200mg SC q2w]`
- **Is this Off-Label?** `[Yes / No]`
- **Sample Rx:** `[Optional - e.g., Bilastine 20mg tab PO OD, 90 tabs, refills: 1]`
- **Clinical Notes/Pearls for this dose:** `[Optional]`
- **Dose Adjustments (Renal/Hepatic):**
  - _Condition:_ `[e.g., CrCl < 30]` => _Action:_ `[e.g., Avoid use]`

## 6. Clinical Pearls

_Please list any high-yield clinical pearls, tips, or tricks for this medication:_

- `[Pearl 1]`
- `[Pearl 2]`

May consider things like: need to eat with food, no need for hepatic/renal adjustment, etc.

## 7. Coverage & Cost (Canada)

- **Estimated Cost:** `[Optional - e.g., ~$100 / month, >$1000 / month, ~$15 / dose, etc. the point is give a ballpark]`

_Please list provincial coverage details below. (Copy and paste for multiple provinces, or insurers)_ You don't have to be exhaustive here - what's clinically going to be relevant for you? Medical coverage is complicated, and may also involve things like Private Insurance / Patient Support Programs.

- **Province/Insurer:** `[e.g., BC, ON, Non-Insured Health Benefits (NIHB)]`
- **Status:** `[Choose one: Covered / Special Authority / Not Covered / Mixed]`
- **Coverage Details & Requirements:**
  `[Provide criteria, EAP requirements, or links to forms here]`
  `[Provide specific criteria here, for example: lab requirements, need for failed therapies (e.g., 'failed 3 months of topical steroids'), LU codes, or links to SA/EAP forms.]`

<script src="/js/popup.js"></script>
