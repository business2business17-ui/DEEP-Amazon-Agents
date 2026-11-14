---
name: amazon-budget-bid-reallocation
description: "Rank Amazon advertising campaigns (SP/SB/SD, one brand or a whole portfolio) by efficiency, identify donors (high-ACoS/low-ROAS, unconstrained) and recipients (low-ACoS/high-ROAS, budget-constrained), and model three reallocation scenarios (conservative 10% / moderate 20% / aggressive 35%) with projected sales, blended ACoS/TACoS and margin — every increase gated by inventory days-of-cover. Emits an upload-ready bid-change bulk tab. Confirms your target ACoS/TACoS and preferred aggressiveness up front, and tells you which scenario reaches the target (or, honestly, that none do and what else is needed). Use whenever the user asks how to reallocate budget, where to cut or scale spend, which campaigns to fund, budget planning, bid optimization, or improving blended ROAS. Never increase spend on a SKU below the cover threshold, and never exceed the per-cycle bid bound."
---

# Amazon Budget & Bid Reallocation


## ▶ Before you run (pre-flight)

- **This skill is for:** deciding where to move ad budget and bids — fund efficient budget-constrained campaigns, cut inefficient unconstrained ones.
- **You get back:** three reallocation scenarios (conservative 10% / moderate 20% / aggressive 35%) + an upload-ready bid-change bulk tab, every increase gated by inventory days-of-cover.
- **Pull this first:** *Campaign Reports* (SP, plus SB/SD) — Ads console → Reports → Campaign. **Best:** the **bulk file** (real IDs + portfolio budgets). Also bring inventory days-of-cover.
- **Wrong tool?** Want to know *why* efficiency changed before you act → **amazon-tacos-diagnosis**.
- **Optional companions:** the *Budget / Placement Report* for time-in-budget and placement multipliers.

If no campaign or bulk data is attached, name it above and stop.

Most ad budgets are split on last year's habit, not this week's marginal efficiency. This skill finds the campaigns starving for budget while efficient, the campaigns wasting it, and models exactly what happens if you move money between them — with inventory as a hard gate so you never pour spend into a SKU about to stock out.

Read `references/logic-and-bulk.md` for column aliases, the donor/recipient rules, the projection assumptions, and the bulk-sheet schema. Read it before modelling.

## Inputs

Required:
- **Campaign Reports** — SP (and SB/SD if run), one brand or the whole book. Columns: Campaign Name, Portfolio name, Spend, Sales (7/14 Day Total Sales), Orders, Impressions, Clicks, ACOS, ROAS, and — critically — **Daily Budget** and a budget-utilization signal (see below).

Strongly recommended:
- **Budget utilization** — the *Budget* report or the "time in budget" / "% of day in budget" / "impression share lost to budget" signal. Without it, you can only infer constraint weakly from spend-vs-budget.
- **Target ACoS / ROAS** per campaign or brand (project instructions).
- **Inventory days-of-cover** per ASIN/SKU (FBA inventory / restock report, or the output of an inventory-cover calc). This is the recipient gate — see Anti-flaw rules.

Optional:
- Placement Report — to suggest Top-of-Search / Product-Page bid-modifier changes alongside budget moves.

## Step 0 — Set the target first (interactive intake)

Do this before modelling. Announce the reports needed — **Campaign Reports** (SP, +SB/SD; required), plus the **Budget/utilization** report and **inventory days-of-cover** (recommended, and the latter gates any spend increase) — and flag any missing with the fetch path. Then check project instructions/context for target ACoS/TACoS/ROAS, the period, and a preferred aggressiveness. If present, use and confirm in one line. Only if missing, ask in ONE round using tappable options where supported: target ACoS and/or TACoS; period; and reallocation aggressiveness (Conservative / Moderate / Aggressive / "model all three" — default is model all three). If the user defers on targets, derive from break-even or use a stated default and flag it. Never block. Frame the scenarios around **which one reaches the target**.

## Method

**1. Load & normalize.** Map columns. Compute per campaign: ACoS, ROAS, spend-vs-budget utilisation, and a constraint score. Join inventory cover to each campaign via its advertised ASIN(s); a campaign's cover = the min days-of-cover across its advertised SKUs (a campaign is only as safe to scale as its weakest-stocked SKU).

**2. Assign a role to every campaign** (see reference for exact rules):
- **Donor** — ACoS > target AND > break-even, low ROAS, and NOT budget-constrained (rarely runs out of budget). Money here is underperforming and available.
- **Recipient** — ACoS ≤ target, high ROAS, AND budget-constrained (runs out of budget / loses impression share to budget) AND inventory cover ≥ threshold (default 21 days). This is efficient demand you're capping.
- **Hold** — everything else, including efficient-but-low-cover campaigns (flagged as "efficient but inventory-gated").

