+++
title = "As-Needed Budesonide–Formoterol versus Maintenance Budesonide in Mild Asthma: the SYGMA2 trial"
description = "Is PRN budesonide–formoterol non-inferior to maintenance budesonide in reducing severe asthma exacerbations for mild asthma?"
date = 2025-03-20
draft = false

[taxonomies]
tags = ["Research","Asthma"]
[extra]
keywords = "Asthma"
toc = true
authors = ["Author: Resident Lead", "Editor: Resident reviewer", "Staff: TBD"]
+++

<table style="margin:0rem">
  <tr>
    <td>
{% admonition(type="info", icon="info", title="Trial metadata") %}

- Published: 2018
- Journal: NEJM
- Funded by: AstraZeneca

{% end %}

</td>
<td>

{% admonition(type="note", icon="info", title="Contributors") %}

<div class="contributor-group">
<i class="fas fa-pen-nib"></i>  Primary Author: Resident Lead</div>
  <div class="contributor-group">
</div>
<i class="fas fa-user-edit"></i> Editor: Resident Reviewer
  <div class="contributor-group">
<i class="fas fa-star"></i>  Staff Reviewer: TBD
</div>

{% end %}

</td>

</tr>
</table>

{{ research_card(paper="sygma2", show_title=true) }}

## What's the clinical question?

<span class="hl-yellow">In patients with mild asthma, is PRN budesonide-formoterol non-inferior to budesonide maintenance therapy in preventing severe asthma exacerbations?</span>

{% admonition(type="tip", icon="question", title="Why should we care?") %}
Adherence to regular controller steroid puffer therapy in mild asthma is poor, with underuse associated with severe asthma exacerbations. An alternative non-inferior PRN strategy would be a valuable option.
{% end %}

## PICO

{% two_columns_fancy() %}

**Population**:

- **Inclusion Criteria**: Patients aged 12 years and older with a clinical diagnosis of <span class="hl-yellow">mild asthma _requiring_ GINA step 2 treatment</span> (2018 GINA report: step 2 => low dose ICS or LTRA as controller + PRN SABA). Their asthma must have been present for at least 6 months, and be either _uncontrolled on PRN SABA_ or _controlled on mono-maintenance low dose ICS or LTRA_

  - For PRN SABA: required pre-bronchodilator FEV1>=60% predicted with FEV1>=80% post-bronchodilator
  - For low dose ICS or LTRA: required FEV1>=80% pre-bronchodilator
  - Both required evidence of reversible airway obstruction within the past 12 months (defined as increase in FEV1>=12% **and** >=200ml after 1 mg Bricanyl Turbuhaler)
- **Relevant Exclusion Criteria**: Recent asthma worsening within 30 days requiring treatment change (beyond SABA) or systemic glucocorticoid use, current or former smokers with 10 or more pack-years, and history of life-threatening asthma. Pregnancy, BB use of any kind, or recent use of biologic drug

<!-- split -->

**Intervention**:

- Twice-daily placebo + PRN budesonide–formoterol (200μg/6μg)

**Comparison**:

- Maintenance therapy with budesonide (200 µg) + BID PRN terbutaline (0.5 mg)

**Outcome**:

- **Primary**: Annualized rate of severe asthma exacerbations (non-inferiority margin 1.2). A severe exacerbation required any one of:

  - Use of systemic steroids for >=3 days, or
  - Inpatient hospitalization, or
  - ED visit due to asthma that required systemic steroids
- **Relevant Secondary**: Time to first severe exacerbation, ACQ-5 scores, AQLQ scores, use of PRN reliever therapy, overall steroid use, pre-bronchodilator FEV1, adverse events

{% end %}

## Study Design

This study was a <span class="hl-yellow">double-blind, multicenter, parallel-group randomized controlled trial</span> conducted over <span class="hl-yellow">52 weeks</span> across 354 sites in 25 countries.

{% text_image(src="/research/sygma2/study_design.png", class="dark-invert", alt="Figure S1, showing the study design", caption = "Study design. Figure S1 from the supplementary appendix.") %}

There was a **2 to 4 week run-in period** where patients used PRN terbutaline alone for symptom relief, before randomization. Randomization was stratified by study site, and computer generated. During the 52-week period there was no regular medication reminders.

Follow-up over 52 weeks was done through both scheduled in-person visits and phone contact.

{% end %}

### How were outcomes assessed?

#### Primary

- **Annualized rate of severe exacerbations** - identified during follow-ups. Additional hospitalizations/systemic steroid use during a severe asthma exacerbation were not counted as new events

#### Secondary

- **Spirometry**: very detailed criteria for reproducibility are provided in the protocol (ie. timing, model specs, positioning, etc.)
- **ACQ-5 and AQLQ**: self-administered during in-person follow-up visits
- **Puffer Usage (Turbuhaler/placebo)**: a battery powered electronic data logger used for ‘as needed’ and maintenance investigational product

