+++
title = "Shortcodes"
description = "Testing of shortcodes"
date = 2024-11-24
updated = 2025-02-07
draft = false
in_search_index = false
template = "pages.html"
+++

## Highlights

Not a shortcode but still useful. You have several colours to choose from:

- This shows off the <span class="hl-yellow">yellow and</span> <span class="hl-green">green ones</span>
- This is for the <span class="hl-pink">pink and</span> <span class="hl-red">red ones</span>
- This is for the <span class="hl-blue">blue ones</span>

See below for Markdown syntax used for the custom shortcodes used in this website.

## Re: nesting shortcodes

The below code does not work:

```md
{%/* warning(header = "warning header") */%}

{{ warning_box_only(body="# nested warning!") }}

{%/* end */%}
```

It will instead throw this error:

```zsh
Error: Reason: Failed to render 'shortcodes/warning.html'
Error: Reason: Filter call 'markdown' failed
Error: Reason: Failed to render markdown filter: Failed to render warning_box_only shortcode

Caused by:
    0: Failed to render 'shortcodes/warning_box_only.html'
    1: Filter 'markdown' not found
```

Calling {{/* warning_box_only(body="nested warning!") */}} is essentially asking to inject html in place of the shortcode. However, if you look at warning_box_only.html:

```html
<blockquote class="warning_box_only">
  <div class="content">
    {{ body | markdown | safe }}
  </div>
</blockquote>
```

it is expecting the body to be MARKDOWN, not HTML. If you remove the markdown filter from warning_box_only.html, then it will work -- but the markdown within the warning_box_only will not be rendered properly.

## Custom boxes

### important

```md
{%/* important(header = "important header") */%}
test
Press <kbd>CTRL+ALT+Delete</kbd> to end the

So it turns out you CAN put shortcodes inside other shortcodes, but it cannot be the % % with a body type.
{{ contributors(authors=["Alice Smith", "Bob Johnson"], editors=["Charlie Brown"], staff_reviewers=["David Lee"]) }}
{%/* end */%}
```

{% important(header = "important header") %}
test
Press <kbd>CTRL+ALT+Delete</kbd> to end the

So it turns out you CAN put shortcodes inside other shortcodes, but it cannot be the % % with a body type.
{{ contributors(authors=["Alice Smith", "Bob Johnson"], editors=["Charlie Brown"], staff_reviewers=["David Lee"]) }}

{% end %}

### warning

```md
{%/* warning(header = "warning header") */%}
This is a warning section.

Here is an attempt at the % % nested shortcode.
{% important_box_only() %}
important bx only!!!
{% end %}
{%/* end */%}
```

{% warning(header = "warning header") %}
This is a warning section.

Here is an attempt at the % % nested shortcode.
{% important_box_only() %}
important bx only!!!
{% end %}
{% end %}

### question

```md
{%/* question(question= "this is the question. now lets make it very long to the point where it probably needs to wrap around because its so large and fat and i hope this doesn't look bad.<br><br>1) this or that<br>2)this") */%}

This is the question answer

{%/* end */%}
```

{% question(question= "this is the question. now lets make it very long to the point where it probably needs to wrap around because its so large and fat and i hope this doesn't look bad.<br><br>1) this or that<br>2)this") %}
This is the question answer
{% end %}

### important_box_only

```md
{%/* important_box_only() */%}

important bx only!!!

{%/* end */%}
```

{% important_box_only() %}
important bx only!!!
{% end %}

### warning_box_only

```md
{%/* warning_box_only() */%}

warning box only content

{%/* end */%}
```

{% warning_box_only() %}
warning box only content
{% end %}

## admonition

