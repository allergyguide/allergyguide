+++
title = "Topic contribution guide"
date = 2025-03-17
draft = false
[extra]
toc = true
authors = ["Allergyguide"]
+++

Example of a finished topic page: [Chronic rhinosinusitis](/topics/hypersensitivity/airway_ent/chronic-rhinosinusitis/).

## Rough topic structure

{% two_columns() %}

- Macro to c/p
- Summary:
  - Condition name, epidemiology, pathophysiology, manifestations, diagnosis, management.
- Summary diagram
- Definitions:
  - Things to know up front before reading the article
  - Abbreviations
- Presentation
  - Clinical: (history and exam)
  - Lab/imaging findings:
- Pathophysiology
- Diagnosis:
  - Criteria / approach
  - Differentials

<!-- split -->

- Investigations:
- Management:
  - Usual:
  - Special circumstances:
- Natural history / prognosis:
- Patient resources:
- Factoids:
- Quiz yourself:
- Further Reading:
  - clinical guidelines
  - other sources
- Authors:
  - Primary: list
  - Reviewers: list
  - Editor: list
- Conflicts of interest

{% end %}

## Other topic content specifics:

- <span class="hl-yellow">**Not all topics will fit this general structure, and it is meant as a general scaffold**</span>. If you look at [this article](/topics/hypersensitivity/airway_ent/chronic-rhinosinusitis/), you can see how the structure can be deviated (but the content remains comprehensive)
- Pearls, tips, pitfalls, etc. should be intermixed throughout the topic -- ideally, the page is not just a solid mass of bullet points
- Where possible, especially for more recent changes to guidelines, please include references. If a fact is obviously self-evident (ie. INCS is used to treat allergic rhinitis), it does not need a citation; however, a specific point-estimate should have one. This is somewhat subjective; confer with the editors and staff during the review period if questions arise
  - References should be in Vancouver format. If you are writing your rough draft in Google Docs, please use a citation manager -- **having the correct numbers for in-text citations makes it MUCH easier** to port the references to the website
  - If there are particular references that are very high yield, feel free to include a small blurb about them (it will show up in the reference icon, as such: <span class="references">2</span>)
- If you need to list a specific prescription, format as "ExRx: Nasonex 2 sprays EN BID" (ExRx = Example Prescription)
  - If possible, you can also list a 'med-popup' linking to a relevant medication card. For example: {% popup() %}

{{ medications_toml_load(meds=["bilastine"])}}

{% end %}

- If possible for key management options, there should be a 'drop box' for a deeper dive into the evidence: specifically, any relevant point estimates that would be useful for patient counseling. For example:

{% dropdown(header="DEEP-DIVE: Efficacy of INCS in CRSwNP") %}

Here you would put the evidence behind a study (ideally a systematic review or meta-analysis) that contains <b>data relevant to patients</b><span class='references'>2</span>
<br>

<ul>
<li> What's the bottom line of the research?</li>
<li> What outcomes were studied, and population?</li>
<li> What are relevant concrete data points?</li>
<li> Is this evidence "strong"? This is a very nuanced point (and there are frameworks such as GRADE for this). You shouldn't spend a LOT of time on this up-front; while interpretation of complex research is crucial, it's not the main point of this project</li>
</ul>

<br>

{% end %}

## Macros

Macros exist at the top of the topic page. While not all topics need a macro, most will. It has 2 sections:

- relevant HPI
- Family doctor focused blurb about the condition (ie. pathophys, prognosis), investigations, management recommendations

FORMAT:

- The first section will be relevant HPI
- The Impression and plan MUST be styled as follows:

  ```txt
  # Topic name: blurb about the topic is either after the topic name, or below in plain text (see the example)
  * Investigations are prepended with a *
  > Management is prepended with a >
  - if you require additional context or writing, use a -
  ```

Example:

{{ load_macro(topic_name = "chronic_rhinosinusitis") }}

## Patient handouts/resources

If applicable, each topic should have an accompanying printable patient resource: [see this example](/handouts/chronic-rhinosinusitis/).

- It should be written at a 6th grade level or lower
- Use of tables, diagrams is highly encouraged
- Often, use of LLMs such as ChatGPT are quite helpful at this stage to reword with simpler language

## Styling of topic pages

{% admonition(type="danger", icon="info", title="Don't just use plain-text") %}

Within a topic page, there are many ways to customize the text: in particular, **Markdown** and **Shortcodes**.

{% end %}

### Markdown

