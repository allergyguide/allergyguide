# OIT Calculator Architecture

## Directory Structure

```text
oit_calculator/
├── main.ts                 # entry point: initializes appstate, checks auth, and delegates setup 
├── constants.ts            # configuration 
├── types.ts                # shared interfaces and enums
├── utils.ts                # generic helpers (formatting, escaping)
├── core/                   # pure logic (should not alter any global state or DOM)
│   ├── calculator.ts       # math for dilutions and step generation
│   ├── protocol.ts         # protocol manipulation 
│   ├── validator.ts        # red/yellow rule checking
│   ├── search.ts           # fuzzy search
│   └── minify.ts           # data for qr code compression and generation
├── state/                  
│   ├── appstate.ts         # global app config (merges public + secure data)
│   ├── protocolstate.ts    # observable state container for active protocol
│   └── instances.ts        # singleton instances that can be shared amongst other modules
├── data/
│   ├── loader.ts           # orchestrates loading of public JSONs and secure user assets
│   ├── api.ts              # secure asset fetcher from secure_assets/
│   └── auth.ts             # login/logout API interactions
├── export/                 
│   └── exports.ts          # pdf (jspdf) and ascii generation logic
├── tests/                  
│   ├── core/               
│   ├── export/             
│   └── data_integrity.test.ts  
└── ui/                     
    ├── renderers.ts        # big renderer file, a bit monolithic
    ├── events.ts           # controller layer: most (not all) global event delegation + inputs
    ├── actions.ts          # bit of glue with logic connecting ui to state
    ├── searchui.ts         # search input events, dropdown rendering
    ├── modals.ts           # clickwrap and login modal logic
    └── exports.ts          # export ui

Serverless Functions (Netlify)
├── auth-login.mts          # Authenticates user & issues JWT (HttpOnly cookie)
├── auth-logout.mts         # Clears session cookie
└── get-secure-asset.mts    # Serves permission-gated assets (JSON/PDF) from secure storage
```

## Patterns

### Unidirectional Data Flow

1. **Event:** DOM interaction (ie input)
2. **Delegate:** `ui/events.ts` (or specific UI modules) catches the event that bubbles up
3. **Action:** a handler calls a 'pure' func from `core/protocol.ts` to calculate _new_ protocol data
4. **State Update:** new object is passed to `protocolState.setProtocol()`
5. **Notify:** `ProtocolState` notifies subscribers (Renderers)
6. **Render:** `ui/renderers.ts` updates DOM to match new state

### Authentication & Secure Data Architecture

The tool uses a "Hybrid" data loading model to support multi-tenancy while keeping the base tool public.

1. **Public Loading:** On init, `loader.ts` fetches the public CNF food database (`typed_foods.json`).

2. **Authentication:**

- **Login:** `auth-login.mts` verifies credentials against `AUTH_USERS` env var and issues a signed JWT via an HttpOnly, Secure cookie (`nf_jwt`).
- **Auto-Load:** On app start, `loader.ts` attempts to fetch the user configuration. If a valid cookie exists, the session is restored automatically.

3. **Secure Assets:**

- **Gating:** `get-secure-asset.mts` verifies the JWT and checks the user config fetched from secure_assets to ensure the user is allowed to access the requested file.
- **Configuration:** The user loads a virtual `me.json`, which the backend maps to `user_configs/{username}_config.json`. This config tells the frontend which specific custom food and protocol lists to fetch.
- **Merging:** `AppState` merges the public foods/protocols with the private ones fetched via `api.ts`, rebuilding search indices.

### HTML DOM Patching

- **Structure Check:** check if the DOM structure (number of rows, existence of settings blocks) matches state
- **Patching:** renderer iterates through elements and updates only changed values (attributes, text content, input values) using `patch*` methods
- **Rebuild:** `innerHTML` full HTML replacement is triggered when the structure changes (ie, adding a step, switching food types)

### Event Delegation and Initialization

- Listeners are attached once to container elements (`.food-a-container`, `.output-container table`) via `initGlobalEvents`
- Specific feature listeners (Search, Export) are initialized in their respective modules (`initSearchEvents`, `initExportEvents`) called by `main.ts`
- Input events use **Debouncing** (150ms-300ms) to prevent excessive recalculations

## Environment Configuration

Deployment requires the following Netlify environment variables (and ideally within local .env):

- `JWT_SECRET`: Secret key for signing session tokens.
- `AUTH_USERS`: JSON map of valid users `{"user": "bcrypt_hash"}`. Use `tools/hash_password.ts` to generate these hashes.
- `TOKEN_EXPIRY_HOURS`: Session duration (default 24).

## Roadmap to v1.0.0

### 1. Safety and Core Logic Validation

- The logic in `calculator.ts` and `protocol.ts` (dose calculations, dilution determination) must be **stabilized** and very thoroughly tested.
- `validator.ts` must be robust and comprehensive as possible. Current warnings should be reviewed and other possible warnings should be brainstormed and implemented if valid.
- Disclaimer/Liability language should be solidified.

### 2. Data Integrity and "Rough" Assets

- Clean `typed_foods_rough.json`. Likely remove foods with protein of 0. Have more accurate generated food types. Rename 'final' to `cnf_foods_v1.json`.
- Ensure bounds in `data_integrity.test.ts` are comprehensive (e.g., ensure no food has 0g protein unless intended, check for duplicates).

### 3. Development of export content / format

- Make sure PDF resource for static patient handout is comprehensive and peer-reviewed
- Make sure ASCII export works well in EMRs

### 4. Testing, QA

- **Unit Test Coverage:** Mainly want high coverage for `core/` files. Some edge cases:
  - Transitioning foods with vastly different protein concentrations.
  - Switching from Solid to Liquid mid-protocol.
  - Floating point precision (round-trip verification).
- **User Testing:** Stress testing by non-developers to try and generate nonsensical protocols or any bugs. Making sure the UI is intuitive and there are no further breaking features to implement.
- **Mobile Testing:** while this is intended for desktop, it should still work as expected on mobile.
