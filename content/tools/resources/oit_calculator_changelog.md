+++
title = "CHANGELOG"
date = 2025-12-07
draft = false

[extra]
toc = true
authors = ["Joshua Yu"]
+++

## [Unreleased]

### Added

### Changed

- UI: now user auth and tool version are right justified.

### Deprecated

### Removed

### Fixed

### Security

---

## [0.15.0] - 2026-01-11

### Added

- Multi-Tab Support: Can now work on and plan up to 5 different protocols at the same time for a single patient using tabs at the top of the calculator. Tabs have coloured status dots (Green/Yellow/Red) that immediately show if a protocol has validation warnings without needing to open the tab.
- Batch Export: "Export PDF" or "Copy to Clipboard" buttons will now include all open tabs in one single file or copy action.
- UX: When opening a new tab, the "Food A" search bar is now automatically focused.
- Logged-in users can open up to 5 tabs; public users are limited to 1 tab.

### Changed

- Layout: Moved Undo/Redo buttons inline with the tabs.
- Settings: "Advanced Configuration" for Food A (dilution strategies) is now collapsible to reduce clutter.
- Export: Renamed "Copy ASCII" button to "Copy to Clipboard" for clarity.
- Spacing: Compacted the layout for Food A and Food B settings to fit more content on the screen.

## [0.14.0] - 2026-01-10

### Added

- Optimistic UI: Login state is reflected immediately upon page load, eliminating visual flicker while waiting for server verification.
- Data Sync Indicator: The user badge now displays a syncing state while custom protocols and foods are being loaded from the server.
- Cloudflare Turnstile added to login flow to mitigate malicious attacks on the secure login endpoint.
- Protocol save requests: logged in users can now request to have custom built protocols added to their account under a specific protocol name.

### Changed

- Performance Optimization: Significantly improved the initial loading speed for signed-in users.

## [0.13.0] - 2026-01-02

### Added

