+++
title = "Medication Card contribution guide"
date = 2025-03-17
draft = false

[extra]
toc = true
authors = ["Allergyguide"]
+++

- Medications can be found in this [page here](/medications/) and are also accessible through popups {% popup() %}

{{ medications_toml_load(meds=["bilastine"])}}

{% end %}

- The goal is to provide cards that are succinct and relevant, not a deep dive – the user can look at the monograph if needed for more detail
- As such, there's a relatively standardized structure/format for medications
  - The editors will deal with the categories section
  - Monographs will be statically hosted and linked. Include a link for the monograph in your draft file so it can be uploaded to the site (**it should come from a government site**!!)

```toml
# All sections accept HTML aside from the pearls, which accepts markdown format
[template_med]
# [medname] must be formatted as {generic (hyphenate if combination)} with {_route} if dramatically different from oral.
# for example: [budesonide_inhaler] because the oral form is used for EoE.
# similarly, [fluticasone-furoate_inhaler] - note the hyphenation used between the drug combos.
draft = false # if false, the medication card will be rendered with a WIP sign
categories = ["testcategory"] # check with the editors for the proper category
brand_names = ["brandnameA", "brandnameB"]
cost = [
  { province = "ON", price = "~$X CAD / Ymg tab" },
  { province = "BC", price = "~$X CAD / Ymg tab" },
]
coverage = [
  { province = "ON", details = "enter details" }, # ie. ODB
  { province = "BC", details = "enter details" },
]
otc = "yes" # only 'yes' or 'no' or 'both' allowed
moa = "Insert MoA" # should be BRIEF
half_life = "~X hours"
peak_action = "Optional" # how long it takes for the medication to have its intended or maximal effect
routes = "Xmg tab; Xmg/ml liq" # include doses available for each route ie. "10/20mg tab; 2.5mg/ml liq"
doses = [
  { indication = "diseaseA", dose = "Zmg OD", notes = "ages 3-11" }, # ages should be listed as "ages X-Y", or "ages ≥X"
  { indication = "diseaseA", dose = "Zmg OD", notes = "ages ≥12; CrCl < 30" }, # separate different notes with semi-colon
  { indication = "diseaseB", dose = "Zmg BID", notes = "ages ≥18; >25kg" }, # just list weights out
]
age_group = "insert age group" # just list the ages it has been used in; this is a broad overview. you'll go into the specific ages for separate indications in the doses section
pregnancy = "insert information, can link to data/links if need be"
contraindications = "insert"
side_effects.common = "insert" # common is ≥1%; if severe list below instead; if possible list out drug vs placebo rates from the monograph, ie. "Drowsiness 3-9%[D], 2-5%[P];"
side_effects.severe = "insert" # list the probability for these
monograph_links = [
  "/monographs/example_2025_1.pdf",
] # Filenames should be formatted as: genericname_2016_1, where the year is of the last revision and the last number is if there are multiple monographs that year for that drug
abbreviations = "" # ie: "AR-allergic rhinitis; CRS-chronic rhinosinusitis; AI-adrenal insufficiency"
pearls = [
  "Insert pearl here",
]
```

Here is an example:

```toml
[bilastine]
draft = false
categories = ["2G antihistamine"]
brand_names = ["Blexten"]
cost = [{ province = "ON", price = "~$1.1 CAD / 20mg tab" }]
coverage = [{ province = "ON", details = "ODB" }]
otc = "no"
moa = "2nd gen H1 receptor antagonist"
half_life = "~15 hours"
peak_action = "~1h, rapid absorption"
routes = "10/20mg tab, 2.5mg/ml liq (uncommon)"
doses = [
  { indication = "CSU, AR", dose = "20mg PO OD to QID", notes = "ages ≥12" },
  { indication = "CSU, AR", dose = "10mg PO OD to QID", notes = "ages 4-11" },
]
age_group = "ages ≥4"
pregnancy = "Avoid (not enough data)"
contraindications = "Hypersensitivity, QT prolongation or history of torsades"
side_effects.common = "QT prolongation (at 100mg ODx4, max mean increase 6ms); drowsiness/headache ~4%[D], ~3%[P]; abdo pain 3%[D], 3%[P]"
side_effects.severe = "Torsades (extremely rare; only 1 case reported in monograph post-market reactions)"
monograph_links = ["/monographs/bilastine_2021_1.pdf"]
abbreviations = "CSU-chronic spontaneous urticaria; AR-allergic rhinitis"
pearls = [
  "Theoretically does not cross BBB; less sedating than other AHs",
  "No renal adjustments needed; minimal data with hepatic impairment but not expected to cause issues",
  "Going beyond OD is technically off-label",
  "Take without food or juice otherwise absorption impaired",
]
```

How it'll actually look:

{{ medications_toml_load(meds=["bilastine"])}}

<script src="/js/popup.js"></script>
