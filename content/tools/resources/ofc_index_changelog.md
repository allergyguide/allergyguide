+++
title = "OFC Index Changelog"
date = 2026-05-31
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
