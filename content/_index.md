+++
title = "Homepage"
template = "pages.html"
description = "Homepage of allergyguide.ca"
draft = false
in_search_index = true
+++

<div class="allergyguide-homepage">

<div class="hero">
  <h1>Practical Clinical Allergy & Immunology</h1>
  <p class="lead">Free, open-source, high-yield content and clinical tools designed for medical professionals.</p>
  <div class="hero-actions">
    <a href="/topics" class="button button-primary">Explore Topics</a>
    <a href="/tools/oit-calculator" class="button button-secondary">OIT Calculator</a>
  </div>
</div>

<h2 class="section-title">Featured Content</h2>

{{ card_grid(keys=["title2", "title4", "title6"]) }}

<h2 class="section-title">Our Goals</h2>

{% two_columns() %}

Create a comprehensive cross-Canada resident-led and faculty-reviewed website for high-yield and pragmatic information about clinical allergy & immunology.

Check out our [about](/about) section to learn more!

<!-- split -->

<ul class="features-list">
  <li>
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor" class="homepage-icon bi bi-bookmark-star-fill" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M2 15.5V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.74.439L8 13.069l-5.26 2.87A.5.5 0 0 1 2 15.5M8.16 4.1a.178.178 0 0 0-.32 0l-.634 1.285a.18.18 0 0 1-.134.098l-1.42.206a.178.178 0 0 0-.098.303L6.58 6.993c.042.041.061.1.051.158L6.39 8.565a.178.178 0 0 0 .258.187l1.27-.668a.18.18 0 0 1 .165 0l1.27.668a.178.178 0 0 0 .257-.187L9.368 7.15a.18.18 0 0 1 .05-.158l1.028-1.001a.178.178 0 0 0-.098-.303l-1.42-.206a.18.18 0 0 1-.134-.098z"/>
    </svg>
    <span><strong>High-Yield Topics:</strong> Practical to-the-point references on core conditions and concepts.</span>
  </li>
  <li>
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor" class="homepage-icon bi bi-wrench-adjustable-circle" viewBox="0 0 16 16">
      <path d="M12.496 8a4.5 4.5 0 0 1-1.703 3.526L9.497 8.5l2.959-1.11q.04.3.04.61"/>
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-1 0a7 7 0 1 0-13.202 3.249l1.988-1.657a4.5 4.5 0 0 1 7.537-4.623L7.497 6.5l1 2.5 1.333 3.11c-.56.251-1.18.39-1.833.39a4.5 4.5 0 0 1-1.592-.29L4.747 14.2A7 7 0 0 0 15 8m-8.295.139a.25.25 0 0 0-.288-.376l-1.5.5.159.474.808-.27-.595.894a.25.25 0 0 0 .287.376l.808-.27-.595.894a.25.25 0 0 0 .287.376l1.5-.5-.159-.474-.808.27.596-.894a.25.25 0 0 0-.288-.376l-.808.27z"/>
    </svg>
    <span><strong>Practical Tools:</strong> Clinical aids, patient handouts, guides for clinical practice.</span>
  </li>
  <li>
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor" class="homepage-icon bi bi-capsule-pill" viewBox="0 0 16 16">
      <path d="M11.02 5.364a3 3 0 0 0-4.242-4.243L1.121 6.778a3 3 0 1 0 4.243 4.243l5.657-5.657Zm-6.413-.657 2.878-2.879a2 2 0 1 1 2.829 2.829L7.435 7.536zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8m-.5 1.042a3 3 0 0 0 0 5.917zm1 5.917a3 3 0 0 0 0-5.917z"/>
    </svg>
    <span><strong>Medication Guides:</strong> Concise references for common medications.</span>
  </li>
  <li>
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor" class="homepage-icon bi bi-globe-americas" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/>
    </svg>
    <span><strong>Open Source:</strong> A community-driven and freely accessible platform.</span>
  </li>
</ul>

{% end %}

<div class="contribute">
  <h3>Help shape AllergyGuide</h3>
  <p>This project is actively developed by residents and faculty. We'd love your help!</p>
  <a href="/contribute" class="button">Learn how to contribute</a>
</div>

</div>