### Statistical analysis

A negative binomial regression model was used for the rate of severe exacerbations, adjusting for treatment group, pretrial treatment, geographic region.

Time to the first severe exacerbation was analyzed using a Cox proportional-hazards model with the same adjustment factors. Changes in ACQ-5/AQLQ scores and FEV1 were analyzed using a mixed model for repeated measures. <span class="hl-yellow">"_No adjustments for multiple comparisons for secondary efficacy variables were made._"</span>

## Results

### Table 1: patients

4215 patients were randomized, with 4176 included in the full analysis set (2089 in the budesonide-formoterol group and 2087 in the budesonide maintenance group). Overall the groups were well balanced, in particular with age, sex, region, and smoking status (mean age 41 years, ~60% female). <span class="hl-yellow">Asthma characteristics were also well balanced (see below table)</span>. Notably, roughly half of the patients had a baseline ACQ-5 score of ≥1.5.

|                                                                          | PRN Budesonide-Formoterol (2089) | Budesonide Maintenance (2087) |
| -----------------------------------------------------------------------: | :------------------------------: | :---------------------------: |
|                                      <div align="left">ACQ-5 score</div> |                                  |                               |
|                                                                     Mean |           1.49 ± 0.89            |          1.53 ± 0.90          |
|                                           Score ≥1.5 - no./total no. (%) |         943/2043 (46.2)          |       1000/2037 (49.1)        |
|                             <div align="left"> FEV1 % of predicted</div> |                                  |                               |
|                                                Before bronchodilator use |           84.4 ± 13.9            |          84.1 ± 13.9          |
|                                                 After bronchodilator use |           96.3 ± 13.8            |          96.0 ± 13.5          |
| <div align="left">No. of severe exacerbations<br>in previous 12 mo</div> |                                  |                               |
|                                                                        0 |           1630 (78.0)            |          1627 (78.0)          |
|                                                                        1 |            365 (17.5)            |          362 (17.3)           |
|                                                                       ≥2 |             94 (4.5)             |           98 (4.7)            |

<span class="hl-yellow">From each group, only about 1% of patients were lost to follow-up</span>.

### Primary Outcome

{{ img(src="/research/sygma2/primary.png" alt="Primary outcome results", class="c1 dark-invert", caption = "Rate ratios for the annualized rate of severe asthma exacerbations. Solid line: non-inferiority margin; dashed line: superiority margin.") }}

<span class="hl-yellow">PRN budesonide-formoterol was non-inferior to budesonide maintenance therapy for the annualized rate of severe asthma exacerbations</span>, with rates of 0.11 (95% CI, 0.10 to 0.13) and 0.12 (95% CI, 0.10 to 0.14), respectively (RR 0.97; upper one-sided 95% confidence limit, 1.16).

### Secondary Outcomes

{% text_image(src="/research/sygma2/time_to_ex.png",class="dark-invert", alt="Figure 1B, showing time to first severe exacerbation", caption = "Time to first exacerbation between treatment groups.") %}

#### Exacerbations - time to first, total numbers

No significant difference was found between groups for time to first severe exacerbation. There was no significant difference in rate of exacerbations depending on pretrial treatment.

In total, 8.5% of the budesonide-formoterol group compared to 8.8% in the budesonide had a severe exacerbation, a non-significant difference.

{% end %}

<div style = "  overflow-x: auto;">
<table>
  <thead>
    <tr>
      <th></th>
      <th colspan="2">PRN Budesonide-Formoterol (2089)</th>
      <th colspan="2">Budesonide Maintenance (2087)</th>
    </tr>
    <tr>
      <th></th>
      <th>Patients with ≥1 exacerbation</th>
      <th>Total no. of exacerbations</th>
      <th>Patients with ≥1 exacerbation</th>
      <th>Total no. of exacerbations</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th align="left">All severe exacerbations</th>
      <td align="center">177 (8.5)</td>
      <td align="center">217</td>
      <td align="center">184 (8.8)</td>
      <td align="center">221</td>
    </tr>
    <tr>
      <th align="left">Severe exacerbation leading to systemic glucocorticoid use for ≥3 days</th>
      <td align="center">171 (8.2)</td>
      <td align="center">209</td>
      <td align="center">173 (8.3)</td>
      <td align="center">207</td>
    </tr>
    <tr>
      <th align="left">Severe exacerbation leading to emergency department visit and systemic glucocorticoid use</th>
      <td align="center">25 (1.2)</td>
      <td align="center">26</td>
      <td align="center">36 (1.7)</td>
      <td align="center">40</td>
    </tr>
    <tr>
      <th align="left">Severe exacerbation leading to hospitalization</th>
      <td align="center">17 (0.8)</td>
      <td align="center">20</td>
      <td align="center">17 (0.8)</td>
      <td align="center">17</td>
    </tr>
  </tbody>
