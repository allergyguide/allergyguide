#import "../templates/handout-base.typ": patient_handout, title
#show: patient_handout

#set page(margin: 1in)
#set text(font: "Arial", size: 9pt)
#let cb = box(width: 10pt, height: 10pt, stroke: 0.5pt)
#set table(stroke: 0.5pt)

= 1 - Topical Options (effective and cheap; safe to use under guidance)
#table(
  columns: (auto, 1fr, auto, 1fr),
  align: horizon,
  [#cb],
  [Aaron regimen\ (compound) cream],
  [#cb],
  [Aristocort R 0.1%\ cream / ointment],

  [#cb],
  [Hydrocortisone 1%\ cream / oint. / lotion],
  [#cb],
  [Mometasone 0.1%\ cream / oint. / lotion],

  [#cb],
  [Hydrocortisone 2.5%\ cream / ointment],
  [#cb],
  [Lyderm 0.05%\ cream / oint. / gel],

  [#cb],
  [Hydroval 0.2%\ cream / ointment],
  [#cb],
  [Clobetasol 0.05%\ cream / oint. / lotion],

  [#cb],
  [Desonide 0.05% cream\ / ointment],
  [#cb],
  [Ultravate 0.05%\ cream / ointment],

  [#cb],
  [Betaderm 0.1% cream /\ oint. / lotion],
  [#cb],
  [Derma-Smoothe 0.01%\ oil],
)

= 2 - Non-steroid Options (safe to use long-term but more expensive)
#table(
  columns: (auto, auto, 1fr),
  align: horizon,
  [#cb],
  [Vit B12 compound],
  [Vitamin B12 is natural and has anti-inflammatory property],

  [#cb],
  [Elidel cream],
  [May cause burning sensation for the first few days (go away eventually); if burning, 1) apply when skin cools down; 2) put cream in the fridge],

  [#cb],
  [Protopic ointment],
  [May cause burning sensation for the first few days (go away eventually); if burning, 1) apply when skin cools down; 2) put ointment in the fridge; 3) mix it with Vaseline 1:1 ratio on the palm before applying],

  [#cb],
  [Zoryve cream],
  [May take 8-12 weeks to see full results but safe long-term\ www.zoryveassist.ca follow online instruction to get the first tube for free],

  [#cb],
  [Nduvra cream],
  [May take 8-12 weeks to see full results but safe long-term\ www.mynduvra.ca follow online instruction to get the first tube for free; or ask pharmacy],

  [#cb],
  [Opzelura],
  [Without insurance, each 100 g tube is \$1000. Have not clinically relevant black box warning of risks for serious infections, major adverse cardiovascular events, clotting (thrombosis), cancer, and all-cause mortality. Only certain private insurance covers this medication],

  [#cb],
  [Eucrisa ointment],
  [Can cause significant burning, avoid this for eyelids and sensitive areas],
)

= 3 - Light Therapy
#table(
  columns: (auto, auto, auto, 1fr),
  align: horizon,
  [#cb],
  [UV\ Phototherapy],
  [2-3 times a\ week],
  [UV phototherapy is an in-office dermatology treatment where your skin is exposed to carefully controlled doses of ultraviolet (UV) light in a specialized light booth to reduce inflammation, itching, redness, and scaling. Improvement typically requires 2–3 sessions per week for at least 3 months. Appointments are quick and convenient, usually lasting just 10–15 min from arrival to departure. Minimal side effects impacting your inner organs. Location: Pacific Derm: 2425 Hemlock St \#200, Vancouver],
)

= 4 - Pill or Injection Options
#table(
  columns: (auto, auto, auto, 1fr),
  align: horizon,
  [#cb],
  [Methotrexate +\ Folic acid],
  [Orally once a week],
  [Avoid pregnancy and breastfeeding while taking this medication. Common side effects include mild fatigue and nausea, and it may occasionally cause kidney or liver irritation. Limit alcohol intake during treatment, and you'll need weekly blood tests for the first month, followed by monthly tests for the next 3 months],

  [#cb],
  [Dupixent],
  [Injection every 2 weeks],
  [Most targeted and specific medication for eczema. Very safe and do not need bloodwork to be done. Sometimes can cause eye irritation. This medication is only covered if you have non-Blue Cross health plan],
)

= 5 - Acute Flare
#table(
  columns: (auto, auto, auto, 1fr),
  align: horizon,
  [#cb],
  [Bleach bath],
  [2-3x a week],
  [Add unscented household bleach (Clorox or Javex) to the water and stir well. For a 1/4 tub full of bathwater, use 1/4 cup of bleach; for a 1/2 tub, use 1/2 cup. Soak in the bath for 10 min, then rinse off and gently pat your skin dry. Apply any prescribed creams/ointments. Do not apply bleach directly to your skin],

  [#cb],
  [Oral antibiotics],
  [Keflex / doxycycline],
  [May cause diarrhea; do not take if allergy to this medication],

  [#cb],
  [Atarax],
  [Orally at night],
  [Take at nighttime as needed to help with sleep],

  [#cb],
  [Prednisone],
  [Orally AM],
  [May increase appetite, mood swings, difficulty sleeping (take in the morning), stomach upset, and increased risk of catching a cold. Can fluctuate your sugar level if you have diabetes],
)
