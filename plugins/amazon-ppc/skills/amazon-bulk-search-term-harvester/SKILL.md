---
name: amazon-bulk-search-term-harvester
description: "Audit Amazon Sponsored Products search-term coverage from a downloaded Amazon Ads bulk file (.xlsx). Aggregates every customer search term across the SP and SB Search Term Report sheets, checks each against the account's enabled SP keyword targets, and shows which terms are already covered in SP Exact, Phrase, or Broad versus which are harvestable gaps. Scope by portfolio, ASIN, or campaign group. Because the bulk file carries real campaign/ad-group/keyword IDs, harvest rows are emitted upload-ready with no ID placeholders. Adds gap classification, opportunity sizing, a coverage-percent gap-to-goal, an Excel workbook, and a self-contained interactive HTML dashboard. Use whenever the user has an ads bulk file and wants untargeted converting search terms, keyword coverage audit, harvesting for a product or portfolio, or over-coverage/duplication checks. Complements amazon-search-term-optimizer, which classifies performance from the standalone Search Term Report."
---

# Amazon Bulk Search-Term Coverage Harvester


## ▶ Before you run (pre-flight)

- **This skill is for:** finding converting search terms you are **not** targeting yet (harvestable gaps), without duplicating what you already run.
- **You get back:** a coverage dashboard + an upload-ready harvest file with real campaign/ad-group/keyword IDs already filled in.
- **Pull this first:** the Ads **bulk file** (.xlsx) — Ads console → Sponsored ads → *Bulk operations* → download for a date range.
- **Wrong tool?** If you only have the standalone Search Term Report → **amazon-search-term-optimizer**.
- **Optional companions:** none — the bulk file is self-sufficient (it carries the IDs).

If a bulk file isn't attached (a standalone report won't work here), say so and stop.

Answers one question the standalone Search Term Report cannot: **which converting customer search terms am I NOT yet targeting in SP Exact / Phrase / Broad?** It reads a downloaded Amazon Ads **bulk file** — which contains both the account's keyword targets *and* the SP/SB Search Term Report sheets — so it can cross-check every search term against what you already target, scope-sensitively, and hand back dedupe-safe, upload-ready harvest rows with real IDs.

This complements `amazon-search-term-optimizer`: the optimizer classifies term *performance* (harvest / negative / bid-down) from the standalone report; this skill owns *coverage and structure* from the bulk file and is the authoritative dedupe check (it can see existing targets, so it never tells you to harvest something you already run).

Read `references/bulk-file-reference.md` before parsing — it holds the bulk-file sheet/column schema, the critical read-only parsing gotcha, term normalization rules, the coverage definition, and the SP bulk upload schema.

## Step 0 — Smart, minimal intake

1. **Locate & validate the bulk file.** Confirm the `.xlsx` has a Sponsored Products Campaigns sheet (for keyword targets) AND at least the SP Search Term Report sheet (SB optional). If the Search Term Report sheets are absent, stop and tell the user to re-download the bulk file with reports included — there are no search terms to harvest without them.
2. **Detect** which sheets are present (SP always; SB if there), the campaigns/portfolios in the file, and the date range.
3. **Confirm in one message, ask only what's missing** (tappable options where supported):
   - **Scope** (optional): an ASIN, a campaign substring, or a portfolio name to prefill the analysis focus. Default = whole account.
   - **Target ACoS** (to decide which gaps are worth harvesting) — from project context, else ask or default to break-even / 30% and flag.
   - **Harvest threshold**: min orders (default 1) and/or min clicks to count a gap as worth harvesting.
   Keep to one round; missing optional inputs never block.

## Method

**1. Parse the bulk file** with the read-only + reset-dimensions pattern in the reference (Amazon bulk exports declare a bogus A1:A1 dimension; without `ws.reset_dimensions()` read-only iteration silently truncates to one column and parses zero rows). Load the SP Campaigns sheet (keyword targets + performance), SP/SB Search Term Report sheets, and Portfolios.

**2. Build the target index.** From the SP Campaigns sheet, collect enabled keyword targets by match type (Exact / Phrase / Broad), with campaign/ad-group/keyword IDs and impressions. Normalize each keyword (see reference).

**3. Aggregate search terms.** From the SP + SB Search Term Report sheets, aggregate every customer search term per campaign: spend, ad sales, clicks, orders, ACoS, CPC, CVR. Normalize terms the same way. Drop ASIN-form terms (`^B[A-Z0-9]{9}$`) — this is keyword harvesting only.

**4. Decide coverage (scope-sensitive, descriptive).** Within the campaigns currently in scope, a term is **covered** in a match type if there's an *enabled* SP keyword for that normalized term with impressions > 0. Paused, archived, and zero-impression keywords do not count. Produce, per term: covered-in-Exact? / Phrase? / Broad?, plus its aggregated metrics and the count of distinct campaigns it appears in.

