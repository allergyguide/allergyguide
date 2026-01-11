# OIT Calculator Technical Architecture

## Directory Structure

```text
oit_calculator/
├── main.ts                 # entry point: initializes appstate, workspace, checks auth, and delegates setup 
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
│   ├── protocolstate.ts    # observable state container for a single protocol tab
│   ├── workspaceManager.ts # manages multiple protocol states (tabs) and active view
│   └── instances.ts        # singleton instances (workspace, appState)
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
    ├── renderers.ts        # DOM manipulation: Tabs, Settings, Table, Empty State
    ├── events.ts           # global event delegation (Tabs, Settings, Table actions)
    ├── actions.ts          # bridge logic connecting UI actions to Workspace state
    ├── searchui.ts         # search input events, dropdown rendering
    ├── modals.ts           # clickwrap and login modal logic
    └── exports.ts          # export ui

Serverless Functions (Netlify)
├── auth-login.mts          # Authenticates user & issues JWT (HttpOnly cookie)
├── auth-logout.mts         # Clears session cookie
├── get-secure-asset.mts    # Serves permission-gated assets (JSON/PDF) from secure storage
├── request-save-oit-protocol.mts # Processes protocol save requests via Resend API
└── utils.mts               # Shared utilities for serverless functions (e.g. escaping)
```

## Patterns

### Workspace & Multi-Tab State Management

The application uses a **"Single Active View"** architecture managed by `WorkspaceManager`.

1. **Multiple States:** The `WorkspaceManager` holds an array of `Tab` objects, each containing its own independent `ProtocolState`.
2. **Proxy Listener:** The UI subscribes to the _Workspace_, not individual protocols. The Workspace internally subscribes to the _currently active tab_ and forwards (proxies) events to the UI.
3. **Switching:** When a user switches tabs, the Workspace unbinds from the old tab's state and binds to the new one, triggering an immediate UI refresh.

### Unidirectional Data Flow

1. **Event:** DOM interaction (e.g., input change, tab click).
2. **Delegate:** `ui/events.ts` catches the event via delegation.
3. **Action:** A handler calls a logic function (e.g., `updateStepTargetMg`) or Workspace method (e.g., `workspace.setActive()`).
4. **State Update:** The action updates the _Active_ protocol via `workspace.getActive().setProtocol()`.
5. **Notify:** The active `ProtocolState` notifies the `WorkspaceManager`, which proxies the update to subscribers.
6. **Render:** `ui/renderers.ts` updates the DOM to match the new state.

### Authentication & Secure Data Architecture

The tool uses a "Hybrid" data loading model to support multi-tenancy while keeping the base tool public.

1. **Public Loading:** On init, `loader.ts` fetches the public CNF food database (`typed_foods.json`).

2. **Authentication:**

- **Login:** `auth-login.mts` verifies credentials against `AUTH_USERS` env var and issues a signed JWT via an HttpOnly, Secure cookie (`nf_jwt`).
- **Auto-Load:** On app start, `loader.ts` attempts to fetch the user configuration. If a valid cookie exists, the session is restored automatically.

3. **Secure Assets:**

- **Gating:** `get-secure-asset.mts` verifies the JWT and checks the user config fetched from secure_assets to ensure the user is allowed to access the requested file.
- **Configuration:** The tool uses an `oit_calculator-bootstrap` request, which the backend handles by reading `user_configs/{username}_config.json` and then aggregating the required food and protocol lists into a single JSON response for the frontend.
- **Merging:** `AppState` merges the public foods/protocols with the private ones received from the bootstrap payload, rebuilding search indices.

### HTML DOM Patching

- **Structure Check:** checks if the DOM structure (rows, settings blocks) matches the state.
- **Patching:** updates only changed values (attributes, text, inputs) to preserve focus.
- **Rebuild:** triggers full HTML replacement only when structure changes (e.g., adding a step).
- **Tab Switching:** Switching tabs triggers a full state re-render, effectively swapping the view.

### Event Delegation and Initialization

- **Global Listeners:** Attached once to container elements (`#oit-tabs-bar`, `.food-a-container`, `.output-container`) via `initGlobalEvents` in `ui/events.ts`.
- **Specific feature listeners (Search, Export)** are initialized in their respective modules (`initSearchEvents`, `initExportEvents`) called by `main.ts`
- **Tab Bar Logic:** Tab switching/closing logic is centralized in `attachTabBarDelegation`.
- **Debouncing:** Input events use 150ms-300ms debouncing to prevent excessive recalculations.

