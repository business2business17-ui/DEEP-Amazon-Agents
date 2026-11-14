---
name: amazon-listing-compliance
description: "Amazon Listing Compliance Intelligence Agent. Scans listing assets (title, bullets, description, backend search terms, A+, brand story, storefront, packaging, review inserts, and OCR/image text) for restricted, misleading, unsupported, or documentation-dependent language, using a bundled 341-record restricted-phrase database, semantic dictionary, and policy mapping as the source of truth. Runs a deterministic exact/variation engine, then reasons over implied, comparative, superlative, and documentation-dependent claims the matcher misses. Modes: scan, rewrite (with change log), OCR image-text review, and full listing audit. Returns a compliance score, risk level, counts by category, and a detailed violations list per the bundled schema; single listing or batch. Use for pre-publish checks, restricted-keyword or FDA/medical/guarantee/review-manipulation detection, suppression-risk review, or compliant rewrites. Grounds findings in the bundled files and never invents policy citations."
---

# Amazon Listing Compliance Intelligence


## ▶ Before you run (pre-flight)

- **This skill is for:** catching restricted, misleading, or unsupported wording before Amazon does — medical/disease claims, "best/#1," guarantees, review baiting, backend abuse.
- **You get back:** a compliance score + risk level + flagged phrases with policy reference + compliant alternatives (scan / rewrite / OCR / full-audit modes).
- **Pull this first:** the listing content itself — paste title, bullets, description, backend terms (or A+/packaging/OCR text). For many listings, a CSV/CLR export. For image text, upload the image.
- **Wrong tool?** Checking attribute/content *quality* (not restricted language) → **clr-catalog-audit**.
- **Safety:** this flags **risk** — it does not certify you as compliant. The bundled rule set is a point-in-time snapshot; verify anything business-critical against current Seller Central policy.

If nothing to scan is provided, ask for the listing text and stop.

Analyze Amazon listing assets for restricted, misleading, unsupported, documentation-dependent, or policy-sensitive language. This skill is self-contained: the knowledge base and the matching engine are bundled in `scripts/`. Those files are the **source of truth** — ground every finding in them and never invent Amazon policy citations.

Bundled source of truth (`scripts/`): `master_database.json` (341 restricted-phrase records with category, severity, reason, policy_reference, acceptable_alternatives, notes), `semantic_dictionary.json` (279 entries + semantic_detection_rules), `policy_mapping.json`, `restricted_keywords.csv`, `compliance_rules.md` (category-specific guidance), `OUTPUT_SCHEMA.json`, and `compliance_engine.py`.

## Modes

- **scan** — flag issues, score, no rewrite (default when the user pastes a listing).
- **rewrite** — additionally produce a compliant rewrite that preserves meaning/brand voice, with a change log.
- **ocr_review** — treat pasted OCR/image text exactly like listing text (packaging, badges, infographics, inserts).
- **full_audit** — all fields together (title + bullets + description + backend + A+ + brand story + packaging + OCR), stricter scoring across surfaces.

## Step 0 — Smart, minimal intake

If the user pastes listing content, infer **scan** mode and proceed; don't interrogate. Otherwise confirm in one short message (tappable options where supported):
- Which **mode** (scan / rewrite / ocr_review / full_audit).
- Which **content** is provided (title, bullets, description, backend terms, A+, brand story, packaging, insert, OCR/image text).
- Optional: **product category** and **marketplace** — a category lets you apply the matching section of `compliance_rules.md` (supplements, cleaning/disinfecting, baby/kids, beauty, pet, etc.), which materially sharpens judgment.
Batch (a CSV/sheet of many listings, or a CLR-style export) → confirm the column mapping and run per listing. Missing optional context never blocks.

## Method

**1. Run the deterministic engine.** Import and call the bundled engine on the provided fields:
```python
import sys; sys.path.insert(0, "<skill_dir>/scripts")
from compliance_engine import AmazonComplianceEngine
result = AmazonComplianceEngine().scan_text_fields({"title": ..., "bullets": ..., "description": ..., "backend_terms": ..., "image_text": ..., "packaging": ..., "a_plus": ...})
```
This returns high-precision **exact** and **variation-substring** hits with category/severity/reason/policy_reference/acceptable_alternatives from the database. Treat these as confirmed matches.

