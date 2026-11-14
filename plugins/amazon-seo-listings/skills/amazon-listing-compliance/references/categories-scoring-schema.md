# Compliance Reference — categories, severity, scoring, schema

The bundled files in `scripts/` are authoritative. This is a quick map for the reasoning layer.

## Categories (from master_database.json — 341 records)

Amazon Restricted Language (46) · Performance Claims (46) · Medical Claims (43) · Backend Search Terms (29) · Review Manipulation (28) · Operational Compliance Controls (25) · Safety Claims (23) · Health Claims (17) · Packaging Claims (14) · Guarantee Claims (13) · Certification Claims (13) · Regulatory Claims (12) · Intellectual Property Issues (9) · Environmental Claims (7) · Trademark Issues (6) · Restricted Product Claims (5) · Superlative Claims (4) · Comparative Claims (1).

Use the record's own `category` when matched. Only assign a category independently for reasoning-layer findings with no DB match; create a new category only if truly necessary.

## Severity guidance (align to DB `severity` when matched)

- **Critical** — explicit disease treatment/cure, drug-like claims, FDA/EPA "approved" shorthand, severe review manipulation (incentivized/fake reviews), blatant prohibited guarantees, high-risk disinfectant/pesticidal/medical language.
- **High** — unsupported certification/endorsement, strong absolutes, deceptive comparative language, dangerous safety claims, backend-term violations, insert manipulation.
- **Medium** — softer implied claims, ambiguous superlatives, documentation-dependent phrasing, borderline authority language.
- **Low** — mild puffery with low direct enforcement risk.

DB severity distribution: Medium 146, High 103, Critical 92 (no Low in the DB; Low is used by the reasoning layer for puffery).

## Match types

- **exact** — the restricted phrase appears verbatim (engine).
- **semantic** — a known variation/synonym or a paraphrase close to a prohibited pattern (engine variation-substring, or reasoning via semantic_dictionary).
- **implied** — no banned phrase, but the wording implies a prohibited claim (e.g. "clears breakouts overnight" implies a drug claim). Reasoning layer.
- **documentation-dependent** — allowed only with substantiation on file (e.g. a specific certification, clinical support). Flag separately; not an automatic violation.

## Scoring (matches engine `_score`)

- weights = Critical 12, High 7, Medium 4, Low 2
- compliance_score = max(0, 100 − Σ weights)
- overall_risk: ≥90 Low · ≥75 Medium · ≥50 High · else Critical
- full_audit: apply a stricter posture when multiple high-risk claims span title + bullets + backend + OCR (the more surfaces carry risk, the closer to the Critical band).

## Output schema (see scripts/OUTPUT_SCHEMA.json for the canonical form)

Top level: `mode`, `executive_summary`, `compliance_score`, `overall_risk`, `counts_by_category`, `violations[]`, `documentation_dependent_claims[]`, `rewrite_output` (rewrite mode), `change_log[]` (rewrite mode), `notes[]`.

Each violation: `violation_number`, `category`, `detected_text`, `match_type`, `location` (title | bullet_n | description | backend_terms | image_text | packaging | pdf | a_plus | brand_story | storefront), `severity`, `reason`, `policy_explanation`, `confidence_score`, `suggested_alternative`.

## Record fields available for enrichment (master_database.json)

`id`, `category`, `subcategory`, `section_title`, `restricted_phrase`, `variations[]`, `severity`, `reason`, `policy_reference`, `examples[]`, `acceptable_alternatives[]`, `confidence`, `notes`, `allowed`, `marketplace`, `regulatory_body`, `policy_type`. Use `acceptable_alternatives[0]` for `suggested_alternative` when present; use `policy_reference` (+ policy_mapping) for `policy_explanation`; cite `id` internally for traceability, not as a policy citation.
