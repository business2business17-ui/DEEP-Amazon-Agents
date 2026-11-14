---
name: amazon-sqpr-analysis
description: "Analyze Amazon Brand Analytics Search Query Performance (SQP/SQPR) reports at ASIN or Brand level, for one period or many, with year-over-year, month-over-month, week-over-week, or custom comparison. Auto-detects the report view and each file's period (reads every SQP file dropped in a folder), then produces a KPI scorecard (ASIN vs Market CTR/CVR, purchases, volume, deltas), a dual ASIN-vs-Market funnel with per-stage market share, a tagged filterable query table (CVR winner, Low Visibility, CVR Bleed, non-English, Brand vs Category), new/lost/persisting movers, funnel-leak diagnosis, winnable-opportunity sizing, rent/build/defend calls, and a gap-to-goal plan. Outputs an Excel workbook plus a self-contained interactive HTML dashboard. Use whenever the user mentions SQP, SQPR, Search Query Performance, share of voice, query-level share, funnel leaks, CVR vs market, or uploads SQP CSV exports. Ask a short smart intake first; never overwhelm the user."
---

# Amazon SQP / Search Query Performance Analysis


## ▶ Before you run (pre-flight)

- **This skill is for:** seeing your brand's real share on each search — how much of the impressions, clicks, and purchases you capture versus the whole category.
- **You get back:** a KPI scorecard, an ASIN-vs-Market funnel with per-stage share, a tagged query table, movers, and an Excel workbook + interactive HTML dashboard.
- **Pull this first:** *Search Query Performance (SQP)* — Seller Central → Brands → Brand Analytics → Search Query Performance → Brand or ASIN view → pick Quarter/Month → download CSV. *(Requires Brand Registry.)*
- **Wrong tool?** Want *paid* search-term actions → **amazon-search-term-optimizer**. SQP is organic + paid combined.
- **Optional companions:** Helium 10 Cerebro (organic + sponsored rank per keyword).

If no SQP CSV is attached, name it above and stop.

SQPR is the only Amazon report that shows, per search query, your share of the *entire market's* funnel — impressions, clicks, cart adds, purchases — paid and organic combined. This skill turns one or many SQP exports into: a scorecard, a dual ASIN-vs-Market funnel, a tagged and filterable query table, period-over-period movers, and an actioned opportunity plan.

It is distinct from `amazon-search-term-optimizer` (which reads the ad-console Search Term Report — ad-only, spend/ACoS). SQPR is market-level and organic-inclusive. Use both together: SQPR decides *which queries matter and why*; the optimizer *actions the ad side*.

Read `references/sqp-reference.md` before computing — it holds file parsing, the column dictionary, every formula, the tag definitions, marketplace language markers, and adaptable code.

## Step 0 — Smart, minimal intake (detect first, ask little)

The goal: never make the user answer what you can detect. Do this in order.

1. **Find the files.** Look in the folder/uploads the user pointed to (in Cowork this is typically a subfolder with one SQP export per period). Glob for SQP CSVs (filenames usually begin with a marketplace code, e.g. `US_Search_Query_Performance_ASIN_View_...`).
2. **Auto-detect per file:** the **view** (ASIN vs Brand — from the metadata row and whether columns say "ASIN" or "Brand" Count/Share), the **ASIN or brand**, and the **period** (from the metadata row `Select year / Select month`, or the filename). Order files chronologically.
3. **Infer the comparison mode** from the periods: same month a year apart = **YoY**; consecutive months = **MoM**; consecutive ISO weeks = **WoW**; 3+ periods = **trend**; otherwise custom/single.
4. **Confirm in ONE message, then ask only what's missing** (use tappable options where the surface supports them):
   - Restate what you detected: "Found 2 files — April 2025 and April 2026, ASIN-level for B0XXXX. I'll run a Year-over-Year ASIN-level analysis. Correct?"
   - Ask only if genuinely needed: **Brand terms** (comma-separated, to tag Brand vs Category — or "skip") and **marketplace** (to flag non-English queries; default from the filename prefix). A **target purchase share** if they have one (else rank by winnable volume). A **quick-filter focus**: All / CVR winners / Low visibility / CVR bleeding / Non-English (default All).
   Keep it to one round. If the user gave any of this earlier, don't re-ask — confirm and go. Missing optional inputs never block; they reduce tagging/precision and get flagged.

