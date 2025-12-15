+++
title = "SPT / IDT generator instructions"
date = 2025-03-01
draft = false

[extra]
keywords = "SPT, Skin prick test, intradermal test"
toc = true
authors = ["Allergyguide"]
+++

## Purpose

This tool is meant to simplify and speed up documentation for SPT or IDT.

If you're only doing a few skin tests and not a panel, _it's probably faster to not use this tool_, and just do it manually within your EMR.

{% admonition(type="info", icon="info", title="Features") %}

1. Quick-search of allergens (see [list](/js/spt_generator_constants.js)) with smart autosuggestion
2. Quick entry of wheal diameter
3. Ability to add an optional note for each entry
4. Template buttons for pre-defined mix-and-match panels
5. Well-formatted copy-paste macros in multiple different formats, sorted by allergen category
6. Entry only requires the keyboard, no mouse required

<br>
NOTE: this tool assumes that wheal sizes >=3mm are positive.
{% end %}

#### Example outputs:

```txt
---- Mar 3, 2025 ----
Skin testing was positive for cashew (22mm), peanut (14mm -- podocyte), pistachio (21mm).
Otherwise, almond, brazil nut, hazelnut, macadamia, pecan, pine nut, apple, apricot, banana, cherry, grape, grapefruit, kiwi, lemon, mango, orange, peach, pear, pineapple, plum, strawberry, watermelon were negative.
Positive control (6mm), Negative control (2mm).
```

{% two_columns() %}

```txt
(-) control -- 1mm
(+) control -- 6mm
D. farinae -- 4mm [duplicate x2]
D. pteronyssinus -- 6mm
cockroach -- 1mm
crab -- 6mm
lobster -- 10mm
shrimp -- 7mm
```

<!-- split -->

```txt
-------------------------------------------------------
(-) control -- 2mm            ||   ragweed -- 2mm                
(+) control -- 7mm            ||   cat -- 1mm                    
cedar -- 2mm                  ||   dog -- 8mm                    
                              ||     [x2]                        
grass mix -- 5mm              ||                                 
-------------------------------------------------------
```

{% end %}

## Instructions

### Adding New Entries

1. **Initial Focus**\
   When the page loads, the allergen search bar is automatically focused.

2. **Typing & Autosuggestions**\
   As you type, a drop-down menu with suggestions will appear:

   - **Cycling Through Suggestions:**\
     You can navigate the suggestions using <kbd>TAB</kbd>, <kbd>SHIFT-TAB</kbd>, or the up/down arrow keys. Press <kbd>ENTER</kbd> to select the highlighted allergen.

   - **Using a Custom Input:**\
     If you type a custom allergen that doesn’t match any suggestions, you can simply press <kbd>ENTER</kbd> or <kbd>TAB</kbd> to select your custom allergen.

3. **Diameter Input**\
   Once an allergen is selected, the focus automatically moves to the diameter input. Here you have a couple of options:

   - **Submit Without a Diameter:**\
     Press <kbd>ENTER</kbd> to submit the entry without specifying a diameter.

   - **Enter a Diameter:**\
     Type in the diameter (enter a single numeric value) and then press <kbd>ENTER</kbd> to submit. You can also adjust the diameter by using the <kbd>←</kbd> (decrement) or <kbd>→</kbd> (increment) keys.

4. **Editing Entries**\
   All submitted entries can be deleted or modified. (See [Modifying Entries](#modifying-entries) below.)

{% admonition(type="tip", icon="tip", title="Save time with templates") %}
In addition to manually adding entries, you can insert templates using the buttons at the top. These templates add a panel of entries without pre-populated diameters or notes. Once added, you can quickly edit these entries. _**Templates can be mixed and matched in any order and used multiple times**_ (though duplicate allergens may occur).

<br>
Note: Custom templates are not available at this time (but may be added in the future).

{% end %}

### Modifying Entries

- **Editing:**\
  Each entry’s allergen, diameter, and optional note can be manually edited.

- **Adjusting the Diameter:**
  - Use the <kbd>←</kbd> and <kbd>→</kbd> keys to decrement or increment the diameter.
  - Use the up/down arrow keys to navigate to the previous or next entry's diameter input.

- **Field Navigation:**\
  You can use <kbd>TAB</kbd> and <kbd>SHIFT-TAB</kbd> to move between the allergen, diameter, and note fields within a single entry.

- **Deleting Entries:**\
  Click the red <kbd>X</kbd> button on the right side of an entry to delete it.
