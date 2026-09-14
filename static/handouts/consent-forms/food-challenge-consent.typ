// from handout/, `tinymist compile consent-forms/food-challenge-consent.typ --root .`

#import "../templates/handout-base.typ": (
  fill-in, info-box, patient_handout, sig-line, standard-table, warning-box,
)
#show: patient_handout.with(last-updated: "Sep 2026")

#v(0.5em)
#align(center)[
  #text(weight: "bold", size: 18pt)[BENEFITS AND RISKS OF ORAL FOOD CHALLENGES]\
]
#line(length: 100%, stroke: 0.5pt + black)

= What is an Oral Food Challenge (OFC)?

- During an OFC, the allergist feeds you the suspect food, starting usually with a very small amount. If you have no significant symptoms, you will gradually receive larger and larger doses.
- If you show signs of a reaction, the challenge will stop.

= Benefits

- An oral food challenge is the most accurate test for seeing if you are allergic to a food.
- If you pass the oral challenge, there is no need to avoid the food in question.
- If you pass the oral challenge, there may no longer be a need to renew your epinephrine (e.g. EpiPen, Neffy).

= Risks

- *MILD allergic reactions:* This often shows up as minor skin rashes, such as hives on small areas of the body. Antihistamines are optional for mild reactions as a comfort measure.
  - The chance of a mild allergic reaction varies depending on the food or the patient.

- *SEVERE allergic reactions:* This is also called anaphylaxis. It is potentially life-threatening. It is often defined as a reaction of two or more body systems (e.g., two or more of rashes, vomiting, breathing difficulty, and decreased blood pressure). Anaphylaxis itself also has different levels of severity, but all must be treated with epinephrine.
  - The chance of a severe allergic reaction is often less than 10%, but varies depending on the food or the patient.

#warning-box(title: "Epinephrine is the ONLY treatment for anaphylaxis.")[
  Anaphylaxis must be treated with epinephrine, which comes as either an injection into the thigh muscle (same as what is in an EpiPen) or a spray up the nose (Neffy). Every oral challenge has a risk of anaphylaxis, and booking the challenge means that you agree to the possibility of receiving epinephrine. *THE ONLY MEDICATION THAT SAVES LIVES IN ANAPHYLAXIS IS EPINEPHRINE. ANTIHISTAMINES DO NOT SAVE LIVES*.
]

#info-box(title: "Understanding Mortality Rates of Anaphylaxis")[
  - Fatal anaphylaxis during an allergist-supervised OFC is *exceptionally rare*, and limited to scattered case reports worldwide.
  - For context, in the general population the mortality rate from food-induced anaphylaxis is very low, on the order of *less than 1 in 2 million per year* @pouessel_food-induced_2018 @mikhail_fatal_2021.
  - For comparison, death from anaphylaxis is _far less common_ than dying in a motor-vehicle crash, in a fire, or by homicide @umasunthar_incidence_2013.
]

= Guidelines for a Challenge

- Alert your nurse or physician immediately at the earliest sign of a possible reaction.
- If you have uncontrolled asthma or a fever from an illness on the day of the challenge, the challenge MUST be cancelled due to a higher risk of anaphylaxis.
- Oral food challenges carry a higher level of risk in those taking a beta-blocking medication (e.g., propranolol) and are sometimes deferred.
- Due to the above risks, an oral challenge *must be supervised by a trained allergist*. Other emergency medications and resuscitation equipment will be also immediately available for treating suspected reactions.

#v(1em)
#line(length: 100%, stroke: 1pt)
#v(1.5em)

#fill-in() (Last name), #fill-in() (First name) is a candidate for an oral food challenge.

- I have read and understand the benefits and risks of the oral food challenge, as described above.
- I have been given an opportunity to ask questions of my allergist.
- I understand the importance of alerting clinic staff at the earliest sign of a possible reaction.
- I understand I must stay in the clinic for the full duration of the oral challenge (2-3 hours).
- The oral food challenge is an elective procedure and can be stopped at any time, by the patient, family, or medical staff.

#v(0.5em)
#grid(
  columns: (auto, 1fr),
  gutter: 1.5em,
  align(horizon)[
    #box(width: 3.5em, height: 1.5em, stroke: (bottom: 0.5pt))
  ],
  align(horizon)[
    *Please initial:* I consent to receiving epinephrine by either injection into the thigh muscle or through intranasal epinephrine if available, in the event of a severe allergic reaction (anaphylaxis).
  ],
)

#v(1.5em)

#v(1em)
#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Patient / legal guardian (Printed name)"),
  sig-line("Patient / legal guardian (Signature)"),
)

#v(1.5em)
#grid(
  columns: (1fr, 1fr),
  gutter: 3em,
  sig-line("Witness (Printed name)"), sig-line("Witness (Signature)"),
)

#v(1.5em)
#box(width: 45%)[
  #sig-line("Date")
]

#v(1fr)
#show bibliography: set text(size: 8pt, fill: luma(100))
#bibliography("../references.bib", style: "nature", title: "References")
