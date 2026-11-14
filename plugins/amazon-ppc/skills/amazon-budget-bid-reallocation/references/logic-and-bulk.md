# Logic, Roles & Bulk Schema — Budget & Bid Reallocation

Contents: 1) Column aliases · 2) Role rules · 3) Constraint score · 4) Projection math · 5) Bulk schema.

## 1. Column aliases (Campaign / Budget reports)

| Canonical | Aliases |
|---|---|
| campaign | Campaign Name, Campaign |
| portfolio | Portfolio name, Portfolio |
| spend | Spend, Cost |
| sales | 7 Day Total Sales, 14 Day Total Sales, Sales |
| orders | 7 Day Total Orders (#), Orders |
| acos | Total Advertising Cost of Sales (ACOS), ACOS |
| roas | Total Return on Advertising Spend (ROAS), ROAS |
| daily_budget | Daily Budget, Budget, Campaign Daily Budget |
| budget_util | Time In Budget, % Time In Budget, Budget Usage, Impression Share Lost To Budget, Out Of Budget |
| impressions | Impressions |
| clicks | Clicks |
| advertised_asin | Advertised ASIN, ASIN |
| days_of_cover | Days of Cover, Days of Supply, Sellable Days (from inventory calc) |

`budget_util` may arrive as "time in budget %" (higher = less constrained) or "impression share lost to budget" / "out of budget hours" (higher = more constrained). Detect direction from the column name and normalise so a **high constraint score = more starved**.

## 2. Role rules (defaults, overridable)

Let target = target ACoS (or break-even if target absent).

- **Donor**: acos > target AND acos > break_even AND roas < portfolio_median_roas AND constraint_score low (≤ 0.25). Underperforming and not starved → free money.
- **Recipient**: acos ≤ target AND roas ≥ portfolio_median_roas AND constraint_score high (≥ 0.5) AND days_of_cover ≥ 21. Efficient demand being capped by budget, safe to feed.
- **Hold**: everything else. Special flag "efficient but inventory-gated" when it would qualify as Recipient except days_of_cover < 21.

Require ≥ ~30 orders (or clicks ≥ 100) in the period before trusting a campaign's ROAS for scaling; below that, Hold with "insufficient data".

## 3. Constraint score (0–1)

Normalise the budget signal to [0,1] where 1 = most starved:
- If signal = "% time in budget": constraint = 1 − (time_in_budget_pct / 100).
- If signal = "impression share lost to budget %": constraint = lost_share / 100.
- If signal = "out of budget hours/day": constraint = hours_out / 24.
- If no signal: proxy constraint = min(spend / daily_budget, 1) capped, and lower confidence.

## 4. Projection math

- Pool = Σ over donors (spend × level), level ∈ {0.10, 0.20, 0.35}.
- Recipient weight = constraint_score × roas. Allocation_i = Pool × weight_i / Σ weight.
- Headroom cap: a recipient's budget increase should not exceed ~ (its typical out-of-budget shortfall). Approximate cap = daily_budget × constraint_score × 30 (period). Cap allocation at headroom.
- Marginal ROAS = roas × diminishing_factor (default 0.70). Incremental sales_i = allocation_i × marginal_roas_i.
- Donor sales loss = (spend_reduced_i) × roas_i × recovery_factor (default 0.85 — some of the cut spend was near-wasted, so lost sales < spend×roas). Document.
- Scenario projected total sales = base sales + Σ incremental recipient sales − Σ donor sales loss.
- Blended ACoS = total spend ÷ projected total ad sales. Blended TACoS only if total (ad+organic) sales context supplied.
- All projections are directional estimates under stated assumptions — label them as such, never as guarantees.

## 5. Bulk schema (bid changes & placement modifiers)

Same SP bulk columns as the search-term skill. Key rows:

**Bid update (target level):**
```
Sponsored Products | Keyword | Update | <Campaign ID> | <Ad Group ID> | | | <Keyword ID> | | | | | | | enabled | | | | | <new_bid> | <keyword text> | <match type> | | |
```
**Product-target bid update:** Entity `Product Targeting`, put id in `Product Targeting ID`, expression in `Product Targeting Expression`.

**Campaign daily-budget update:**
```
Sponsored Products | Campaign | Update | <Campaign ID> | | | | | | <Campaign Name> | | | | | enabled | <new daily budget> | | | | | | | | | |
```
**Top-of-Search modifier (Bidding Adjustment):**
```
Sponsored Products | Bidding Adjustment | Update | <Campaign ID> | | | | | | | | | | | | | | | | | | | <Bidding Strategy> | Placement Top | <percentage> |
```
Placement enum: `Placement Top`, `Placement Product Page`, `Placement Rest Of Search`. Percentage is the bid uplift (0–900).
