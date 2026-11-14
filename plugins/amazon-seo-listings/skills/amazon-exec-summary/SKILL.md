---
name: amazon-exec-summary
description: "Produce a one-page, client/executive-facing Amazon performance summary answering three questions: how much did we spend, what did we get (total sales, TACoS, net contribution margin, share of voice), and what should change (exactly three recommendations ranked by projected margin/revenue impact). Includes a top-line KPI dashboard, a short narrative, and a brief forward look. Use whenever the user needs a client update, monthly/quarterly business review, leadership summary, board/CFO/CMO-facing recap, or a one-pager — not a campaign-level deep dive. ROI framing, no console jargon; rank recommendations by impact, not effort; be honest about uncertainty."
---

# Amazon Executive Summary


## ▶ Before you run (pre-flight)

- **This skill is for:** a one-page client/leadership recap — what we spent, what we got, and three ranked recommendations.
- **You get back:** a top-line KPI dashboard, a short narrative, and a brief forward look, in ROI language with no console jargon.
- **Pull this first:** two periods of *spend + ad sales + total sales*. Optional: margin inputs and SQP (for share of voice).
- **Wrong tool?** Need the detailed internal version → **amazon-weekly-digest**.
- **Optional companions:** none.

If the periods to compare aren't clear, confirm them in one line, then run.

A one-page summary for a client, CFO, or CMO. Unlike the weekly digest (for the working team), this answers only what leadership cares about: spend, return, and the few decisions that move the number. Everything is framed in money and margin, not campaigns and match types.

Consumes the same underlying data as the diagnosis/reallocation skills, aggregated to brand or portfolio for the period (month or quarter).

## Inputs

- Period ad spend, ad sales, total sales (brand/portfolio) for the current period and the comparison period (MoM and/or YoY).
- Margin inputs (COGS, fees) for net contribution margin — if absent, present sales/TACoS and flag margin as unavailable.
- Optional: SQPR / category data for share-of-voice or category-share context; a seasonality note for the forward look.
- Targets (TACoS, margin, growth) if the client has them.

## Output format — ONE PAGE, exactly three sections

Produce a one-page docx or PDF (Markdown if the user just wants text). Use THIS structure:

```
# [Client / Brand] — Amazon Performance — [Period]

## 1. KPI dashboard  (a compact table, current vs comparison, with deltas)
   Total Sales · Ad Spend · Ad Sales · TACoS · ACoS · Net Contribution Margin · (Share of Voice / Category Share if available)
   Show MoM and/or YoY. Signed deltas. RAG in words vs target.

## 2. What happened & why  (one short paragraph, ≤ 6 sentences)
   The headline story in plain language: what moved, the single biggest driver, current-vs-target with the expected trajectory (on track / N months to target / target needs a structural change), and the forward look (next period / seasonality). No jargon.

## 3. Three recommendations, ranked by impact
   Rec 1 (highest projected margin/revenue impact) — one-line rationale — expected impact ($ or %, directional) — owner.
   Rec 2 — ...
   Rec 3 — ...
```

Exactly three recommendations. Rank by projected impact, not by how easy they are. Each carries a directional expected impact and an owner.

## Method

0. **Confirm targets first.** Pull target TACoS/margin/growth from context; if a client has none, ask once or present current vs a sensible benchmark and label it as such. Don't block.
1. Aggregate to brand/portfolio for both periods; compute Total Sales, Ad Spend, Ad Sales, TACoS, ACoS, Net Margin, and (if data allows) share of voice from SQPR.
2. Identify the single biggest driver of the period's result (lean on `amazon-tacos-diagnosis` output if present) for the narrative.
3. Build the forward look: month/quarter-end pace projection and any seasonality event in the next period (Prime Day, Prime Big Deal Days, BFCM, Back-to-School, Q4).
4. Derive three recommendations from the biggest levers (a donor→recipient budget move, a margin fix on a loss-making ASIN, an organic/listing push where paid is renting owned traffic, etc.), rank by projected impact, attach expected impact + owner.
5. Keep it to one page. Deliver via `present_files`.

## Examples

**Rec ranked by impact, not effort:** "Rec 1 (High): Reallocate ~$X/mo from [donor campaign, ACoS 48%] to [recipient, ACoS 18%, out of budget 40% of day]. Expected: +~$Y sales at flat spend, TACoS −~2pt. Owner: Paid." ranks above an easy-but-small "tidy up 6 negative keywords."

## When to Ask Questions

Ask only if the period or comparison basis (MoM vs YoY) is ambiguous. Otherwise proceed; if margin inputs are absent, present sales/TACoS and state margin is unavailable rather than blocking.

## Anti-flaw rules

- One page. If it's spilling over, cut detail — this is not the weekly digest.
- Money/margin framing throughout; strip campaign/match-type jargon.
- Exactly three recommendations, ranked by projected impact with a directional number and an owner.
- Be honest about uncertainty in the forward look; label projections as estimates.
- Never present ACoS as the headline; lead with Total Sales, TACoS, and Net Margin.

## Changelog

**v2** — Added target confirmation (Method step 0) and an explicit current-vs-target + trajectory line in the narrative (on track / N months to target / needs a structural change).

**v1** — Initial release. One-page three-section format (KPI dashboard / narrative / three ranked recs), impact-ranked recommendations with owners, forward look with seasonality, margin-aware with graceful fallback.
