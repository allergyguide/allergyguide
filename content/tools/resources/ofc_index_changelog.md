+++
title = "OFC Index Changelog"
date = 2026-06-14
draft = false

[extra]
toc = true
authors = ["Joshua Yu"]
+++

# Changelog

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [0.11.1] - 2026-06-14

### Changed

- Performance: improve page load speed by fetching food data and checking login status at the same time

## [0.11.0] - 2026-06-09

### Added

- Custom Food Support: Logged-in users can now search and load their own custom foods (created in the OIT Calculator for now) directly into the OFC Index
- Support and Feedback: Added a new "Help & Feedback" button (speech bubble icon) to the toolbar for authenticated users to contact the team

## [0.10.0] - 2026-06-04

### Security

- Upgraded login system UI
- Passwords are no longer stored on the server
- Account data recovery is no longer possible if a password is lost

## [0.9.0] - 2026-05-30

This release migrates the legacy implementation to TypeScript, with user authentication for additional features.

### Added

- Secure Food Database: Logged-in users can now access securely provisioned branded and clinical foods alongside the public database.
- Automatic Protocol Generation: Generate dosing tables for both **PRACTALL-5** and **PRACTALL-7**.
- Mobile-Friendly Dosing: Redesigned dosing tables that are easier to read and interact with on phones and tablets.

### Fixed

- Improved overall performance and stability compared to the legacy JS implementation.
- Fixed layout issues where dosing tables could overlap on small screens.