</table>
</div>

#### ACQ-5, AQLQ

{% admonition(type="warning", icon="info", title="What is the ACQ-5 score?") %}

5-question survey about average symptoms over the past week including: 1) night-time symptoms, 2) morning symptoms, 3) activity limitations, 4) SOB, 5) wheezing.

- Score <0.75 is well controlled; >1.5 is poorly controlled
- A change of 0.5 is considered the minimal clinically important difference

{% end %}

<br>

{% two_columns() %}

In both groups, the ACQ-5 and AQLQ score trended towards better control; while both analyses were not controlled for multiple comparisons, they both favoured the budesonide maintenance group.

However, the <span class="hl-yellow">actual magnitude of change for both scores was relatively small</span>:

- ACQ-5: the mean difference between budesonide maintenance and PRN Symbicort scores was 0.11 (95% CI, 0.07 to 0.15); at the end of 52 weeks, 40.3% vs. 44.3% had a decrease of ≥0.5 (OR 0.86; 95% CI, 0.75 to 0.99, p=0.036). If you took that 4% difference at face-value, the NNT to decrease the ACQ-5 score by 52 weeks would be 25
- AQLQ: the mean difference between budesonide maintenance and PRN Symbicort scores was -0.096 (95% CI, -0.137 to -0.054)

<!-- split -->

{{ img(src="/research/sygma2/acq5.png" alt="ACQ-5 trend over time", class="c1 dark-invert", caption = "Trend of ACQ-5 over 52 weeks from baseline. Minimal clinically important difference is 0.5.") }}
{{ img(src="/research/sygma2/aqlq.png" alt="AQLQ trend over time", class="c1 dark-invert", caption = "Trend of AQLQ over 52 weeks. Overall score is 1-7 inclusive; higher scores => better QOL.") }}

{% end %}

{% two_columns() %}

#### Spirometry (FEV1)

- Baseline pre-bronchodilator FEV1 increased in both groups, but moreso the budesonide maintenance group
- Mean difference between groups was −32.6 ml (95% CI, −53.7 to −11.4), though across the 52 weeks the greatest difference was at the first 16 weeks before the groups converged (? effect of increased compliance during first weeks - unclear from the paper if this was queried)

<!-- split -->

{{ img(src="/research/sygma2/fev1.png" alt="FEV1 over 52 weeks", class="c1 dark-invert", caption = "Trend of FEV1 over 52 weeks.") }}
{% end %}

#### Puffer and steroid use

Adherence to the blinded maintenance regimen was the same between groups: <span class="hl-yellow">around 60%±30%; there was no data on adherence over time</span>.

- For PRN doses: 0.52 inhalations ± 0.55/day of Symbicort on average, vs 0.49±0.70/day of terbutaline
- Less patients required high PRN puffer use at least once in a day for the Budesonide-Formoterol group: 10% vs 15% for >8 inhalations, 4.1% vs 7.4% for >12 inhalations
- <span class="hl-yellow">Budesonide-formoterol patients had a 75% lower median daily dose of inhaled glucocorticoid: 66 µg compared to 267 µg</span>. Median days with systemic steroids was 6 days in both groups.

#### Adverse Events

Adverse events were similar between groups. One asthma-related death in budesonide maintenance group, and one non-asthma death in the budesonide-formoterol group.

## Limitations

- Majority of the population was Caucasian
- Adherence rates of 60% are much higher than real life, favouring the maintenance budesonide group
- 52 weeks may not be enough for assessment of long-term outcomes
- No adjustments for multiple comparisons in secondary efficacy analyses, giving less confidence in the ACQ-5/AQLQ results

## Risk of Bias 2 for primary outcome

**Outcome: low risk**

{% dropdown(header="Detailed risk of bias assessment") %}