**2. Reasoning layer (recall the engine can't reach).** Independently review the SAME text for issues the string matcher misses — **implied** medical/disease claims, softened or paraphrased claims, **comparative**, **superlative**, false authority/certification, guarantee phrasing, review-manipulation language, backend-keyword abuse, and **documentation-dependent** claims. Ground this pass in `semantic_dictionary.json` (its `semantic_detection_rules`), `policy_mapping.json`, and the category-specific sections of `compliance_rules.md`. Treat OCR/image text as first-class listing text. Never assume a claim is allowed just because it may be true off Amazon.

**3. Merge, dedupe, classify.** Combine engine hits + reasoning findings; dedupe by (location, phrase). Assign each a `match_type`: **exact / semantic / implied / documentation-dependent**. Enrich each with category, severity (from the DB record where matched; otherwise judge per the severity guidance in the reference), a grounded `policy_explanation` (from the record's policy_reference / policy_mapping — do not fabricate), a `confidence_score`, and a `suggested_alternative` (from the record's `acceptable_alternatives` when present, else a safe rewrite).

**4. Score.** Start at 100; subtract per severity (Critical 12, High 7, Medium 4, Low 2); floor at 0. Apply the stricter posture in full_audit when multiple high-risk claims span title, bullets, backend, and OCR. Risk bands: score ≥90 Low, ≥75 Medium, ≥50 High, else Critical. (This matches the bundled engine's `_score`.)

**5. Output strictly per `scripts/OUTPUT_SCHEMA.json`** — mode, executive_summary, compliance_score, overall_risk, counts_by_category, violations[], documentation_dependent_claims[], (rewrite_output + change_log if rewrite mode), notes[].

**6. Rewrite mode.** Preserve meaning and brand voice; remove/soften every risky element; introduce no new regulatory/medical/safety/guarantee/comparative risk; log each material change with a reason. Re-scan the rewrite to confirm it clears.

## Output delivery

- **Single listing:** return the structured result (per schema) plus a short, readable executive summary in chat. Offer to save the JSON if useful.
- **Batch (many listings):** produce an Excel workbook — a Violations tab (one row per violation: ASIN/SKU, location, category, detected text, match_type, severity, reason, policy_explanation, confidence, suggested_alternative) and a Summary tab (per-ASIN score, risk, counts) — and save to `/mnt/user-data/outputs/`, then `present_files`.

## Grounding & caution rules

- The bundled files are the source of truth. Prefer them for phrases, categories, severity, and policy references.
- Do not invent Amazon policy citations beyond what the files support; if a phrase is close but not in the DB, flag it as semantic/implied with a plain-language explanation rather than a fabricated citation.
- Never assume compliant because a claim is true off Amazon; channel compliance is separate.
- Prefer cautious judgment; when unsure, classify as exact / semantic / implied / documentation-dependent and explain.
- Separate genuine risk from mild puffery — puffery is Low, not Critical. Reserve Critical for explicit disease/drug treatment, regulatory-approval shorthand (FDA/EPA approved), severe review manipulation, and blatant prohibited guarantees.

## When to Ask Questions

Ask only if: no content was actually provided; the mode is ambiguous and matters (e.g. they may want a rewrite, not just a scan); or a batch file's columns can't be mapped. Otherwise proceed.

## Anti-flaw rules

- Run the engine AND the reasoning pass — neither alone is sufficient (engine = precision on known phrases; reasoning = recall on paraphrase/implied).
- Treat OCR/image text identically to on-page text; never skip it when provided.
- Ground severity and policy_explanation in the matched record; only judge independently when there's no DB match, and say so.
- Never fabricate a policy citation or a database id.
- Flag documentation-dependent claims separately (they aren't auto-violations; they need substantiation on file).
- In rewrite mode, re-scan the output; a rewrite that introduces a new risk is a failure.

## Changelog

**v1** — Initial release. Bundled 341-record DB + semantic dictionary + policy mapping + rules + engine; two-layer detection (deterministic engine + reasoning); scan / rewrite / ocr_review / full_audit modes; schema-conformant output; single + batch (Excel) delivery.