- Secure Authentication: Added a login system allowing authorized users to sign in and access private, practice-specific resources
- Custom Asset Support: Signed-in users can now load custom food databases and private protocol templates alongside the standard public library
- The PDF export tool now supports private user-specific headers, footers, and supplementary handouts (e.g., merging a specific clinic's contact info or consent forms automatically)
- Session Persistence: Login sessions now persist for 24 hours via secure cookies, so frequent re-authentication is not required (24h may be adjusted in the future)

### Changed

- Toolbar UI: Updated the main toolbar to include Login/Logout controls and a "Signed In" user badge

### Fixed

- Fixed specific caching issues where the application would sometimes fail to recognize a valid login state after an update

### Security

- Implemented rate-limiting on authentication endpoints to mitigate malicious attacks

## [0.12.0] - 2025-12-17

### Changed

- For dilutions, changed how the Water Amounts are calculated when the user manually edits the table. Manual adjustments to protein targets, daily amounts, or mix amounts now automatically attempt to find more user-friendly water volumes (e.g., 0.5 ml increments) that maintain the protein target within a tolerance of 5% of the target Mg. If not possible, will fall back to the original water volume.

### Fixed

- fixed bug where users could change the food serving size to less than the protein amount, which is impossible

## [0.11.0] - 2025-12-16

### Changed

- Updated "Clear Optional Food" behaviour to preserve existing step protein targets, rather than resetting the entire protocol to the default standard dosing strategy.
- Dilution candidate calculations: now it will try to obtain a water amount that is in 0.5 ml increments for ease of use, if the resulting calculated protein is within an acceptable amount of the target protein (e.g. 5%).

### Fixed

- Fix bug where table sticky header stopped working
- Fix bug where when the searchbar is refocused, the search results don't reappear if there's already text

## [0.10.0] - 2025-12-11

### Added

- Tooltips for Food A and B thresholds
- Small UI font colour improvements for dark mode visibility
- Within the table when the user first opens the tool, brief instructions have been added
- New validation rule: flags if step Mg increased >2x, if both steps are not <= 5mg. If both steps are <=5mg, then >2x changes are allowed (ie. 1mg to 2.5mg)

## [0.9.2] - 2025-12-10

### Changed

- ASCII export for protocols no longer outputs a table as it looks bad on non-mono-font EMRs by default.

Old output example:

```txt
Elmhurst Milked Almonds Unsweetened Beverage (Liquid). Protein: 20.0 mg/ml
Almonds (dry roasted, unblanched) (Solid). Protein: 210.0 mg/g

+------------------------------------------------------------------------------+
|                 Elmhurst Milked Almonds Unsweetened Beverage                 |
+------+---------+--------+-------------------------+--------------+-----------+
| Step | Protein | Method |       Mix Details       | Daily Amount | Interval  |
+------+---------+--------+-------------------------+--------------+-----------+
|    1 | 1.0 mg  | DILUTE | 1 ml food + 19 ml water | 1 ml         | 2-4 weeks |
|    2 | 2.5 mg  | DILUTE | 1 ml food + 7 ml water  | 1 ml         | 2-4 weeks |
|    3 | 5.0 mg  | DILUTE | 1 ml food + 3 ml water  | 1 ml         | 2-4 weeks |
|    4 | 10.0 mg | DIRECT | N/A                     | 0.5 ml       | 2-4 weeks |
|    5 | 20.0 mg | DIRECT | N/A                     | 1 ml         | 2-4 weeks |
|    6 | 40.0 mg | DIRECT | N/A                     | 2 ml         | 2-4 weeks |
|    7 | 80.0 mg | DIRECT | N/A                     | 4 ml         | 2-4 weeks |
+------+---------+--------+-------------------------+--------------+-----------+
--- TRANSITION TO: Almonds (dry roasted, unblanched) ---
+----------------------------------------------------------------------------+
|                     Almonds (dry roasted, unblanched)                      |
+------+----------+--------+-------------+--------------+--------------------+
| Step | Protein  | Method | Mix Details | Daily Amount |      Interval      |
+------+----------+--------+-------------+--------------+--------------------+
|    8 | 80.0 mg  | DIRECT | N/A         | 0.40 g       | 2-4 weeks          |
|    9 | 120.0 mg | DIRECT | N/A         | 0.60 g       | 2-4 weeks          |
|   10 | 160.0 mg | DIRECT | N/A         | 0.80 g       | 2-4 weeks          |
|   11 | 240.0 mg | DIRECT | N/A         | 1.10 g       | 2-4 weeks          |
|   12 | 300.0 mg | DIRECT | N/A         | 1.40 g       | Continue long term |
+------+----------+--------+-------------+--------------+--------------------+
```

New output:

```txt
Elmhurst Milked Almonds Unsweetened Beverage (LIQUID).
Protein: 5.00 g per 250 ml serving.
(1): 1.0 mg - 1 ml (Dilution: 1 ml food + 19 ml water)
(2): 2.5 mg - 1 ml (Dilution: 1 ml food + 7 ml water)
(3): 5.0 mg - 1 ml (Dilution: 1 ml food + 3 ml water)
(4): 10.0 mg - 0.5 ml (Direct)
(5): 20.0 mg - 1 ml (Direct)
(6): 40.0 mg - 2 ml (Direct)
(7): 80.0 mg - 4 ml (Direct)

--- TRANSITION TO ---

Almonds (dry roasted, unblanched) (SOLID).
Protein: 21.00 g per 100 g serving.
(8): 80.0 mg - 0.40 g (Direct)
(9): 120.0 mg - 0.60 g (Direct)
(10): 160.0 mg - 0.80 g (Direct)
(11): 240.0 mg - 1.10 g (Direct)
(12): 300.0 mg - 1.40 g (Direct)
```

### Fixed

- on mobile, format of clickwrap modal is now not cut off
- on mobile, table is now auto x-scroll

## [0.9.1] - 2025-12-09

### Added

- Small footnote explaining what the +/- buttons do
- Added another checkbox to clickwrapper: verification that food protein content(s) require manual check and that searchable foods are not guaranteed to be accurate
- Added small footer under protein content inputs Food A and B reminding user to always verify concentration with the Nutrition Facts label

### Changed

- When typing, the search bar shows: "Create Custom Food: <...>" instead of just "Custom:"
- Debounce time for food name changing is now longer

### Fixed

- Bug: users could input negative or null/NaN values in Food A or B thresholds. Values are now clamped and revert to 0
- Bug: users could leave input fields in the table (Protein target, Mix Food, Mix Water, Daily Amount) blank or NaN leading to unintended behaviour: the user sees an empty box, but the internal state retains the previous number. Now, it becomes 0

## [0.9.0] - 2025-12-08

### Added

- UserHistory system: Embed QR code in export PDF containing a log of actions taken to make protocol. **No PHI data is within the action log**; the custom note is also not stored.
- On initialization, if loading of the food/protocol databases fail for whatever reason, the tool will no longer silently fail; tool will now not be usable
- New DUPLICATE_STEP warning: Flags redundant adjacent steps with the same food and target protein
- New HIGH_DAILY_AMOUNT warning: Flags daily protein amounts exceeding an upper limit (yellow warning), 250 g or ml
- New HIGH_MIX_WATER warning: Flags mix water volumes exceeding an upper limit (yellow warning), 500 ml
- Data integrity checks: on startup, validates all food and protocol data to prevent potential calculation errors caused by malformed database entries

### Changed

- INVALID_CONCENTRATION warning: Flags if protein content > serving size (previously this was not explicitly flagged)

### Fixed

- Fixed bug where Undo/Redo operations failed to update text inputs (e.g., Food Name) if the input field was still focused

## [0.8.0] - 2025-12-07

### Added

- **Protocol**:
  - Dosing Strategies: "Standard" and "Slow" presets
  - Customization: ability to add/remove individual steps and manually edit protein targets or daily amounts directly within the table
  - Transition Logic: automated "Food A to Food B" transitions (e.g., dilute solution to whole food) with customizable protein thresholds
  - Toggle support for both solid and liquid foods with automatic unit conversion
  - Custom notes field that persists to exports

- **Food and protocol**:
  - Foods available from CNF 2015 database with fuzzy-search
  - A few pre-built protocols available with fuzzy-search
  - Support for custom food creation

- **Dilution calculations**:
  - Automatic calculation of amounts/volumes to ensure protein targets are met within measurement constraints
  - Flexible food A strategies: Support for "Initial Dilution," "Dilution Throughout," or "No Dilution" workflows

- **Protocol validation**:
  - Real-time Validation rule set on protocols, red/yellow. Not fully completed yet

- **User experience**:
  - Undo/Redo History: Ctrl+Z / Ctrl+Y for protocol changes

- **Exports and compliance**:
  - Debugging / versioning: commit-hash stamping on PDF footers for version tracking
  - Terms of Use: clickwrap modal before PDF generation
  - ASCII copy-to-clipboard functionality of protocol