**3. Model three scenarios.** For each aggressiveness level — Conservative (move 10% of total donor spend), Moderate (20%), Aggressive (35%):
- Pool = Σ (donor spend × level).
- Distribute the pool to recipients in proportion to (constraint severity × ROAS), capped so no recipient's budget rises more than its realistic headroom.
- Project incremental sales per recipient using **marginal** ROAS, not average: `marginal ROAS = campaign ROAS × diminishing_factor` (default 0.7) to reflect that added spend is less efficient than existing spend. Document this factor on the output.
- Roll up: projected total sales, blended ACoS, blended TACoS (if total-sales context is available), and projected contribution margin for each scenario. Spend is held roughly flat (it's reallocation), so the story is "same money, more sales."
- **Gap-to-goal per scenario:** state each scenario's projected blended ACoS/TACoS vs target and a verdict — *reaches target* / *closes the gap partway (needs another cycle)* / *does not reach target by reallocation alone*. If no scenario reaches the target, say so plainly and name the additional levers required (e.g. add budget, fix margin on loss-making ASINs, grow organic to lower TACoS) with owner surfaces.

**4. Bid changes (target level).** For targets with clicks ≥ 10, new bid = `current bid × (target ACoS ÷ actual ACoS)`, bounded to ±25% per cycle. Bids up only on targets inside recipient campaigns with adequate cover; bids down on donor targets. Emit as bulk-sheet Update rows.

**5. Placement modifiers (if Placement Report given).** Where Top-of-Search converts materially better than other placements, suggest a Top-of-Search bid adjustment; emit as Bidding Adjustment rows.

**6. Write the workbook** and hand to `present_files`.

## Output workbook structure

ALWAYS these tabs:

1. **Summary** — current blended ACoS/TACoS vs target and the gap; the recommended scenario + rationale (which one reaches the target, or the honest verdict if none do); the diminishing-returns factor used; and any inventory exclusions listed explicitly.
2. **Campaign_Ranking** — every campaign: spend, sales, ACoS, ROAS, daily budget, budget-utilisation / out-of-budget signal, min days-of-cover, assigned role (Donor / Recipient / Hold), and constraint score.
3. **Scenario_Conservative** — per campaign proposed budget delta + projected incremental sales/ACoS; scenario totals row (spend, projected sales, blended ACoS/TACoS, margin).
4. **Scenario_Moderate** — same structure, 20%.
5. **Scenario_Aggressive** — same structure, 35%.
6. **Bid_Changes** — target-level bid updates in SP bulk-sheet format, with bounds applied and the min-clicks guard noted.

## Examples

**Donor→Recipient:** Campaign A (auto, ACoS 48%, target 30%, ROAS 2.1, rarely out of budget) is a donor. Campaign B (exact, ACoS 19%, ROAS 5.3, out of budget 40% of the day, cover 60 days) is a recipient. Moderate scenario moves 20% of A's spend to B; projected incremental sales use marginal ROAS 5.3 × 0.7 = 3.7.

**Inventory gate:** Campaign C is efficient (ACoS 16%, out of budget) but its hero SKU has 11 days cover. Role = Hold ("efficient but inventory-gated"); excluded from recipients; noted on Summary. Scaling it would accelerate a stockout and lose the rank you'd pay to build.

## When to Ask Questions

Ask only if:
- No target ACoS/ROAS is provided and break-even can't be derived — offer a default and proceed.
- Campaign data can't be parsed.

Otherwise proceed. If inventory data is missing, do NOT silently recommend increases: set all recipients to Hold, and flag "inventory not provided — increases not gated; supply days-of-cover to enable scaling." If budget-utilisation data is missing, infer constraint from spend-vs-budget and lower the confidence note.

## Anti-flaw rules (do not violate)

- Never recommend a spend/bid increase for a campaign whose min days-of-cover is below the threshold (default 21). Route it to Hold and flag it.
- Never present average ROAS as the projected return on *added* spend — always apply the diminishing-returns factor and state it.
- Never exceed the per-cycle bid bound (default ±25%) or adjust a target with < 10 clicks.
- Spend is reallocated, not inflated, unless the user explicitly asks to add budget — keep total spend ~flat across scenarios and say so.
- Don't move budget into a campaign with too little conversion data to trust its ROAS.
- If no scenario reaches the target, say so plainly — never imply reallocation alone closes a gap that needs added budget, margin fixes, or organic growth.

## Changelog

**v2.1** — Step 0 now announces required Campaign/Budget/inventory inputs and fetch paths, flagging any missing.

**v2** — Added Step 0 targets + aggressiveness intake, and a gap-to-goal verdict per scenario (which scenario reaches target, or honest "not by reallocation alone" with the extra levers named).

**v1** — Initial release. Donor/recipient roles with budget-constraint scoring, inventory-gated recipients, three scenarios with marginal-ROAS projections, bounded bid changes, placement-modifier suggestions, six-tab workbook.
