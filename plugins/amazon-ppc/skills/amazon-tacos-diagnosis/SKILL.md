---
name: amazon-tacos-diagnosis
description: "Diagnose why an Amazon brand's TACoS, ACoS, or net contribution margin changed between two periods, using a variance bridge that joins paid (SP/SB/SD reports), organic (SQPR/total sales), and retail-readiness (Buy Box %, in-stock, price, rating). Produces a multi-tab Excel workbook: Summary, TACoS_Bridge (waterfall), Root_Cause (ranked drivers with severity + owner surface), Margin_By_ASIN, Forecast, and Gap_To_Goal (current vs target + a feasibility-checked plan to close the gap). Begins by confirming your target ACoS/TACoS/margin (asks only for what's missing). Use this whenever the user asks why ACoS/TACoS/spend/margin moved, why efficiency dropped, why an ASIN is bleeding, for a period-over-period ad-performance review, or a client/pod performance diagnosis — even if they don't say the word 'TACoS'. Do NOT attribute a conversion-rate change to advertising until Buy Box, stock, price, and rating are ruled out."
---

# Amazon TACoS & Profit Diagnosis


## ▶ Before you run (pre-flight)

- **This skill is for:** understanding *why* your TACoS / ACoS / margin moved between two periods — not just that it moved.
- **You get back:** a variance-bridge Excel (Summary, TACoS waterfall, ranked root causes, margin by ASIN, forecast, gap-to-goal).
- **Pull this first:** *Advertised Product Report* (SP, plus SB/SD if you run them) — Ads console → Reports → Advertised product. **And** *Detail Page Sales and Traffic by Child ASIN* — Seller Central → Reports → Business Reports. Two periods of each unlocks the bridge.
- **Wrong tool?** Want to *move* budget rather than diagnose → **amazon-budget-bid-reallocation**. Want per-search-term actions → **amazon-search-term-optimizer**.
- **Optional companions:** Keepa (price / Buy Box / rating / BSR history) sharpens the retail cross-check.

If the required reports aren't attached, name them above and stop — never diagnose on the wrong file.

Answer *why* an Amazon brand's efficiency changed — not just report that it did. The core deliverable is a variance bridge that decomposes the change in total sales and TACoS into named, ranked drivers across all three surfaces (paid, organic, retail), then ties each driver to a specific corrective owner.

The single most common flaw in Amazon ad analysis is attributing a CVR/sales drop to advertising when the real cause is operational (out-of-stock, Buy Box loss, a price hike, a rating slip). This skill forces that cross-check before any bid recommendation.

## Optimize for TACoS + net margin, never ACoS alone

- **ACoS** = Ad Spend ÷ Ad Sales (efficiency of ad *spend* only)
- **TACoS** = Ad Spend ÷ **Total** Sales (efficiency of the whole flywheel)
- **Net contribution margin** = Ordered Product Sales − COGS − Amazon fees − Ad Spend
- A falling ACoS can hide a rising TACoS or shrinking margin (e.g. you cut brand-defense spend and organic sales fell faster). Always report all three.

See `references/metrics-and-enums.md` for every formula, column alias, and threshold. Read it before computing.

## Inputs

Required (at minimum, current period; two periods enables the bridge):
- **Advertising — ad spend & ad sales by ASIN.** Sponsored Products *Advertised Product Report* (primary) plus SB and SD *Advertised Product Reports* if the brand runs them. Sum spend and sales across all three per advertised ASIN. If only Campaign Reports are available, work at campaign→brand grain and note ASIN-level bridge is unavailable.
- **Retail — traffic & conversion.** Business Reports → *Detail Page Sales and Traffic by Child ASIN* (Sessions, Unit Session Percentage, Featured Offer (Buy Box) Percentage, Units Ordered, Ordered Product Sales, (Child) ASIN).

Strongly recommended:
- Two periods of both reports (current vs prior) — without a prior period there is no bridge, only a snapshot + forecast.
- **Margin inputs** per SKU/ASIN: COGS, referral fee %, FBA fulfilment fee. Enables net margin + break-even ACoS.

Optional (deepens diagnosis):
- **SQPR** (Brand Analytics Search Query Performance) — organic vs paid purchase share per query.
- Price history and rating/review-count history (Keepa/Helium 10) — to confirm retail-driven CVR moves.
- Out-of-stock / suppression days per ASIN.

If a file's columns don't match the expected names, map them using the alias table in `references/metrics-and-enums.md` — do not fail on a header-name mismatch. Amazon renames columns across report versions and regions.