<h3 id="domain-1-risk-of-bias-from-the-randomization-process">Domain 1: Risk of Bias from the Randomization Process</h3>
<p>Outcome: low risk</p>
<table>
<thead>
<tr>
<th style="text-align:left">Question</th>
<th style="text-align:center">Author judgement</th>
<th style="text-align:left">Justification</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left">1.1 Was the allocation sequence random?</td>
<td style="text-align:center">Yes</td>
<td style="text-align:left">A computer-generated IVRS/IWRS system was used for generation of randomization codes.</td>
</tr>
<tr>
<td style="text-align:left">1.2 Was the allocation sequence concealed until participants were enrolled and assigned to interventions?</td>
<td style="text-align:center">Yes</td>
<td style="text-align:left">Randomization details were restricted to specific staff, preserving allocation concealment.</td>
</tr>
<tr>
<td style="text-align:left">1.3 Did baseline differences between intervention groups suggest a problem with the randomization process?</td>
<td style="text-align:center">No</td>
<td style="text-align:left">Baseline demographics and clinical characteristics were quite balanced as noted above.</td>
</tr>
</tbody>
</table>
<h3 id="domain-2-risk-of-bias-due-to-deviations-from-the-intended-interventions">Domain 2: Risk of bias due to deviations from the intended interventions</h3>
<p>Outcome: low risk</p>
<table>
<thead>
<tr>
<th style="text-align:left">Question</th>
<th style="text-align:center">Author judgement</th>
<th style="text-align:left">Justification</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left">2.1 Were participants aware of their assigned intervention during the trial?</td>
<td style="text-align:center">No</td>
<td style="text-align:left">Double-blind design. Puffers were identical between groups. A placebo was used for the maintenance in the budesonide-formoterol group.</td>
</tr>
<tr>
<td style="text-align:left">2.2 Were carers and people delivering the interventions aware of participants&#39; assigned intervention during the trial?</td>
<td style="text-align:center">No</td>
<td style="text-align:left">See above.</td>
</tr>
<tr>
<td style="text-align:left">2.6 Was an appropriate analysis used to estimate the effect of assignment to intervention?</td>
<td style="text-align:center">Yes</td>
<td style="text-align:left">Intention-to-treat analysis was used, including all randomized participants.</td>
</tr>
</tbody>
</table>
<h3 id="domain-3-risk-of-bias-due-to-missing-outcome-data">Domain 3: Risk of bias due to missing outcome data</h3>
<p>Outcome: low risk</p>
<table>
<thead>
<tr>
<th style="text-align:left">Question</th>
<th style="text-align:center">Author judgement</th>
<th style="text-align:left">Justification</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left">3.1 Were data for this outcome available for all, or nearly all, participants randomized?</td>
<td style="text-align:center">yes</td>
<td style="text-align:left">A total of 4215 patients underwent randomization, and 4176 (2089 in the budesonide-formoterol group and 2087 in the budesonide maintenance group) were included in the full analysis set. There was minimal loss to follow-up. &gt;95% of participant data was available.</td>
</tr>
</tbody>
</table>
<h3 id="domain-4-risk-of-bias-in-measurement-of-the-outcome">Domain 4: Risk of bias in measurement of the outcome</h3>
<p>Outcome: low risk</p>
<table>
<thead>
<tr>
<th style="text-align:left">Question</th>
<th style="text-align:center">Author Judgement</th>
<th style="text-align:left">Justification</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left">4.1 Was the method of measuring the outcome inappropriate?</td>
<td style="text-align:center">No</td>
<td style="text-align:left">Definitions of outcomes were appropriate and clinically relevant.</td>
</tr>
<tr>
<td style="text-align:left">4.2 Could measurement or ascertainment of the outcome have differed between intervention groups?</td>
<td style="text-align:center">Probably No</td>
<td style="text-align:left">Unlikely given the double-blinded nature of the study and pre-defined follow-up periods.</td>
</tr>
<tr>
<td style="text-align:left">4.3 If N/PN/NI to 4.1 and 4.2: Were outcome assessors aware of the intervention received by study participants?</td>
<td style="text-align:center">No</td>
<td style="text-align:left">Double-blinded.</td>
</tr>
</tbody>
</table>
<h3 id="domain-5-risk-of-bias-in-selection-of-the-reported-result">Domain 5: Risk of bias in selection of the reported result</h3>
<p>Outcome: low risk</p>
<table>
<thead>
<tr>
<th style="text-align:left">Question</th>
<th style="text-align:center">Author Judgement</th>
<th style="text-align:left">Justification</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left">5.1 Was the data analysed according to a pre-specified plan finalized before unblinded outcome data were available?</td>
<td style="text-align:center">Probably Yes</td>
<td style="text-align:left">A pre-specified analysis plan was followed. The protocol was amended after randomization to a non-inferiority design instead of superiority, but this change occurred while investigators were still blinded to outcome data.</td>
</tr>
<tr>
<td style="text-align:left">5.2 Was the result likely selected from multiple eligible outcome measurements?</td>
<td style="text-align:center">Probably no</td>
<td style="text-align:left">The primary outcome, annualized severe exacerbation rate, was clearly defined in the protocol. While other outcomes (e.g. total number of severe exacerbations) were possible, results were similar across them.</td>
</tr>
<tr>
<td style="text-align:left">5.3 Was the result likely selected from multiple eligible analyses?</td>
<td style="text-align:center">Probably no</td>
<td style="text-align:left">The original superiority analysis was replaced with a non-inferiority analysis after a pre-specified sample size review showed inadequate power; seems unlikely to be a post-hoc fishing expedition. Non-inferiority is a clinically relevant outcome to assess in the trial&#39;s context.</td>
</tr>
</tbody>
</table>

{% end %}
