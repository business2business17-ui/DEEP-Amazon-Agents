---
name: amazon-search-term-optimizer
description: "Turn an Amazon Sponsored Products (and optionally SB/SD) Search Term Report into three actions: a wasted-spend/leakage audit, a harvest list (winning search terms to promote to exact), and a negatives list — plus an upload-ready Sponsored Products bulk-sheet tab. Applies category-agnostic, threshold-based Amazon PPC logic (harvest, negate, bid-down) keyed to target ACoS and break-even. Confirms your target ACoS up front (asks only what's missing), and reports current blended ACoS → projected ACoS after the changes → vs target with a feasibility verdict. Use whenever the user mentions search term reports, wasted ad spend, negative keywords, harvesting, keyword mining, cleaning up campaigns, or reducing ACoS — even if they don't name the report. Never negate a converting term or a brand-defense term, and never fabricate campaign/ad-group IDs."
---

# Amazon Search-Term Optimizer


## ▶ Before you run (pre-flight)

- **This skill is for:** deciding what to do with each customer search term — harvest it, negative it, or bid it down.
- **You get back:** a wasted-spend audit + harvest list + negatives list + an upload-ready Sponsored Products bulk tab.
- **Pull this first:** *SP Search Term Report* — Ads console → Reports → report type *Sponsored Products* → *Search term*.
- **Wrong tool?** If you have the whole-account **bulk file** and want coverage gaps → **amazon-bulk-search-term-harvester** (it also sees your existing targets, so it won't tell you to harvest something you already run).
- **Optional companions:** the *Targeting Report* (so a harvest never duplicates a term you already target).

If the Search Term Report isn't attached, name it above and stop — never classify on the wrong file.

One workflow over the Search Term Report that produces every downstream action: stop wasted spend (negatives), scale winners (harvest to exact), fix over-target converters (bid-down), and emit the whole thing as an Amazon bulk sheet ready to upload.

Read `references/bulk-schema-and-thresholds.md` before writing the bulk tab — it holds the exact Sponsored Products bulk-file columns, the Entity/Operation/Match Type enums, and every default threshold.

## Inputs

Required:
- **Sponsored Products Search Term Report** — one report (with a date range) or two for trend. Key columns (map via alias table if names differ): Customer Search Term, Targeting, Match Type, Campaign Name, Ad Group Name, Impressions, Clicks, CTR, CPC, Spend, 7 Day Total Sales, 7 Day Total Orders (#), 7 Day Conversion Rate, ACOS, ROAS, Portfolio name.

Recommended:
- **Target ACoS** (per campaign or brand) — from project instructions. If absent, derive break-even ACoS from margin, or fall back to a default (30%) and flag it loudly.
- **ASP / AOV** per ASIN or brand — to convert target ACoS into a target CPA and an implied exact bid. If absent, use CPC-based thresholds and note the reduced precision.
- **Targeting Report** — to know which terms are already live as exact (so harvest doesn't duplicate an existing target — the #1 cause of self-competition).
- **Brand-term list** — terms to exempt from negation (brand defense).

Optional: SB and SD search term reports (same logic, separate source tags).

## Step 0 — Set the target first (interactive intake)

Do this before classifying anything. Announce the report needed — **SP Search Term Report** (required; SB/SD optional) — and flag it if not provided, with the fetch path (Ads console → Reports → Search term). Then check project instructions/context for target ACoS (and break-even from margin) and the period. If present, use and confirm in one line. Only if missing, ask in ONE round using tappable options where supported: target ACoS; ASP/AOV (to set target CPA) if not derivable; period. If the user defers, use documented defaults (break-even, else 30% ACoS) and state them on the Summary tab. Never block — a missing target lowers threshold precision, it doesn't stop the run. Frame the output as **current → target → projected-after-actions**.

## Method

**1. Load & normalize.** Map columns via the alias table. Tag each row's source (SP/SB/SD, campaign, ad group, match type). Compute target CPA = target ACoS × ASP where ASP is known.

**2. Classify every search term** into exactly one primary action using the decision order below (first match wins). Thresholds are defaults from the reference file, all overridable:

- **Harvest** — orders ≥ 2 AND ACoS ≤ target ACoS AND the term is coming from a discovery source (Auto campaign, or Broad/Phrase match) AND is not already an exact target elsewhere. → promote to Exact.
- **Negative (zero-order waste)** — orders = 0 AND (clicks ≥ 10 OR spend ≥ 2 × target CPA). → Negative Exact in the source ad group. (If ASP unknown: orders = 0 AND clicks ≥ 10.)
- **Bid-down (over-target converter)** — orders ≥ 1 AND ACoS > target ACoS. → keep the term, reduce bid toward target; do NOT negate.
- **Hold** — everything else (converting at/under target but not yet harvest-eligible, or too little data).

Never place a brand-defense term into Negative. Flag competitor/ASIN-intent terms for human confirmation rather than auto-negating (intent is a judgment call).

**3. Compute recommendations:**
- Harvest starting bid = `min(current CPC × 1.15, target-implied bid)`, where target-implied bid = target ACoS × ASP × CVR (CVR = 7 Day Conversion Rate). Round to 2dp; respect any account min bid.
- Bid-down new bid = `current CPC × (target ACoS ÷ actual ACoS)`, bounded to −25% per cycle (don't over-correct on thin data; require clicks ≥ 10 to act).
- For every harvest, also generate a **Negative Exact of that term in the source discovery campaign** — this seals the winner so the auto/broad campaign stops bidding against the new exact.

**4. Quantify (predictive layer):**
- Wasted spend (period) = Σ spend of Negative-classified terms.
- Projected monthly savings = wasted spend ÷ period_days × 30.
- Over-target bleed = Σ spend above target on Bid-down terms = Σ (spend − orders × ASP × targetACoS), floored at 0.

**5. Project the path to target (gap-to-goal).** Estimate the ACoS after these actions are applied:
`projected ACoS ≈ (spend − wasted_spend − biddown_savings) ÷ (ad_sales + harvest_incremental_sales)`,
where biddown_savings = Σ over-target bleed captured by the bid-downs, and harvest_incremental_sales is the expected sales from promoted exacts at their target-implied efficiency. Compare projected ACoS vs target and give a feasibility verdict: *reaches target this cycle* / *reaches target in ~N cycles* (bid moves are bounded ±25%/cycle) / *cannot reach with search-term levers alone* (e.g. target < break-even → margin problem; or the account is efficient already and the gap is structural). State assumptions; these are directional estimates.

**6. Build the bulk tab.** Emit Sponsored Products bulk-sheet rows for: Negative Keyword creates, Keyword creates (harvested exacts), and Keyword bid Updates (bid-downs). Use the exact columns/enums in the reference. Campaign ID and Ad Group ID are Amazon-generated — if the report doesn't carry them, leave the ID cells as `<FILL: Campaign ID>` placeholders and add a Notes cell instructing the user to paste IDs from a fresh bulk download, OR (for brand-new exact campaigns) mark them as "create-by-name" rows. Be explicit; never invent an ID.

**7. Write the workbook** and hand to `present_files`.

## Output workbook structure

ALWAYS these tabs:

1. **Summary** — wasted spend $, projected monthly savings $, over-target bleed $, # harvest, # negatives, # bid-downs, the target ACoS / assumptions used, **current blended ACoS → projected ACoS after actions vs target, and the feasibility verdict**.
2. **Leakage_Audit** — every Negative-classified term: term, source campaign/ad group/match, impressions, clicks, spend, orders, ACoS, rule fired, period savings, projected monthly savings.
3. **Harvest_Candidates** — term, source, orders, ACoS, current CPC, CVR, suggested exact bid, target campaign/ad group, and the paired source-negative.
4. **Negatives** — term, negative match type (Negative Exact / Negative Phrase), source campaign/ad group, reason.
5. **Bid_Downs** — term/target, current bid, actual ACoS, target ACoS, new bid, bound applied.
6. **Bulk_Upload** — Sponsored Products bulk-sheet rows (creates + updates), IDs filled or flagged. This is the only tab meant to be uploaded to Amazon.

## Examples

**Harvest:** `organic tea tree oil` from an Auto campaign — 5 orders, ACoS 18% (target 30%), not yet exact. → Harvest to Exact in the manual campaign at bid = min(CPC×1.15, 0.30×ASP×CVR); add Negative Exact `organic tea tree oil` to the Auto campaign.

**Negative:** `dog shampoo` under a human-hair-product ad group — 22 clicks, $19 spend, 0 orders (target CPA $9). → Negative Exact in that ad group; period savings $19, projected ~$58/mo.

**Bid-down:** `memory foam pillow king` — 3 orders, ACoS 46% (target 30%), 14 clicks. → keep; new bid = CPC × (0.30/0.46), capped at −25%.

## When to Ask Questions

Ask only if:
- No target ACoS is provided AND margin/ASP is also absent (needed to set thresholds) — offer to proceed on a 30% default if they prefer.
- The Search Term Report can't be parsed into term-level rows.

Otherwise proceed with documented defaults. Don't ask permission to act.

## Anti-flaw rules (do not violate)

- Never negate a term that has orders (it converts — manage the bid instead).
- Never negate a brand-defense term; when unsure if a term is brand or competitor, flag for confirmation, don't auto-negate.
- Every harvested exact MUST get a paired source-campaign negative, or you create self-competition.
- Never fabricate Campaign/Ad Group/Keyword IDs — flag placeholders instead.
- State the target ACoS and every default threshold actually used, on the Summary tab.
- Never claim these actions will hit the target when they can't (target < break-even, or the gap is structural) — give an honest *reaches target in ~N cycles* / *cannot reach with search-term levers alone* verdict instead.

## Changelog

**v2.1** — Step 0 now announces the required Search Term Report and its fetch path, flagging it if missing.

**v2** — Added Step 0 targets intake and a gap-to-goal projection: current blended ACoS → projected ACoS after negatives/harvest/bid-downs → vs target, with a feasibility verdict on the Summary tab.

**v1** — Initial release. Harvest / negate / bid-down decision order keyed to target ACoS + break-even; paired source-negatives on harvest; SP bulk-sheet upload tab with ID-placeholder safety; savings + bleed quantification.