## Step 0 — Set the target first (interactive intake)

Do this before any analysis. The point is to anchor everything to a goal, then show the path from current to that goal.

0. **Announce the reports this run needs and flag any missing.** Required: Advertised Product Report (SP, +SB/SD) and the Business Report (Detail Page Sales & Traffic by Child ASIN). Recommended: two periods + margin inputs. Optional retail-history: Keepa (price/rating/Buy Box/BSR) and OOS days. State which the user has provided, name what's missing, and offer the fetch path (Ads console → Reports; Seller Central → Business Reports; Keepa export) — then proceed on what's available rather than blocking.
1. Check the project instructions / context for existing targets (target ACoS, target TACoS, target net margin) and the period. If present, use them and confirm in one line: "Using your targets — ACoS X%, TACoS Y%, margin Z%, period [range]. Say if any changed."
2. Only ask for what's missing, in ONE round, using tappable option-style questions where the surface supports them (otherwise a short prompt): target ACoS and/or TACoS; target net margin (if COGS available); period + comparison basis (WoW / MoM / YoY).
3. If the user says "use defaults" or doesn't answer, proceed with documented defaults (break-even-derived target, else 30% ACoS) and state them on the Summary tab. A missing target lowers precision — it never blocks the run.

Everything downstream is framed as **current → target → gap → plan**.

## Method

**1. Load and normalize.** Detect the two periods (from filenames, a date column, or ask once if ambiguous). Map columns via the alias table. Aggregate ad spend and ad sales per advertised ASIN across SP+SB+SD.

**2. Compute per-ASIN metrics** for each period: Total Sales (= Ordered Product Sales), Ad Sales, Organic Sales (= Total − Ad, floored at 0 — if negative, flag as attribution/halo mismatch, do not silently zero it), ACoS, TACoS, Ad-Sales Dependency, CVR (= Unit Session Percentage), Buy Box %, ASP (= Ordered Product Sales ÷ Units Ordered), and net contribution margin + break-even ACoS where margin inputs exist.

**3. Build the sales variance bridge (diagnostic core).** Model units as `Sessions × Buy Box% × CVR` and sales as `Units × ASP`, then chain-decompose ΔTotal Sales into four effects, holding prior values for not-yet-stepped factors (document this order in output):
- Traffic effect = ΔSessions × BuyBox_prior × CVR_prior × ASP_prior
- Buy Box effect = Sessions_curr × ΔBuyBox × CVR_prior × ASP_prior
- CVR effect = Sessions_curr × BuyBox_curr × ΔCVR × ASP_prior
- Price/ASP effect = Sessions_curr × BuyBox_curr × CVR_curr × ΔASP

Then split ΔTotal Sales into `ΔAd Sales + ΔOrganic Sales` so it's clear whether paid or organic drove the move.

**4. Decompose ΔTACoS** into a spend effect and a sales effect:
`ΔTACoS ≈ (ΔSpend ÷ Sales_curr) − (Spend_prior × ΔSales ÷ (Sales_prior × Sales_curr))`.
This tells you whether TACoS rose because you spent more or because sales fell.

**5. Cross-check every CVR/sales drop against retail signals before blaming ads.** For each ASIN whose CVR or organic sales fell, check: Buy Box % change, stock/OOS days, ASP (price) change, rating/review change. Only if all retail signals are stable may a CVR move be attributed to ad targeting/traffic quality. This gate is mandatory — see Anti-flaw rules.

**6. Rank root causes** per ASIN by the magnitude of each effect, assign severity (see reference), attach the retail cross-check result, and map each to an owner surface: **Paid / Organic / Retail / Ops**.

**7. Forecast** (predictive layer). If the current period is a partial month, project month-end via pace: `forecast = MTD value ÷ days elapsed × days in month` for spend and sales → projected month-end TACoS; flag ASINs trending past target TACoS or below target margin. If ≥3 periods are provided, add a linear TACoS trend/slope.

**8. Build the Gap-to-Goal bridge (current → target → path).** For each metric (ACoS, TACoS, net margin), portfolio and per ASIN: state current vs target and the signed gap; list the levers that close it, ranked by impact, each with a projected effect (points of ACoS/TACoS or $ of margin) drawn from the root causes; show the projected post-action metric and how many cycles to close given the ±25%/cycle bid bound (roughly cycles ≈ ceil(required efficiency change ÷ 0.15)); and give a **feasibility verdict** — *Achievable this cycle* / *Achievable in ~N cycles* / *Not achievable with ad levers alone*. The last verdict is mandatory when target ACoS < break-even ACoS (structural margin/price/COGS problem) or when a TACoS target needs organic/rank growth (slower, flywheel-dependent) — name the blocker and owner surface.