## ASIN vs Brand — smart routing

- **ASIN view** → run ASIN-level: query-level funnel leaks, opportunity sizing, and rent/build/defend are all meaningful for that specific listing. This is the right view for listing/keyword optimization.
- **Brand view** → run Brand-level: category share-of-voice and cross-ASIN portfolio share; per-query shares are brand-aggregate.
- If the user's task implies per-listing work but they uploaded **Brand view** (or vice versa), say so and offer: "This funnel-leak/opportunity analysis is sharpest on ASIN-level SQP — upload the ASIN view, or I can proceed at brand level." Sense and ask; don't silently run the wrong grain.
- If asked "which should I pull?": ASIN view for a specific product's funnel and keyword opportunities; Brand view for category share and portfolio.

## Method

**1. Parse & normalize each file.** SQP CSVs have a metadata row 1 (`skiprows=1`) then the header. Extract ASIN/period/marketplace. Map columns via the dictionary. Compute per-query derived fields: `asin_cvr`, `mkt_cvr`, `asin_ctr`, `mkt_ctr`, price (ASIN vs market median), and the tag flags (below).

**2. Scorecard (descriptive).** Per period, aggregate: # queries, search volume, market purchases, ASIN purchases, ASIN CTR, Market CTR, ASIN CVR, Market CVR, and **effective share** (ASIN purchases ÷ market purchases). For comparisons, show prior + delta (percentage points for rates, % for counts) — mirroring the KPI cards the user expects.

**3. Dual funnel (descriptive).** Build the ASIN funnel (Impressions → Clicks → Cart Adds → Purchases) and the Market funnel side by side, with stage-to-stage rates (CTR, ATC = cart/clicks, CVR = purchases/clicks) and the **market share at each stage** (ASIN count ÷ Total count): impression share, click share, cart-add share, purchase share.

**4. Tag every query** (see reference for exact definitions):
- **CVR+** — ASIN CVR > Market CVR (you convert better than the market).
- **Low Visibility** — Click Share > Impression Share (you earn clicks above your visibility → rank/bid-up opportunity).
- **CVR Bleed** — Click Share > Purchase Share (you win the click but lose share by purchase → listing/price/conversion problem). *(Documented per the friend's code logic; flip in the reference if you prefer the inverse.)*
- **Non-English** — query matches the marketplace's language markers (translation/int'l or negative-targeting signal).
- **Brand vs Category** — query contains a supplied brand term → Brand, else Category.

**5. Funnel-leak diagnosis (diagnostic).** Walk each query's share chain impression → click → cart → purchase; flag the first stage with a material drop (default ≥10pp or ≥30% relative). Map leak stage to lever and owner: low impression share → visibility (rank/ads, Organic/Paid); click share << impression share → SERP (image/title/price/rating, Retail); purchase share << click share → detail page (price/reviews/Buy Box, Retail/Ops).

**6. Movers (comparison).** Merge periods on query → status **persist / new / lost**; per persisting query compute deltas (purchase share Δ, click share Δ, impression share Δ, ASIN CVR Δ, volume %, market-purchase %). Surface biggest wins, biggest losses, biggest new queries, and notable lost queries. For 3+ periods, build a per-query share trajectory.

**7. Opportunity sizing (predictive) + rent/build/defend (prescriptive).**
- `winnable purchases = max(target purchase share − current purchase share, 0) × market purchases` for the latest period; rank queries by this. If no target, use a reachable proxy (min of click share, or current × 1.5) and flag it.
- If the ad Search Term Report is also supplied, split each query's ASIN purchases into ad vs organic and classify **Rent** (high share, ad-driven → test pulling paid), **Build** (low/rising → invest), **Defend** (high organic share → defensive ads only). Without it, present combined share and note the split is unavailable.

