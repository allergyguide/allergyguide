+++
date = 2026-09-18
title = "Component Behaviour Tests"
description = "Canary tests for Zola 0.23 / Tera v2 component behaviour"
template = "page.html"
+++

Ground-truth canary for Tera v2 component behaviour. If Zola updates `pulldown-cmark` or the Tera engine, check here for regressions.

All test components are defined in [`templates/components/test-components/quirks.html`](https://github.com/allergyguide/allergyguide/blob/main/templates/components/test-components/quirks.html).

---

## 1. Newline / Paragraph Injection (§1.1)

Multi-line component output feeds blank lines into `pulldown-cmark`, which injects stray `<p>` tags inside or around the HTML. The fix: collapse output to a single line using `set` + {% raw %}`replace(from="\n", to=" ")`{% endraw %}.

```
{% raw %}{{ <test_multiline /> }}{% endraw %}   {# broken — has blank line inside div #}
{% raw %}{{ <test_singleline /> }}{% endraw %}  {# fixed  — collapsed to one line #}
```

{{ <test_multiline /> }}
**⬆ Broken**: inspect the element — you'll see a stray `<p>` injected inside the `<div>`.

{{ <test_singleline /> }}
**⬆ Fixed**: identical source HTML, collapsed to one line. No `<p>` injection.

---

## 2. JSON in `data-` Attributes (§1.11)

Newlines and unescaped quotes inside a `data-` attribute break `JSON.parse` at runtime. The fix: {% raw %}`replace(from='\n', to=' ')`{% endraw %} then `| escape` (HTML-escapes `"` → `&quot;`, `<` → `&lt;`).

{% raw %}
```
{% <test_json_attr> %}
{
  "target": "_SERPING1_",
  "nested": { "value": "< 50%" }
}
{% </test_json_attr> %}
```
{% endraw %}

{% <test_json_attr> %}
{
"target": "_SERPING1_",
"nested": {
"value": "< 50%"
}
}
{% </test_json_attr> %}

**Expected**: green "✅ JSON parsed correctly!" message. Red means the attribute value was malformed.

---

## 3. HTML Comments Break Markdown Lists (§1.3)

An HTML comment (`<!-- -->`) emitted by a component terminates the current list context. Items after it start a new `<ul>`. Fix: use Tera comments ({% raw %}`{# #}`{% endraw %}) — they are stripped at build time and never reach the Markdown parser.

```
- Item 1
- {% raw %}{{ <test_list_breaker /> }}{% endraw %}
- Item 3
```

- Item 1
- {{ <test_list_breaker /> }}
- Item 3

**Expected**: all three items in a single contiguous `<ul>`. If Item 3 starts a separate list, the HTML comment inside `test_list_breaker` broke it.

---

## 4. Component Nesting (§1.5)

Can an inline component render inside a block component's body?

{% raw %}
```
{% <test_outer> %}
Body text. Inline: {{ <test_inner /> }}
{% </test_outer> %}
```
{% endraw %}

{% <test_outer> %}
Body text. Inline: {{ <test_inner /> }}
{% </test_outer> %}

**Expected**: bold red "Inner component rendered!" text inside a blue box. Zola evaluates inner components first (inside-out), so nesting works correctly.

---

## 5. Strict Argument Handling

Omitting a parameter that has no default value in the component signature causes `zola build` to fail with a clear error — this is intentional compile-time enforcement, not a bug.

```
{% raw %}{{ <test_args required="This is required!" /> }}{% endraw %}
```

{{ <test_args required="This is required!" /> }}

**Expected**: renders with `required = "This is required!"` and `optional = "default value"` (the default from the signature). If the build fails, argument handling behaviour has changed.

---

## 6. Blockquote Injection Bug (§1.2)

A `>` character at the start of a line in component output is parsed as a Markdown blockquote — even inside an HTML attribute or closing tag. Fix: keep multi-attribute HTML on one line, or use the single-line collapse pattern.

```
{% raw %}{{ <test_blockquote_injection /> }}{% endraw %}
```

{{ <test_blockquote_injection /> }}

**Expected**: an anchor tag inside an orange dashed box. If `pulldown-cmark` is confused, the text will be wrapped in a `<blockquote>` instead of rendered as a link.

---

## 7. Squished Text Bug (§1.1)

{% raw %}`replace(from="\n", to="")`{% endraw %} squishes adjacent inline elements together (`<span>Hello</span><span>World</span>` → `HelloWorld`). Always use {% raw %}`replace(from="\n", to=" ")`{% endraw %} to preserve word boundaries.

```
{% raw %}{{ <test_squished_text /> }}{% endraw %}
```

{{ <test_squished_text /> }}

**Expected**: "Empty string replace" row shows `HelloWorld` (broken). "Space replace" row shows `Hello World` (correct).

---

## 8. The `markdown` Filter (§1.5)

The `body` variable in a block component is a raw Markdown string. Without `| markdown`, Markdown syntax inside block-level HTML is ignored by CommonMark rules.

{% raw %}
```
{% <test_markdown_filter> %}
- List item 1
- List item 2

**Bold** and *italic*.
{% </test_markdown_filter> %}

{% <test_no_markdown_filter> %}
- List item 1
- List item 2

**Bold** and *italic*.
{% </test_no_markdown_filter> %}
```
{% endraw %}

{% <test_markdown_filter> %}

- List item 1
- List item 2

**Bold** and _italic_.
{% </test_markdown_filter> %}

{% <test_no_markdown_filter> %}

- List item 1
- List item 2

**Bold** and _italic_.
{% </test_no_markdown_filter> %}

**Expected**: the first (purple) box renders a proper list with bold/italic. The second (brown) box shows raw `**Bold**` and `- List item` as literal text — Markdown is silently ignored inside block-level HTML without the filter. **Always use {% raw %}`{{ body | markdown | safe }}`{% endraw %}.**

### Nested block components work in Zola 0.23

Older Zola versions crashed with `Filter 'markdown' not found` when nesting two components that both used `| markdown`. Zola 0.23 evaluates them inside-out: the inner component's HTML is already rendered when the outer component receives `body`, so the outer `| markdown` cleanly ignores it. Nesting is safe.

---

## 9. Components Inside Markdown Tables (§1.4)

Markdown table parsing is line-sensitive. Any newline injected by a component shatters the table row. Fix: strip surrounding whitespace with {% raw %}`{%- endcomponent -%}`{% endraw %} on any component used inline in a table.

| Column 1 | Column 2                    |
| -------- | --------------------------- |
| Normal   | {{ <test_table_inline /> }} |
| Row 2    | Data                        |

| Column 1 | Column 2                         |
| -------- | -------------------------------- |
| Normal   | {{ <test_table_inline_safe /> }} |
| Row 2    | Data                             |

**Expected**: the first table is completely shattered (rows/pipes as plain text). The second renders correctly — `test_table_inline_safe` uses {% raw %}`{%- endcomponent -%}`{% endraw %} whitespace stripping.

---

## 10. Variable Scoping — {% raw %}`{% set %}`{% endraw %} Is Hygienic (§1.6)

{% raw %}
```
{% set leak_var = "ORIGINAL_VALUE" %}
Initial: `{{ leak_var }}`
{{ <test_leak /> }}
After:   `{{ leak_var }}`
```
{% endraw %}

{% set leak_var = "ORIGINAL_VALUE" %}
Initial value: `{{ leak_var }}`

{{ <test_leak /> }}

After component: `{{ leak_var }}`

**Expected**: `leak_var` reads `ORIGINAL_VALUE` both before and after. {% raw %}`{% set %}`{% endraw %} inside a component does not leak into the calling scope.

---

## 11. Recursive Components (§1.9)

```
{% raw %}{{ <test_recursive depth={3} /> }}{% endraw %}
```

{{ <test_recursive depth={3} /> }}

**Expected**: a nested tree stepping from `Depth 3` → `Depth 1` → green `Base reached`. Tera v2 supports recursive components correctly.

---

## 12. Component Output in Markdown Links (§1.10)

```
{% raw %}[Link text]({{ <test_url /> }}){% endraw %}
```

[This link should point to example.com]({{ <test_url /> }})

**Expected**: a working link to `example.com`. This only works because `test_url` strips surrounding whitespace with {% raw %}`{%- endcomponent -%}`{% endraw %}. Any leading/trailing newline aborts Markdown link parsing.

---

## 13. `...kwargs` Spread — snake_case Only (§1.8)

Tera v2 identifiers cannot contain hyphens. Spread kwargs must be `snake_case`; convert to `kebab-case` inside the component with {% raw %}`| replace(from="_", to="-")`{% endraw %} if needed.

```
{% raw %}{{ <test_spread class="custom-class" data_id="123" aria_hidden="true" /> }}{% endraw %}
```

{{ <test_spread class="custom-class" data_id="123" aria_hidden="true" /> }}

**Expected**: `<div>` with `class="custom-class" data_id="123" aria_hidden="true"`. Note the attributes are still `snake_case` in the output — `test_spread` does not apply the conversion, intentionally showing the raw behaviour. Production components should apply {% raw %}`| replace(from="_", to="-")`{% endraw %} on each key.

---

## 14. {% raw %}`set_global`{% endraw %} Does Not Persist Across Component Calls (§1.7)

{% raw %}`{% set_global %}`{% endraw %} inside a component does **not** accumulate state across invocations. Each call sees a fresh isolated context. Do not use it for auto-incrementing IDs — use `get_random()` instead.

```
{% raw %}
{{ <test_global /> }}
{{ <test_global /> }}
{{ <test_global /> }}
{% endraw %}
```

{{ <test_global /> }}
{{ <test_global /> }}
{{ <test_global /> }}

**Expected**: all three render "Counter started" — the counter never increments, proving {% raw %}`set_global`{% endraw %} resets on each call. If any instance shows "Counter incremented to 2" or "3", the behaviour has changed and components can no longer be assumed isolated.
