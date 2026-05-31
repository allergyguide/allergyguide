# Oral food challenge (OFC) index overview and rationale

Oral food challenges are key procedures. Calculation of challenge steps - while trivial - is time-consuming; additionally, not uncommonly patients will bring in foods without a Nutrition Facts label for a challenge.

## Key Features

- **Consolidated Food Database**: contains the publicly available Canadian Nutrient File (CNF) 2015 database. Authenticated users can also access their own custom/provisioned foods.
- **Protocol Generation**: Automatic calculation of food quantities (in grams or ml) for PRACTALL-5 and PRACTALL-7 protocols.

## Architecture

- **`core/`**: math for protocol steps.
- **`data/`**: Loaders for public JSON assets and authenticated API calls to Netlify functions.
- **`state/`**: A singleton `AppState` store using a subscription model for UI reactivity.
- **`ui/`**: Declarative templates using `lit-html`, partitioned into logical components (Table, Toolbar, Modals).
- **`types.ts`**: Centralized Zod schemas and TypeScript interfaces

## Development & Integration

### Zola Integration

The tool is mounted via a Zola shortcode (`templates/shortcodes/ofc_index.html`). It uses a **Static Skeleton Loader** pattern:

1. Zola renders a noninteractive HTML skeleton.
2. The bundled JS loads and initiates data bootstrapping.
3. Once the initial state is ready, the skeleton is replaced by the interactive `lit-html` app.

### Authentication

Authentication is handled via Netlify serverless functions (`/.netlify/functions/ofc-bootstrap`). User sessions are managed through HttpOnly JWT cookies (`nf_jwt`) and a local `oit_session_active` flag for UI state persistence.
