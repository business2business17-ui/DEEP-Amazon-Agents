---
name: sellerstack-start
description: "Front door for the SellerStack Amazon seller-ops toolkit. Tells the user exactly which Amazon reports each analysis needs, where to fetch each one (Seller Central, Ads console, Brand Analytics, Keepa, Helium 10, Intentwise), and which report powers which skill — then asks what they already have and routes them to the right skill. Make sure to use this skill whenever the user starts the SellerStack plugin, asks 'what reports do I need', 'how do I get started', 'what does this need', 'set me up', 'which report for X', or invokes any Amazon ads/TACoS/search-term/budget analysis without having attached data yet. Always surface the report checklist first so the user can go pull the files before the analysis runs."
---

# SellerStack — Start Here

The purpose of this skill is simple: before any analysis, make sure the user knows **what to pull and where to get it**, so they show up with the right files. Never make someone run a diagnosis, discover mid-way that a report is missing, and start over.

Read `references/report-catalog.md` for the full catalog with exact fetch paths and column notes. Use it to answer any "where do I get X" question precisely.

## What to do when this skill triggers

1. **Greet + state the goal in one line**, then show the report checklist below (or the subset for the skill they asked about).
2. **Ask two things** (use tappable option-style questions where the surface supports them):
   - What do you want to do? (Diagnose TACoS/ACoS · Clean up search terms · Reallocate budget · Weekly digest · Client summary)
   - Which reports do you already have? (multi-select from the list)
3. **Tell them exactly what's still missing** for their chosen task, with the fetch path for each, and offer: "pull these and come back, or I can run now on what you have and flag the gaps."
4. **Route** to the matching skill once they're ready. A missing optional input never blocks a run — it lowers precision and gets flagged.

## The report checklist (master list)

Every file below is a normal export — no API needed. Paths can shift as Amazon updates its UI; if a path has moved, search the report name in Seller Central / the Ads console.

**From the Amazon Ads console** (ads.amazon.com → Sponsored ads → Measurement & Reporting → Reports → create report → pick ad product SP/SB/SD + report type + date range → download XLSX/CSV):
- Advertised Product Report — ad spend & ad sales per ASIN
- Search Term Report — customer search terms, spend, orders, ACoS
- Campaign Report — campaign-level spend/sales/ACoS/ROAS
- Targeting Report — keyword/product targets and match types
- Placement Report — Top-of-Search vs Product-Page vs Rest-of-Search
- Budget Report — daily budgets & time-in-budget / out-of-budget
- **Bulk file (.xlsx)** — Sponsored ads → Bulk operations → download for a date range. The whole account's structure + performance + Search Term Report sheets in one file, and it carries real campaign/ad-group/keyword IDs. Preferred input for coverage (bulk-search-term-harvester) and, when supplied, lets the optimizer/reallocation fill real IDs in upload rows instead of placeholders. It's also the re-upload format for applying changes.

**From Seller Central:**
- Business Report — *Detail Page Sales and Traffic by Child Item* (Reports → Business Reports → By ASIN). Gives Sessions, CVR (Unit Session %), **Buy Box % (Featured Offer)**, Units Ordered, Ordered Product Sales → this is where price/ASP and Buy Box come from natively.
- FBA Inventory / Restock / Inventory Ledger (Reports → Fulfillment → Inventory) → days-of-cover and out-of-stock days.
- SQPR (Brands → Brand Analytics → Search Query Performance; needs Brand Registry) → organic vs paid purchase share per query.

**From Keepa** (product page → Data / CSV export): price history, Buy Box price & seller, sales rank (BSR), **rating & review-count history** → the retail-history signals Amazon doesn't export cleanly.

**From Helium 10:** Cerebro (organic + sponsored rank per keyword), Keyword Tracker (rank over time).

**From Intentwise / internal:** connected ads + retail analytics; and margin inputs (COGS, referral fee %, FBA fee) from your internal sheet or a fee preview.

## Which report powers which skill

| Skill | Required | Recommended | Optional |
|---|---|---|---|
| **tacos-diagnosis** | Advertised Product Report (SP, +SB/SD); Business Report | 2 periods of both; margin inputs (COGS/fees) | SQPR; **Keepa** (price/rating/Buy Box/BSR history); OOS days |
| **search-term-optimizer** | SP Search Term Report | target ACoS; ASP; Targeting Report; brand-term list | SB/SD Search Term Reports |
| **bulk-search-term-harvester** | Ads **bulk file** (.xlsx) with SP Campaigns + SP/SB Search Term Report sheets | target ACoS; scope (ASIN/portfolio/campaign) | — |
| **budget-bid-reallocation** | Campaign Reports (SP, +SB/SD) | Budget report / utilization; target ACoS/ROAS; inventory days-of-cover | Placement Report |
| **weekly-digest** | Current + prior ad + Business reports (or the diagnosis workbook) | inventory days-of-cover; per-brand targets | rank tracker; SQPR; prior digest |
| **exec-summary** | Two periods of spend + ad sales + total sales | margin inputs; targets | SQPR (share of voice) |

## Retail-readiness signals — where each comes from

The diagnosis skill cross-checks these four before blaming ads. Two are free in reports you already need; two need Keepa (which the user has):

| Signal | Native source | Keepa (history) |
|---|---|---|
| Buy Box % | Business Report — "Featured Offer (Buy Box) Percentage" (period avg) | Buy Box price & seller over time (timing of loss) |
| Price / ASP | Business Report — Ordered Product Sales ÷ Units Ordered | Full price history (when it changed / competitor cuts) |
| Stock / OOS | FBA Inventory Ledger (OOS days) | BSR spikes / offer gaps as a proxy |
| Rating / reviews | (not exported cleanly by Amazon) | **Primary source** — rating & review-count history |

If a signal has no source supplied, the analysis flags it as "not verified" rather than assuming it's fine — it never silently fills a gap.

## When to Ask Questions

Always ask the two intake questions (task + reports on hand) unless the user has clearly already stated both. Keep it to one round. Don't lecture — show the checklist, get their answers, route.

## Changelog

**v1** — Initial release. Front-door report checklist with fetch paths, skill×report matrix, Keepa-based retail-signal sourcing, and intake routing.