Credit to [tabi](https://welpo.github.io/tabi/blog/shortcodes/#admonitions) for the styling. It's more pleasant colour scheme wise and it changes with the light/dark mode.
Options for type/icon: note, tip, info, warning, danger, pearl, question (only the icon)

These can be mixed and matched.

```md
{%/* admonition(type="danger", icon="danger", title="Warning DANGER") */%}
This is a danger admonition with a danger icon.

**Markdown can be used here :)**
{%/* end */%}
```

{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon.

**Markdown can be used here :)**
{% end %}

{% admonition(type="danger", icon="flag", title="DANGER") %}
There's also a FLAG icon you can add as well!
{% end %}

{% admonition(type="warning", icon="warning", title="WARNING") %}
Blah blah here is a wall of text wall of text Blah blah here is a wall of text wall of text Blah blah here is a wall of text wall of text Blah blah here is a wall of text wall of text
{% end %}

{% admonition(type="info", icon="info", title="INFO") %}
BLah blah
{% end %}

{% admonition(type="tip", icon="tip", title="TIP") %}
Blah blah
{% end %}

{% admonition(type="note", icon="note", title="NOTE") %}
blah blah
{% end %}

{% admonition(type="note", icon="question", title="question icon") %}
blah blah
{% end %}
We also have the elusive pearl mode:

```md
{%/* admonition(type="pearl", icon="pearl", title="PEARL") */%}

Insert sage clinical pearl

{%/* end */%}
```

{% admonition(type="pearl", icon="pearl", title="PEARL") %}
Insert sage clinical pearl
{% end %}

## text_image

Of note; you cannot nest a shortcode easily within a shortcode. Ie. I could not use {{ shortcode }} within the text image to right text.

```md
{%/* text_image(src="/images/example.png", alt="An image description", caption = "test caption") */%}

_Here is some text_ on the left.</br><kbd>CTRL+ALT+Delete</kbd>

{%/* end */%}
```

{% text_image(src="/images/example.png", alt="An image description", caption = "test caption") %}
_Here is some text_ on the left.</br><kbd>CTRL+ALT+Delete</kbd>

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque lacinia malesuada dolor, nec hendrerit nibh mattis vitae. Pellentesque mollis justo ac nisi accumsan molestie. Nulla vel sem velit. Quisque lacus erat, condimentum sit amet pellentesque eu, fringilla ut lacus. Vivamus sed fermentum ligula. Integer finibus nulla eu libero pulvinar vestibulum. Nunc sit amet ligula a ipsum fermentum pellentesque at vel mauris. Etiam vitae eros non ante congue tempor. Suspendisse ac tincidunt nisi. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam felis magna, tempus ut arcu tincidunt, vehicula egestas sem. Suspendisse id luctus odio, ac pellentesque neque. Etiam massa lacus, posuere at maximus at, laoreet sit amet sapien. In hac habitasse platea dictumst. In ac vulputate est, nec ornare purus. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

{% end %}

```md
{%/* text_image(text_position = "right", src="/images/example.png", alt="An image description", caption = "test caption") */%}

_Here is some text_ on the right.</br><kbd>CTRL+ALT+Delete</kbd> Here's some more.

{%/* end */%}
```

{% text_image(text_position = "right", src="/images/example.png", alt="An image description", caption = "test caption") %}

_Here is some text_ on the right.</br><kbd>CTRL+ALT+Delete</kbd>

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque lacinia malesuada dolor, nec hendrerit nibh mattis vitae. Pellentesque mollis justo ac nisi accumsan molestie. Nulla vel sem velit. Quisque lacus erat, condimentum sit amet pellentesque eu, fringilla ut lacus. Vivamus sed fermentum ligula. Integer finibus nulla eu libero pulvinar vestibulum. Nunc sit amet ligula a ipsum fermentum pellentesque at vel mauris. Etiam vitae eros non ante congue tempor. Suspendisse ac tincidunt nisi. Interdum et malesuada fames ac ante ipsum primis in faucibus. Aliquam felis magna, tempus ut arcu tincidunt, vehicula egestas sem. Suspendisse id luctus odio, ac pellentesque neque. Etiam massa lacus, posuere at maximus at, laoreet sit amet sapien. In hac habitasse platea dictumst. In ac vulputate est, nec ornare purus. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

{% end %}

## two_columns

```md
{%/* two_columns() */%}
Left column text goes here.

### Markdown should be supported

<!-- split -->

Right column text goes here.
{%/* end */%}
```

{% two_columns() %}
Left column text goes here.

<!-- split -->

Right column text goes here.
{% end %}

## two_columns_fancy

```md
{%/* two_columns_fancy() */%}
Left column text goes here.

<!-- split -->

Right column text goes here.
{%/* end */%}
```

{% two_columns_fancy() %}
Left column text goes here.

<!-- split -->

Right column text goes here.
{% end %}

## spoiler

```md
this is a spoiler that you can click: {{/* spoiler(body="text to hide", fixed_blur=false) */}}
```

this is a spoiler that you can click: {{ spoiler(body="text to hide", fixed_blur=false) }}

You can also use it like so (fixed_blur = true means you can't see it ever):

```md
{%/* spoiler(fixed_blur = true) */%}

testing this

{%/* end */%}
```

{% spoiler(fixed_blur = true) %}
testing this
{% end %}

## dropdown

```md
{%/* dropdown(header="this is what the user will click on to get more info") */%}

This text will appear in the dropdown

And it will **LOOK GOOD** with markdown!
<a href="allergyguide.ca">link</a>

{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon.

**Markdown can be used here :)**

{% end %}

{%/* end */%}
```

{% dropdown(header="this is what the user will click on to get more info") %}
This text will appear in the dropdown

And it will **LOOK GOOD** with markdown!
<a href="allergyguide.ca">link</a>

{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon.

**Markdown can be used here :)**
{% end %}

{% end %}

## contributors

```md
{{/* contributors(authors=["Alice Smith", "Bob Johnson"], editors=["Charlie Brown"], staff_reviewers=["David Lee"]) */}}
```

{{ contributors(authors=["Alice Smith", "Bob Johnson"], editors=["Charlie Brown"], staff_reviewers=["David Lee"]) }}

## timeline

Adapted from the excellent pico theme.

```md
{%/* timeline() */%}

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

{%/* end */%}
```

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

## mermaid

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

Other examples of mermaid charts (taken from their docs):

{% mermaid() %}
gantt
dateFormat YYYY-MM-DD
title Adding GANTT diagram functionality to mermaid
excludes weekends
%% (`excludes` accepts specific dates in YYYY-MM-DD format, days of the week ("sunday") or "weekends", but not the word "weekdays".)

    section A section
    Completed task            :done,    des1, 2014-01-06,2014-01-08
    Active task               :active,  des2, 2014-01-09, 3d
    Future task               :         des3, after des2, 5d
    Future task2              :         des4, after des3, 5d

    section Critical tasks
    Completed task in the critical line :crit, done, 2014-01-06,24h
    Implement parser and jison          :crit, done, after des1, 2d
    Create tests for parser             :crit, active, 3d
    Future task in critical line        :crit, 5d
    Create tests for renderer           :2d
    Add to mermaid                      :until isadded
    Functionality added                 :milestone, isadded, 2014-01-25, 0d

    section Documentation
    Describe gantt syntax               :active, a1, after des1, 3d
    Add gantt diagram to demo page      :after a1  , 20h
    Add another diagram to demo page    :doc1, after a1  , 48h

    section Last section
    Describe gantt syntax               :after doc1, 3d
    Add gantt diagram to demo page      :20h
    Add another diagram to demo page    :48h

{% end %}

## widget_penfast

```md
{{/* widget_penfast() */}}
```

{{ widget_penfast() }}

## wide_contact_card

```md
{{/* wide_contact_card(title="example title", text = "test text", src="/images/example.png", url="/research/") */}}
```

{{ wide_contact_card(title="example title", text = "test text", src="/images/example.png", url="/research/") }}

## custom_macro

```md
{%/* custom_macro() */%}

Here is a custom macro copy paste section

{%/* end */%}
```

{% custom_macro() %}
Here is a custom macro copy paste section
{% end %}

## load_macro

```md
{{/* load_macro(topic_name = "chronic_rhinosinusitis") */}}
```

{{ load_macro(topic_name = "chronic_rhinosinusitis") }}

## medications_toml_load

param: meds (list of str)
if not provided default will show all medications from the toml

```md
{{/* medications_toml_load(meds=["bilastine"]) */}}
```

{{ medications_toml_load(meds=["bilastine"])}}

## popup

```md
ExRx: Blexten 10mg OD to QID {%/* popup(icon="rx") */%}

{{ medications_toml_load(meds=["bilastine"])}}

{%/* end */%}
```

Accepts parameter `icon` which is similar to the admonition icons, but a couple of added options (default: 'rx'). These include:

```md
capsule
capsule-pill
rx
note
tip
info
warning
danger
pearl
question
flag
popup
```

To be interactive/work, this shortcode requires one script tag to be placed at the bottom of the page:

```html
<script src="/js/popup.js"></script>
```

ExRx: Blexten 10mg OD to QID {% popup(icon="rx") %}

{{ medications_toml_load(meds=["bilastine"])}}

{% end %}

<script src="/js/popup.js"></script>

## wip

```md
{{/* wip() */}}
```

{{ wip() }}

## remote_text

```md
{{/* remote_text(src="https://raw.githubusercontent.com/allergyguide/allergyguide/refs/heads/main/TODO.md") */}}
```

```md
{{ remote_text(src="https://raw.githubusercontent.com/allergyguide/allergyguide/refs/heads/main/TODO.md") }}
```

## references

Requires a .bib Bibtex file (easily generated with a citation software such as Zotero), example shown below:

```bib
@article{yu_trends_2024,
	title = {Trends of {Peanut}-{Induced} {Anaphylaxis} {Rates} {Before} and {After} the 2017 {Early} {Peanut} {Introduction} {Guidelines} in {Montreal}, {Canada}},
	volume = {12},
	issn = {2213-2201},
	doi = {10.1016/j.jaip.2024.06.004},
	abstract = {BACKGROUND: Food allergies, particularly peanut...},
	language = {eng},
	number = {9},
	journal = {J Allergy Clin Immunol Pract},
	author = {Yu, Joshua and Lanoue, Derek and Mir, Adhora and Kaouache, Mohammed and Bretholz, Adam and Clarke, Ann and McCusker, Christine and Protudjer, Jennifer L. P. and Jones, Aaron and Ben-Shoshan, Moshe},
	month = sep,
	year = {2024},
	pmid = {38876271},
	keywords = {Adolescent, Allergens, Anaphylaxis, Arachis, Canada, Child, Child, Preschool, COVID-19, Early allergen introduction, Emergency Service, Hospital, Female, Food allergy, Humans, Infant, Infant, Newborn, Male, Peanut Hypersensitivity, Practice Guidelines as Topic, Quebec, Registries},
	pages = {2439--2444.e4},
}

@article{stehlin_guiding_2025,
	title = {Guiding {Drug} {Provocation} {Testing} for {Ibuprofen} {Hypersensitivity} in a {Pediatric} {Population}: {Development} of the {I3A} {Risk}-{Stratification} {Tool}},
	volume = {13},
	issn = {2213-2198, 2213-2201},
	shorttitle = {Guiding {Drug} {Provocation} {Testing} for {Ibuprofen} {Hypersensitivity} in a {Pediatric} {Population}},
	url = {https://www.jaci-inpractice.org/article/S2213-2198(24)01238-8/fulltext},
	doi = {10.1016/j.jaip.2024.11.022},
	language = {English},
	number = {3},
	urldate = {2025-09-23},
	journal = {The Journal of Allergy and Clinical Immunology: In Practice},
	author = {Stehlin, Florian and Prosty, Connor and Mulé, Angela and Al-Otaibi, Ibtihal and Colli, Luca Delli and Gaffar, Judy and Yu, Joshua and Lanoue, Derek and Copaescu, Ana-Maria and Ben-Shoshan, Moshe},
	month = mar,
	year = {2025},
	pmid = {39637941},
	note = {Publisher: Elsevier},
	keywords = {(s)NIUAA, (Selective) NSAID-induced urticaria, ...},
	pages = {583--593.e3},
	file = {Full Text PDF:/Users/joshuayu/Zotero/storage/MTTZ56PS/Stehlin et al. - 2025 - Guiding Drug Provocation Testing for Ibuprofen Hypersensitivity in a Pediatric Population Developme.pdf:application/pdf},
}
```

```md
This sentence needs two references <span class="references">yu_trends_2024, stehlin_guiding_2025</span> and some of this

... rest of the document content

{{/* references(showBib = true, path="content/example.bib) */}}
```

This sentence needs two references <span class="references">yu_trends_2024, stehlin_guiding_2025</span> and some of this

... rest of the document content

{{ references(showBib=true, path="content/example.bib") }}

## mobile_warning

This will display a warning admonition if viewed from Mobile.

```md
{{/* mobile_warning() */}}
```

{{ mobile_warning() }}

## json_to_table

- body -- the JSON
- show_headers: bool, default true

For simple flat tables

```md
{%/* json_to_table() */%}

[
{ "name": "Bob", "age": 21, "isCool": false },
{ "name": "Sarah", "age": 22, "isCool": true },
{ "name": "Lee", "age": 23, "isCool": true }
]

{%/* end */%}
```

{% json_to_table()%}
[
{ "name": "Bob", "age": 21, "isCool": false },
{ "name": "Sarah", "age": 22, "isCool": true },
{ "name": "Lee", "age": 23, "isCool": true }
]
{% end %}

And for without headers:

{% json_to_table(show_headers=false)%}
[
{ "name": "Bob", "age": 21, "isCool": false },
{ "name": "Sarah", "age": 22, "isCool": true },
{ "name": "Lee", "age": 23, "isCool": true }
]
{% end %}

For more complex nested tables

```js
{%/* json_to_table() */%}

{
  "C1Inh-HAE": {
    "HAE Type I": {
      "C1Inh function": "< 50%",
      "C1Inh": "< 50%",
      "C4": "Low",
      "C1q": "Normal",
      "Anti-C1Inh Ab": "",
      "Mutation": "_SERPING1_"
    },
    "HAE Type II": {
      "C1Inh function": "< 50%",
      "C1Inh": "Normal",
      "C4": "Low",
      "C1q": "Normal",
      "Anti-C1Inh Ab": "",
      "Mutation": "_SERPING1_"
    }
  },
  "C1Inh-AAE": {
    "": {
      "C1Inh function": "< 50%",
      "C1Inh": "< 50%",
      "C4": "Low",
      "C1q": "Low (70% of cases)",
      "Anti-C1Inh Ab": "Present (50% of cases)",
      "Mutation": "No"
    }
  },
  "ACEi-AAE and nC1Inh-AAE": {
    "": {
      "C1Inh function": "Normal",
      "C1Inh": "Normal",
      "C4": "Normal",
      "C1q": "Normal",
      "Anti-C1Inh Ab": "",
      "Mutation": "_FXII, PLG, ANGPT1, KNG1_"
    }
  }
}

{%/* end */%}
```

{% json_to_table()%}
{
"C1Inh-HAE": {
"HAE Type I": {
"C1Inh function": "< 50%",
"C1Inh": "< 50%",
"C4": "Low",
"C1q": "Normal",
"Anti-C1Inh Ab": "",
"Mutation": "_SERPING1_"
},
"HAE Type II": {
"C1Inh function": "< 50%",
"C1Inh": "Normal",
"C4": "Low",
"C1q": "Normal",
"Anti-C1Inh Ab": "",
"Mutation": "_SERPING1_"
}
},
"C1Inh-AAE": {
"": {
"C1Inh function": "< 50%",
"C1Inh": "< 50%",
"C4": "Low",
"C1q": "Low (70% of cases)",
"Anti-C1Inh Ab": "Present (50% of cases)",
"Mutation": "No"
}
},
"ACEi-AAE and nC1Inh-AAE": {
"": {
"C1Inh function": "Normal",
"C1Inh": "Normal",
"C4": "Normal",
"C1q": "Normal",
"Anti-C1Inh Ab": "",
"Mutation": "_FXII, PLG, ANGPT1, KNG1_"
}
}
}

{% end %}

## research_card

```md
{{/* research_card(paper="sygma2") */}}
```

{{ research_card(paper="sygma2") }}

```md
{{/* research_card(paper="sygma2", show_title=false) */}}
```

{{ research_card(paper="sygma2", show_title=false) }}

## tabs

```md
{%/* tabs() */%}

<!-- TAB -->Overview
<!-- CONTENT -->
<p>This is an <strong>overview</strong> of the feature.</p>

<!-- TAB -->Details
<!-- CONTENT -->
<ul>
  <li>Fast</li>
  <li>Secure</li>
  <li>Reliable</li>
</ul>
{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon.

**Markdown can be used here :)**
{% end %}

<!-- TAB -->Pricing
<!-- CONTENT -->
<p>Starting at <em>$9.99/month</em>.</p>

{%/* end */%}
```

Requires a script to be placed in the bottom of the page:

```html
<script src="/js/tabs.js"></script>
```

{% tabs() %}

<!-- TAB -->Overview
<!-- CONTENT -->
<p>This is an <strong>overview</strong> of the feature.</p>

<!-- TAB -->Details
<!-- CONTENT -->
<ul>
  <li>Fast</li>
  <li>Secure</li>
  <li>Reliable</li>
</ul>
{% admonition(type="danger", icon="danger", title="DANGER") %}
This is a danger admonition with a danger icon.

**Markdown can be used here :)**
{% end %}

<!-- TAB -->Pricing
<!-- CONTENT -->
<p>Starting at <em>$9.99/month</em>.</p>

{% end %}

<script src="/js/tabs.js"></script>

## protected

This allows for secure username/password protected content. The actual content is hidden in a private repository and is securely fetched dynamically to populate the content when the user signs in. Once the user signs in, until ~24h that password will be remembered on their machine. No log-out has been implemented yet but I see little utility at this time for that feature.

To use, the shortcode requires the relative path to the HTML file needed to hydrate the page.

```md
{{/* protected(path="content/private/test.html") */}}
```

{{ protected(path="content/private/test.html") }}