## Environment Configuration

Deployment requires the following Netlify environment variables (and ideally within local .env):

- `JWT_SECRET`: Secret key for signing session tokens.
- `AUTH_USERS`: JSON map of valid users `{"username": "bcrypt_hash"}`. Use `tools/hash_password.ts` to generate these hashes.
- `TOKEN_EXPIRY_HOURS`: Session duration (default 24).

## Roadmap to v1.0.0

### Safety and Core Logic Validation

- The logic in `calculator.ts` and `protocol.ts` (dose calculations, dilution determination) must be **stabilized**.
- `validator.ts` must be robust and comprehensive as possible. Current warnings should be reviewed and other possible warnings should be brainstormed and implemented if valid.
- Disclaimer/Liability language should be solidified.

### 2. Data Integrity and "Rough" Assets

- Ensure bounds in `data_integrity.test.ts` are comprehensive (e.g., ensure no food has 0g protein unless intended, check for duplicates).

### 3. Development of export content / format

- Make sure ASCII export works well in EMRs

### 4. Testing, QA

- **Unit Test Coverage:** Mainly want high coverage for `core/` files. Some edge cases:
  - Transitioning foods with vastly different protein concentrations.
  - Switching from Solid to Liquid mid-protocol.
  - Floating point precision (round-trip verification).
- **User Testing:** Stress testing by non-developers to try and generate nonsensical protocols or any bugs. Making sure the UI is intuitive and there are no further breaking features to implement.
- **Mobile Testing:** while this is intended for desktop, it should still work as expected on mobile.

---

# OIT Calculator Overview and Rationale (Non-Technical)

Oral Immunotherapy (OIT) is a treatment for IgE-mediated food allergies that involves gradually introducing increasing amounts of allergen to desensitize the patient. Implementing effective OIT protocols for at-home use by patients and their families requires careful planning; however, existing tooling for generating OIT protocols are sparse and do not offer sufficient flexibility for the diversity of protocol phenotypes seen in clinical practice.

This open-source tool aims to addresses these challenges by providing a robust and flexible platform to generate safe and customizable OIT protocols. It aims to simplify protocol creation, reduce manual errors, and support clinicians and patients with clear, exportable, and verifiable plans.

**Key Capabilities:**

- **Customizable Dose Progression:** Generate OIT protocols with configurable dose progressions, with sensible initial defaults based on existing published literature.
- **Diverse Food Support:** Handle both solid and liquid foods, performing automatic dilution calculations where necessary.
- **Food Transitioning:** Support transitions from a primary food (Food A) to a secondary food (Food B) at a customizable threshold.
- **Interactive Protocol Tables:** Fully editable tables for protocol steps, food characteristics, and dilution strategies.
- **Real-time Validation:** Immediate, colour-coded warnings for potential safety or practicality concerns during protocol creation.
- **Export Options:** ASCII export to clipboard and PDF export of plan for patients.

## 1. The problem

### 1.1 There is substantial variability in OIT implementation

OIT protocols involve a series of increasing allergen doses over time. The specific progression of protein targets, food form (e.g., powder, whole food, liquid), dilution methods, and total steps can vary significantly between clinicians, even within a single food. This heterogeneity makes standardized protocol generation difficult: while the calculations are easy, there are many steps and repetitions: manual methods are time-consuming and are more prone to human error.

From personal experience:

- OIT is done many different ways
- Current approaches do not handle this complexity and diversity well enough to provide an efficient way to individualize protocols easily for patients
- Manual calculations are easy but very time consuming, and there are many variables, heuristics, and assumptions to keep in mind that don't appear in calculations:

  > What is a practical dose I should choose for a step?
  > For dilutions, what values are practical to measure and deliver? How consistent should I make them?
  > What are the limits of my instrument resolution?

- Because there are sometimes many possible ways to 'correctly' create a valid OIT step, it requires the tool to be opinionated, select sensible default solutions, and present them in a neat, _easily editable_ way

### 1.2 Underlying Assumptions and Defaults

The calculator operates based on a set of clinical and practical assumptions to ensure generated protocols are both safe and measurable in a home setting:

