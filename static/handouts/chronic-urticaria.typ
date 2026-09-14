#import "templates/handout-base.typ": (
  info-box, patient_handout, standard-table, warning-box,
)
#show: patient_handout.with(last-updated: "Sep 2026")

#set page(
  footer: [
    #line(length: 100%, stroke: 0.5pt + black)
    #align(center)[
      #text(size: 8pt)[
        Handout for informational purposes only. © 2026 allergyguide. Licensed under CC BY 4.0. | Images sourced from DermNet (dermnetnz.org).
      ]
    ]
  ],
)

#v(0.5em)
#align(center)[
  #text(weight: "bold", size: 18pt)[CHRONIC URTICARIA (HIVES)]\
]
#line(length: 100%, stroke: 0.5pt + black)

== What are Hives (Urticaria) and Angioedema?

#grid(
  columns: (1fr, 33%),
  gutter: 1em,
  [
    Hives are raised or puffy areas of the skin that are itchy. *They are by definition transient*: in general, hives should appear and disappear within several hours, or up to a day.

    Hives occur when immune cells in your skin called mast cells are activated and release natural chemicals; the main culprit is *histamine*. Histamine can also result in deeper swelling, called *angioedema*, in around half of patients with hives.

    #v(0.5em)
    #warning-box(title: "What is NOT consistent with hives?")[
      - If you have an individual 'hive' that is persistent and does not go away after 1–2 days, it is *extremely unlikely* to be a hive!
      - Severe pain, blistering, bruising of skin, and scarring after the hive leaves (assuming no significant scratching) *are NOT typical* and require a different workup.
    ]
  ],
  align(center)[
    #v(-2em)
    #image("assets/hives-dermnet.jpg", width: 100%)
    #v(-0.8em)
    #text(size: 0.9em, style: "italic")[Hives (Urticaria)]
    #v(0.5em)
    #image("assets/angioedema-dermnet.jpg", width: 100%)
    #v(-0.8em)
    #text(size: 0.9em, style: "italic")[Angioedema of the lips]
  ],
)

#v(-0.75em)
== What is Chronic Spontaneous Urticaria (CSU)?

CSU is diagnosed when someone develops recurrent generally random hives (and sometimes swelling) for >6 weeks.

While we do not fully understand the exact mechanisms, it is thought to be due to an autoimmune process. Your body produces antibodies which normally help fight infections, but are instead triggering your allergy cells to release histamine. *It is not from food or environmental allergens*.

#info-box(title: "Key Facts about CSU")[
  - *It is benign.* In the vast majority of patients, _it is not dangerous or life-threatening_.
  - *It is not contagious.*
  - *It resolves spontaneously.* \~50% of people outgrow CSU within a few years or sooner.
  - *It is treatable.* Bothersome symptoms are controllable with medication until it resolves.
]

== What are things that can make hives worse?

These are things that usually don't cause hives, but may flare them / make them harder to control:

#grid(
  columns: (0.2fr, 1fr),
  gutter: 1em,
  [
    - Alcohol
    - Opiates
    - Stress
  ],
  [
    - Menstrual periods
    - NSAIDs (i.e. ibuprofen, naproxen, diclofenac). *Use Tylenol instead!*
  ],
)

#pagebreak()

== What is Chronic Inducible Urticaria (CIU)?

#grid(
  columns: (1fr, 35%),
  gutter: 1em,
  [
    CIU occurs when *physical triggers* make your allergy cells release histamine. It can coexist with CSU.

    - *Examples:* Cold, increase in body temperature (sweating, hot showers, exercise), delayed pressure (e.g., carrying a heavy bag), or scratching the skin (_dermatographia_).
    - *Duration:* While CSU is usually shorter-lived, CIU tends to persist for several years *longer* than CSU on average.
  ],
  align(center)[
    #v(-1.5em)
    #image("assets/dermatographia-dermnet.jpg", width: 100%)
    #v(-0.5em)
    #text(size: 0.9em, style: "italic")[Dermatographia]
  ],
)
#v(-1.5em)

== How are chronic hives treated?

Unfortunately, at this time there is no quick cure for CSU/CIU. They are managed by treating the hives until it naturally resolves.

The following *non-sedating antihistamines* can be used to treat the hives and swelling. A *higher dose (up to 4x the regular amount)* may be needed for adequate control. Antihistamines are most effective if taken on a daily basis to _prevent_ the development of the hives and swelling. They are not as effective if taken only after the hives develop.

#v(-1em)
#align(right)[#text(size: 0.8em, style: "italic")[These are *adult* doses.]]
#v(-0.75em)
#standard-table(
  columns: (1.5fr, 1fr, 1fr, 1fr),
  align: (left, left, right, right),
  [*Generic Name*],
  [*Brand Name*],
  [*Standard Dose*],
  [*Max Daily Dose*],
  [loratadine],
  [Claritin],
  [10 mg],
  [40 mg],
  [desloratadine],
  [Aerius],
  [5 mg],
  [20 mg],
  [fexofenadine],
  [Allegra 24-hour],
  [120 mg],
  [480 mg],
  [cetirizine (prescription/OTC)],
  [Reactine],
  [10 mg],
  [40 mg],
  [bilastine (prescription)],
  [Blexten],
  [20 mg],
  [80 mg],
  [rupatadine (prescription)],
  [Rupall],
  [10 mg],
  [40 mg],
)

#text(size: 0.9em)[
  #underline()[*If max-dose daily antihistamines aren't working, discuss second-line options with your doctor.*]
]

== Are higher doses of non-drowsy antihistamines safe long-term?

*Yes*. Studies have shown that taking higher doses of these antihistamines long-term (e.g., for 6 months or longer) is both safe and effective for treating chronic spontaneous urticaria @zhang_long-term_2020 @zuberbier_international_2026. The commonest side effect at higher doses is drowsiness, and serious side effects are extremely rare.

== Tapering your antihistamine dosing, once hives are controlled

If symptoms are completely controlled (no hives or swelling) for *3 to 6 months*, you can attempt to step down your dose (i.e. 4 pills daily -> 3 pills daily). If you relapse and the hives return, resume your last effective dose for another 3 to 6 months before trying to lower it again.

#v(1fr)

#show bibliography: set text(size: 7pt, fill: luma(100))
#bibliography("references.bib", style: "nature", title: none)