**9. Write the workbook** (see structure below), then hand it to `present_files`.

## Output workbook structure

ALWAYS produce these tabs, in this order:

1. **Summary** — portfolio totals + per-ASIN headline metrics for both periods and deltas (Total Sales, Ad Sales, TACoS, ACoS, Net Margin, Ad Dependency), each with a RAG flag against target.
2. **TACoS_Bridge** — per ASIN: the four sales effects (traffic / Buy Box / CVR / price), ΔAd vs ΔOrganic split, and the ΔTACoS spend-vs-sales split. Include a portfolio waterfall total row.
3. **Root_Cause** — per ASIN: ranked drivers, severity (High/Med/Low), retail cross-check result, owner surface, and a specific recommended action (imperative, not vague).
4. **Margin_By_ASIN** — Price/ASP, COGS, referral fee, FBA fee, ad spend, net contribution margin, break-even ACoS vs actual ACoS. (Omit margin columns if inputs weren't provided; keep the tab with a note.)
5. **Forecast** — month-end pace projections + flags; trend slope if ≥3 periods.
6. **Gap_To_Goal** — per metric (ACoS/TACoS/margin), portfolio + per ASIN: current, target, signed gap, ranked closing levers with projected impact, projected post-action value, cycles-to-close, and the feasibility verdict.

Format numbers as an analyst would: currency to 2dp, percentages to 1dp, deltas signed, RAG via a Status column (not color-only).

## Examples

**Example — CVR-driven drop, retail cause:**
Input: ASIN B0XXXX, TACoS 12%→19%, ACoS 22%→24%, CVR 14%→9%, Buy Box 98%→71%, rating 4.6→4.6, price flat.
Root_Cause output: "Driver #1 (High): CVR −5pt. Retail cross-check: Buy Box fell 27pt — you lost the featured offer, so paid clicks landed on a 3P offer and didn't convert. Owner: Retail/Ops. Action: investigate Buy Box loss (price/seller-health), do NOT cut bids — spend is fine, conversion is blocked."

**Example — spend-driven TACoS rise, paid cause:**
Input: ASIN B0YYYY, TACoS 9%→15%, spend +80%, total sales +6%, organic sales flat, ASIN ranks #1 organically for its head term (from SQPR: organic purchase share 41%).
Root_Cause output: "Driver #1 (High): spend effect on TACoS dominates; incremental spend bought little incremental sales on a term already organically dominant (SQPR share 41%). Owner: Paid. Action: reduce paid exposure on the head term / shift to defensive-only; redeploy budget (hand to reallocation skill)."

## When to Ask Questions

Ask only if:
- The two periods can't be inferred from files/columns and no date range was given.
- Ad reports and the Business Report can't be joined (no shared ASIN key).

Otherwise proceed. If margin inputs are missing, compute everything except net margin and flag it — do not block. Do not ask permission to proceed.

## Anti-flaw rules (do not violate)

- Never attribute a CVR or sales drop to advertising until Buy Box %, stock, price, and rating have been checked and shown stable. State the cross-check result explicitly for every flagged ASIN.
- Never recommend a bid change as the fix for a TACoS/ACoS spike whose real cause is operational.
- Never silently floor a negative organic-sales figure — flag it as an attribution/halo mismatch (ad-attributed sales include a click window and halo; total sales are ship-based).
- Report TACoS and net margin alongside ACoS every time; never present ACoS as the sole verdict.
- Process every ASIN present in the join; no silent drops.
- Never tell the user a target is reachable by bids/negatives alone when target ACoS < break-even ACoS, or when a TACoS target requires organic growth. State what actually has to change and who owns it.

## Changelog

**v2.1** — Step 0 now announces the reports this run needs (required/recommended/optional) and where to fetch them, flagging any missing.

**v2** — Added Step 0 targets intake (confirm from context, ask only what's missing, never block) and a Gap_To_Goal tab: current → target → gap → ranked levers with projected impact → cycles-to-close → honest feasibility verdict.

**v1** — Initial release. Two-surface variance bridge (sales + TACoS decomposition), mandatory retail cross-check gate, owner-surface routing, month-end pace forecast, five-tab workbook.
