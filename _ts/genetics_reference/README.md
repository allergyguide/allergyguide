# Genetics Reference Tool

This tool will collect current up to date information about genes within popular commercial panels available in Canada and allow for comparison and quick searching through them. Ideally it also links to the respective sites/panels as well as to the order forms.

## Fetching Logic

The fetching logic is located in `genetics_fetcher.mts`. It uses `jsdom` to parse the HTML and extract the list of genes tested.

## Configuration

The list of panels to fetch is defined in `panels_config.json`. Each entry requires a `name`, `url`, and `source`.

### Vendors checked:

#### Blueprint

1. Fetch the HTML of the panel page.
2. Finds the button labeled "Panel Content".
3. Identifies the target container using the `data-bs-target` attribute.
4. Extracts all gene symbols from the table within that container.

#### Invitae

1. Fetch the HTML of the panel page.
2. Locates the `<meta name="genes" content="...">` tag.
3. Extracts the comma-separated list of gene symbols from the `content` attribute.

## Build Process

The fetch process is integrated into the main build script (`scripts/build.mts`).
During the build:

1. `scripts/build-genetics.mts` reads the configuration.
2. It fetches each URL (with a small delay).
3. It compiles the results into `static/tool_assets/genetics_reference/genetic_panels.json`.

## Usage in Frontend

The generated `genetic_panels.json` can be loaded by the frontend logic (to be implemented) to display and compare panels.

## Frontend

- TBD. Target audience is physicians.

### Workflow

1. **Panel Comparison**
   - **Selection:** Users can select up to 3 panels simultaneously.
   - **Layout:** A table where **Rows** are Genes and **Columns** are the selected panels; something like:

```txt
Gene        Company A   Company B   Company C
            (546)       (145)       (300)
---------------------------------------------
BRCA1       ✓           ✓           ✓
BRCA2       ✓           ✓           ✓
ATM         ✓           —           ✓
CHEK2       ✓           ✓           —
PALB2       —           ✓           ✓
TP53        ✓           —           —
```

and maybe a dropdown somewhere containing more detailed analysis? Like:

```
Included in all 3
-----------------
BRCA1
BRCA2
...

Only in Company A
-----------------
TP53
RAD51C

Only in Company B
-----------------
MLH1
MSH2

A + C only
----------
ATM
```

Something like:

▶ Shared by all (94)
▶ Only A (12)
▶ Only B (31)
▶ Only C (18)
▶ A+B (8)
▶ A+C (5)
▶ B+C (14)

- **Indicators:** Simple, scannable checkmarks (covered) or distinct empty/X states (missing) at the intersections.
- **Verification:** Each panel's column header includes a persistent external link icon out to the vendor's source URL for manual verification

2. **Coverage Analysis**
   - Want to be able to evaluating panels against a specific set of required genes.
   - **Condition Presets:** Users can select a condition (e.g., "VEO IBD") from a predefined list. The table should aggressively filter to show _only_ the genes required for that condition; genes missing from a panel are distinctly highlighted (e.g., red/faded) so users know exactly which genes to request as manual add-ons on the order form.
   - **Custom Gene Lists (Fuzzy Search):** users can paste a comma-separated list of custom genes into an input field. This acts identically to a Condition Preset, filtering the matrix to analyze coverage against their list
