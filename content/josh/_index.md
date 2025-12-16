+++
paginate_by = 5
sort_by = "date"
template = "index_w_frontmatter.html"
title = "Josh's corner"
description = "Josh's secret website corner"
+++

Congratulations on finding this section I suppose.

This is purely for rough-work and non-allergy content for my personal use.

# Meet the editors

{% profile_grid() %}
[
{ "name": "Joshua Yu, MD BSc", "src": "/images/profile_jy.png", "text": "PGY-4 Clinical Allergy Immunology fellow at the University of British Columbia." },
{ "name": "Adhora Mir", "src": "/images/profile_am.png", "text": "PGY-5 Adult Allergy & Immunology fellow at McGill University." },
{ "name": "Editor 3", "src": "/images/example.png", "text": "Could also be you!" }
]
{% end %}