- **Dosing Strategies:** Two protein dose progression strategies are provided as starting points: standard, and slow. These can be adjusted by the user. The standard progression comes directly from published papers.
  - **Standard** (11 steps): [1, 2.5, 5, 10, 20, 40, 80, 120, 160, 240, 300] mg
  - **Slow** (19 steps): [0.5, 1, 1.5, 2.5, 5, 10, 20, 30, 40, 60, 80, 100, 120, 140, 160, 190, 220, 260, 300] mg
- **OIT Phenotypes:** We assume four main OIT implementation types based on this developer's observations:

  1. _Food A with initial dilutions_, transitioning to direct dosing once the weight of undiluted food is easily measurable. By default, that threshold is set at 0.2 grams or 0.2 ml.

  2. _Food A with dilutions maintained throughout the protocol._

  3. _Food A with no dilutions_. Usually not feasible especially with low dose steps; can be done if compounded by pharmacy but not widely available.

  4. _Transition from Food A to Food B_, where Food A can follow any of the above dilution strategies. Food B is assumed to always be given directly without dilution. Food B is switched to once the weight of undiluted food is easily measurable: by default, that threshold is 0.2 grams or 0.2 ml.

- **Dilution Mechanics:**
  - For solid foods diluted in liquid, the volume contribution of the solid is considered negligible if its weight-to-volume ratio is below 5%. This threshold is arbitrary. For example: if 1 ml of a solution of 0.2g of peanut powder in 40ml of liquid is given, we assume that only 0.2g * 1/40 = 0.005g is actually ingested.
    - If this assumption is not met, it can lead to miscalculation of delivered protein content. A mixture made with 5g of peanut powder mixed with 5ml of water is a paste, with a final volume that is hard to determine. _It would be extremely difficult to know with certainty the protein content in 1ml of that slurry_.
  - For liquid foods, the volume contribution of the food is considered non-negligible in calculations.
  - Dilution calculations prioritize practical patient measurements (e.g., minimum measurable mass/volume by standard scales/syringes - see below). They also aim to make at least 3 servings of daily doses for ease of use.
- **Measurement resolution:** We assume default precision settings for scales (0.01g resolution) and syringes (0.1ml resolution). However, we also assume the practical minimal measurement is often HIGHER than the actual tool resolution:
  - **Practical minimum measurements:** We assume the minimum measurable mass and volume are 0.2g and 0.2ml, respectively. This is arbitrary but comes from personal experience.
- **Validation:** Because of the freedom provided to the user to edit a protocol, unintended side-effects inevitably can arise despite best efforts to programmatically limit 'unreachable' or 'unrealistic' scenarios. Protocols are therefore continuously validated against a set of rules (critical "red" warnings and cautionary "yellow" warnings) to highlight potential issues _without blocking_ the user's workflow. Detailed validation rules are available [here](@/tools/resources/oit_calculator_validation.md). These validation rules **ARE NOT EXHAUSTIVE** and it is stressed that the tool user still has to self-verify the outputs.
- **Pre-defined Foods:** The tool utilizes food protein data from Health Canada's Canadian Nutrient File (2015). If an actual Nutrition Facts label is available, it should ALWAYS be used for accuracy. The original CNF 2015 dataset does not specify what is a solid versus a liquid, and _that characteristic has been added in with an error-prone method_. An assumption is made that for liquids, 100g is approximately equivalent to 100ml for protein concentration purposes; however, users should verify this in practice.
- **Pre-defined protocols:** existing protocols with real-world use can be added on the backend by the developer and be available for search. These protocols are loaded 'as-is', but can still be edited by the user after.

### 1.3 User Workflow

1. **Select Food A or Pre-existing Protocol:** Begin by searching for a primary food (Food A) or loading a pre-existing protocol template. Users can also define custom foods.
2. **Customize Protocol:** Adjust Food A settings (name, protein concentration, form, dilution strategy, threshold), select a dosing strategy (Standard, Slow), and modify individual steps. Optionally, add a transition Food B, whose settings (name, protein concentration, form, threshold) can also be customized. A custom note can also be added.
3. **Review and Refine:** The tool displays real-time warnings (red for critical, yellow for caution) and can edit the protocol as required to fix these.
4. **Export:** Once satisfied, export the protocol in ASCII format or as a PDF for patient handout.