**8. Brand vs Category read.** Compare brand share of volume vs brand share of ASIN purchases; the gap where category volume under-converts is the category opportunity. Report it.

**9. Gap-to-Goal.** Per priority query: current purchase share → target → gap → the leak-stage lever → feasibility verdict (*this cycle* / *~N cycles* / *rank build, slower* / *structural: price/reviews/Buy Box*). Be honest: an impression-share gap on a competitive head term is a multi-cycle rank build, not a quick fix.

**10. Write outputs**, then `present_files`.

## Outputs

Produce BOTH:

**A. Excel workbook** (analyst-ready) with tabs:
1. **Scorecard** — KPIs per period + deltas (ASIN vs Market CTR/CVR, purchases, volume, # queries, effective share).
2. **Funnel_ASIN_vs_Market** — stage counts, stage rates, and per-stage market share, per period.
3. **Query_Table** — one row per query: volume, imp/click/cart/purchase share, ASIN CVR, Market CVR, ASIN vs market price, tags, and leak stage. Include a tag column set so it filters like the quick filters.
4. **Movers** — new / lost / persisting with per-query deltas; top wins and losses.
5. **Brand_vs_Category** — split of volume and ASIN purchases.
6. **Opportunities** — queries ranked by winnable purchases with lever + owner; rent/build/defend if ad data present.
7. **Gap_To_Goal** — priority queries: current → target share, gap, lever, cycles-to-close, feasibility.

**B. Interactive HTML dashboard** (self-contained, single file, no external branding — build it fresh; do NOT reuse any third-party template). Replicate the tool's UX: KPI cards with deltas, the dual ASIN-vs-Market funnel with per-stage share, and a **sortable, quick-filterable tagged query table** (filters: CVR winners, Low Visibility, CVR Bleed, Non-English, Brand/Category), plus a short movers section. Keep it clean and professional; percentages to 1–2dp; render blank/zero shares as an em dash, not 0%.

Write files to `/mnt/user-data/outputs/` (e.g. `sqp_<asin-or-brand>_<mode>.xlsx` and `.html`).

## Chat summary (keep tight)

After presenting, give a short prose orientation, not a re-read of the dashboard: the headline (did market and ASIN purchases grow/shrink; what happened to effective share), the single biggest persisting win and loss (query + before/after purchase share), tag movement (CVR+, CVR Bleed, Low Vis counts), and 2–3 concrete next actions. Conservative, data-grounded tone — no hype.

## When to Ask Questions

Ask only if: files can't be parsed into query rows; two files are different ASINs in ASIN view (this compares the same ASIN across periods — ask which, or run each); or neither a target nor a priority-query set is given and one is needed to prioritise (else rank by winnable volume and proceed). One round, never a barrage.

## Anti-flaw rules

- Detect view + period before asking; only ask what you couldn't infer. Don't overwhelm.
- Don't confuse SQP share (market-level) with the ad Search Term Report (ad-only); state which report each number came from.
- Never call combined purchase share "organic" unless the ad split was actually computed.
- An impression-share gap on a competitive query is a rank/visibility build (slow) — never imply it's a quick ad fix.
- Route conversion-stage leaks that are structural (price/reviews/Buy Box) to Retail/Ops, not bidding.
- Build the dashboard fresh; never reproduce a third-party template or branding.
- Render missing shares as em dash, not 0%; percentages to 1–2dp.

## Changelog

**v2** — Major upgrade: ASIN/Brand view auto-detection + routing; multi-period ingestion from a folder; YoY/MoM/WoW/custom + 3+-period trend; KPI scorecard and dual ASIN-vs-Market funnel with per-stage share; tagged, filterable query table (CVR+, Low Vis, CVR Bleed, Non-English, Brand/Category); new/lost/persist movers with deltas; brand-vs-category read; interactive HTML dashboard alongside the Excel workbook. Retained funnel-leak diagnosis, winnable-opportunity sizing, rent/build/defend, and Gap_To_Goal.

**v1** — Initial release: funnel-share leak diagnosis, opportunity sizing, rent/build/defend, target intake + Gap_To_Goal.