**5. Classify each gap (diagnostic).**
- **Uncovered converter** — orders ≥ threshold AND ACoS ≤ target AND not covered in any match type → harvest to Exact (highest priority).
- **Broad-only converter** — covered only in Broad and converting → add Phrase/Exact for tighter control + bid efficiency.
- **Uncovered non-converter** — spend but no orders and untargeted → not a harvest; note for the optimizer's negative logic.
- **Over-covered** — targeted in all three match types → self-competition/dedupe candidate (flag; consolidate).

**6. Size the opportunity (predictive).** Rank uncovered converters by ad sales (and orders). Compute **coverage %** = share of converting-term ad sales already covered vs leaking through auto/broad discovery — the headline gap metric. Estimate harvestable sales = Σ ad sales of uncovered converters.

**7. Recommend actions (prescriptive) + build upload.** For each uncovered converter, emit a dedupe-safe harvest: a new **Exact** keyword in the appropriate manual campaign/ad group, starting bid = `min(term CPC × 1.15, target ACoS × ASP × CVR)` (see optimizer logic), and — because the bulk file has real IDs — populate Campaign ID / Ad Group ID with actual values (no placeholders). Optionally pair a Negative Exact of the term in the discovery (auto/broad) campaign to stop self-competition. For over-covered terms, recommend which match type to keep vs archive.

**8. Gap-to-Goal.** Current coverage % → target coverage % → number of harvests to close the gap → feasibility (this cycle vs staged; note that harvesting is fast but rank-building on the new exacts takes cycles).

**9. Write outputs**, then `present_files`.

## Outputs

**A. Excel workbook:**
1. **Summary** — campaigns / portfolios / search-term-rows in scope, coverage %, # uncovered converters, harvestable sales $, target/assumptions used.
2. **Coverage** — per term: spend (+% of scope), ad sales (+%), ACoS, clicks, orders, CPC, CVR, distinct campaigns, covered Exact/Phrase/Broad (Y/N), gap type. Weighted TOTAL row (ACoS/CPC/CVR from scope sums, not averaged).
3. **Harvest_Upload** — dedupe-safe SP bulk rows (Exact keyword creates + optional paired source negatives) with **real IDs** filled from the bulk file.
4. **Over_Coverage** — terms targeted in all three match types; consolidation recommendation.
5. **Gap_To_Goal** — coverage % now → target, harvests to close, feasibility.

**B. Interactive HTML dashboard** (self-contained, single file, unbranded — build it fresh; do NOT reuse any third-party template or styling). Embed the per-campaign data so a **Portfolio dropdown** and a **"Campaign contains" box** re-scope and **recompute coverage and the TOTAL row client-side**. Columns as in the Coverage tab, with the SP Exact/Phrase/Broad coverage shown as checkmarks (checked = already targeted; empty = harvestable gap). Sortable headers, per-column filters (text on Search Term, `≥` on Orders), row-select, pagination, and a CSV export of the current scope. A lightweight embedded table (or an open-source table lib via CDN with an offline note) is fine.

Write files to `/mnt/user-data/outputs/` (e.g. `<name>_search_terms_coverage.xlsx` and `.html`). Print scope counts (campaigns / portfolios / term rows) in the chat summary.

## When to Ask Questions

Ask only if: the bulk file lacks the Search Term Report sheets (must re-download); or the file can't be parsed into term/target rows. Otherwise proceed with defaults and one short confirmation.

## Anti-flaw rules

- Use the read-only + `reset_dimensions()` parse pattern, or the bulk file silently parses as empty. Verify row counts after loading.
- Coverage is scope-sensitive: recompute covered/uncovered for the campaigns actually in scope, not globally.
- Only *enabled, impression-bearing* keywords count as covered; don't treat paused/archived/zero-impression targets as coverage.
- Never emit a harvest for a term already covered in that match type (the whole point is dedupe-safety).
- Fill real IDs from the bulk file; if a needed ID is genuinely absent, flag it rather than inventing one.
- Build the dashboard fresh and unbranded; never reproduce a third-party template or styling.
- SP Exact/Phrase/Broad only; SB/SD and product-target coverage are out of scope (state this). Negative analysis lives in the optimizer.

## Changelog

**v1.1** — Validated against a real 30-day bulk export: confirmed the A1:A1 dimension gotcha on every sheet, corrected the Search Term Report sheet columns (plain Sales/Orders/ACOS, not "7 Day Total Sales"), documented the many `(Informational only)` column mirrors, auto match-type values in the search-term sheet, and precise sheet matching (SP/SB only, exclude RAS).

**v1** — Initial release. Bulk-file-driven SP search-term coverage (Exact/Phrase/Broad), scope-sensitive dedupe, gap classification, coverage-% gap-to-goal, opportunity sizing, real-ID harvest bulk upload, Excel workbook + self-contained interactive HTML dashboard.