- See [this link](https://www.writethedocs.org/guide/writing/markdown/) for a great introduction to the Markdown format
- For your purposes, **you do not have to know Markdown itself very well** -- it is more important you know that the website renders Markdown. This means that you are able to use _italics_, **bolded words**, ~~strike-through-text~~, and links such as the one before. Lists and bullet points will also render as you expect. Different title headers can be achieved with [# signs](https://www.writethedocs.org/guide/writing/markdown/#headers)
- Make good use of <span class='hl'>highlights as well</span>
- You can also make tables in Markdown, though they do not look the best and cannot be too complicated:

  | Name   | Comment                                                                 |
  | :----- | :---------------------------------------------------------------------- |
  | Alice  | Always involved in various communications                               |
  | Bob    | A good guy, who likes to communicate with Alice                         |
  | Malroy | Not so nice guy. Tries to mess with the communication of Alice and Bob. |

  - This doesn't mean we can't accommodate more complex tables (ie with nesting), but it does mean editors need to manually code it in

### Shortcodes

- Shortcodes are custom pieces of styled HTML (and sometimes JavaScript). You can use any of the shortcodes below as you like for a topic
- Each can serve a different purpose, and helps break up plain-text into more manageable sections
- You don't have to know how to implement them -- one of the editors who knows how to code will do it for you. Just indicate in your draft document what shortcode you want, and the information you need in it. If you're interested in the actual code, [check out the GitHub](https://github.com/allergyguide/allergyguide/tree/main/templates/shortcodes)

#### Admonitions

Admonitions are boxes that are intended to **highlight an important fact for the reader**. There are a variety of styles and icons that can be used. Options for type/icon: note, tip, info, warning, danger, and pearl. These can be mixed and matched. The title of each admonition can be changed to any text.

{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon, and the title DANGER.
{% end %}

{% admonition(type="warning", icon="warning", title="WARNING") %}
This is a warning admonition with a warning icon, and the title WARNING.
{% end %}

{% admonition(type="info", icon="info", title="INFO") %}
And so forth.
{% end %}

{% admonition(type="tip", icon="tip", title="TIP") %}
And so forth.

{% end %}

{% admonition(type="note", icon="note", title="NOTE") %}
And so forth.

{% end %}

{% admonition(type="pearl", icon="pearl", title="PEARL") %}
And so forth.

{% end %}

{% admonition(type="note", icon="question", title="MIXUP") %}
This is a note admonition with a question icon and the title MIXUP.

{% end %}

#### Question

Insert questions with hidden answers. Click the blurred section to reveal it.

{% question(question="A 27 year old female presents to clinic with complaints of frequent infections. She has had 3 episodes of pneumonia confirmed by XR over the past 3 years as well as 2 episodes of sinusitis requiring a short course of antibiotics. She has no relevant family history and no symptoms of asthma or SOB. **What is the most appropriate test to consider?**<br><br>a) Serum immunoglobulins<br>b) Blood cultures") %}
Serum immunoglobulins is the correct answer. CVID is the most likely diagnosis from the stem, and it requires...
{% end %}

#### text_image

Sometimes you want to show an image and text to one side of it. You have two options:

{% text_image(src="/images/example.png", alt="An image description", caption = "test caption") %}
_Here is some text_ on the left.

{% question(question="**Can you also add questions on the side?**") %}
Yes!
{% end %}

{% end %}

{% text_image(text_position = "right", src="/images/example.png", alt="An image description", caption = "test caption") %}
_Here is some text_ on the right.

{% admonition(type="tip", icon="tip", title="You can add admonitions here too!") %}
This is helpful if there's something you really want to call someone's attention too!
{% end %}
{% end %}

#### two_columns

Sometimes you want two columns to place text in.

{% two_columns() %}
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum

<!-- split -->

{% admonition(type="tip", icon="tip", title="You can add admonitions here too!") %}
This is helpful if there's something you really want to call someone's attention too!
{% end %}

<br>

{% admonition(type="pearl", icon="pearl", title="A rare clinical pearl") %}
Benadryl is not a fantastic antihistamine to use :)
{% end %}

{% end %}

#### references

References are embeddable! Provide the editor a Bibtex file (file extension .bib) and let them know where each citation should be. Here is an example application:

This sentence needs two references <span class="references">yu_trends_2024, stehlin_guiding_2025</span>. Here is another sentence with one reference <span class="references">yu_trends_2024</span>.

... rest of document

{{ references(showBib=true, path="content/example.bib") }}

#### custom_macro

You can create custom copy-paste macros if you need to.

{% custom_macro() %}
Here is a custom macro copy paste section
{% end %}

#### load_macro

You can also load any macros from the offical macro 'repo' [here](https://github.com/allergyguide/allergyguide/blob/main/static/toml/topic_macros.toml)

{{ load_macro(topic_name = "chronic_rhinosinusitis") }}

#### contributors

A small cut-out for contributors. This may be removed in the future.

{{ contributors(authors=["Alice Smith", "Bob Johnson"], editors=["Charlie Brown"], staff_reviewers=["David Lee"]) }}

#### timeline

{% timeline() %}
[{
"title":"Lorem Ipsum Event",
"body":"Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
"date":"Jul-2023"
},
{
"title":"Lorem Ipsum event 2",
"body":"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
"date":"Jun-2022"
}]
{% end %}

#### dropdown

Dropdowns are useful if you want to host information in more depth without taking up more space. For example, deep dives into the evidence behind a management option, listing the detailed options for a particular class of medication, etc.

{% dropdown(header="this is what the user will click on to get more info") %}
This text will appear in the dropdown

<a href="allergyguide.ca">link</a>

{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon.

{% end %}

{% end %}

#### mermaid

mermaid diagrams are interesting to use but not mandatory. If you want to explore and use these, check out their [documentation](https://mermaid.js.org/intro/).

```md
{%/* mermaid() */%}

sequenceDiagram
Alice ->> Bob: Hello Bob, how are you?
Bob-->>John: How about you John?
Bob--x Alice: I am good thanks!
Bob-x John: I am good thanks!
Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.

    Bob-->Alice: Checking with John...
    Alice->John: Yes... John, how are you?

{%/* end */%}
```

{% mermaid() %}
sequenceDiagram
Alice ->> Bob: Hello Bob, how are you?
Bob-->>John: How about you John?
Bob--x Alice: I am good thanks!
Bob-x John: I am good thanks!
Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.

    Bob-->Alice: Checking with John...
    Alice->John: Yes... John, how are you?

{% end %}

<script src="/js/popup.js"></script>
