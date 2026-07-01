# Medications App

## Architecture

Unidirectional data flow and stateless components where possible.

- **`main.ts`**: entry point. Fetches medication TOML database at runtime, handles fuzzy search and category filtering, and mounts the interactive index (`mountMedIndex`).
- **`components.ts`**: Contains the pure functions and `lit-html` templates (e.g., `medCardTemplate`) responsible for rendering individual medication cards. This handles complex UI logic like dose filtering pills and markdown parsing.
- **`schema.ts`**: Zod validation schema that ensures strict runtime type-safety for the TOML data.

## Data Source

The application fetches its data at runtime from the compiled static TOML file:

- **Live Data**: `static/toml/medications.json` (compiled from `static/toml/medications/*.toml`)
- **Schema Template**: `static/toml/medications_schema.toml` (Use this as a blueprint for adding new medications).

## Key UI Features

- **Dynamic Dose Filtering**: If a medication has 4 or more indications, a filter menu of pills automatically appears above the doses section, allowing users to toggle specific indications.
- **Markdown Parsing**: `marked` and `DOMPurify` to safely render markdown inside key clinical fields (e.g., Pregnancy, Clinical Pearls, Coverage Tips).
  - _Note:_ The `coverage` `tips` block specifically supports block-level markdown (like bulleted lists).
- **Auto-Formatting**:
  - `sample_rx` strings automatically generate `[Rx]` superscripts.
  - PDF monograph URLs are automatically parsed into human-readable dates (e.g., `drugname-2025-01.pdf` -> `2025-01`).
- **Status Tags**: Coverage status strings are automatically mapped to CSS classes for vibrant color-coding (`Open`, `Restricted`, `Age-Restricted`, `Not Covered`).
- **Global Province Sync**: Selecting a province filter on any medication card or index automatically syncs the selection across all active islands on the page using a custom `med-province-changed` event and `localStorage`.

## Development

All changes to these TypeScript files are compiled via the `esbuild` pipeline orchestrated by `scripts/build.mts`.
For styling, refer to `sass/shortcodes/_medications.scss`.
