# Bulk Sheet Schema, Enums & Thresholds — Search-Term Optimizer

Contents: 1) Column alias map · 2) SP bulk-sheet columns · 3) Enums · 4) Default thresholds · 5) Row recipes.

## 1. Column alias map (Search Term Report)

| Canonical | Aliases |
|---|---|
| search_term | Customer Search Term, Search Term |
| targeting | Targeting, Keyword, Keyword Text |
| match_type | Match Type |
| campaign | Campaign Name, Campaign |
| ad_group | Ad Group Name, Ad Group |
| impressions | Impressions |
| clicks | Clicks |
| ctr | Click-Thru Rate (CTR), CTR |
| cpc | Cost Per Click (CPC), CPC |
| spend | Spend, Cost |
| sales | 7 Day Total Sales, 14 Day Total Sales, Sales |
| orders | 7 Day Total Orders (#), 14 Day Total Orders (#), Orders |
| cvr | 7 Day Conversion Rate, Conversion Rate |
| acos | Total Advertising Cost of Sales (ACOS), ACOS |
| roas | Total Return on Advertising Spend (ROAS), ROAS |
| portfolio | Portfolio name, Portfolio |

## 2. Sponsored Products bulk-sheet columns (upload tab)

Use this column order. Cells not relevant to a given entity are left blank.

`Product | Entity | Operation | Campaign ID | Ad Group ID | Portfolio ID | Ad ID | Keyword ID | Product Targeting ID | Campaign Name | Ad Group Name | Start Date | End Date | Targeting Type | State | Daily Budget | SKU | ASIN | Ad Group Default Bid | Bid | Keyword Text | Match Type | Bidding Strategy | Placement | Percentage | Product Targeting Expression`

- `Product` is always the literal `Sponsored Products` for SP rows.
- IDs (Campaign ID, Ad Group ID, Keyword ID) are Amazon-generated. If not present in the source data, write `<FILL: Campaign ID>` / `<FILL: Ad Group ID>` and note it. For a brand-new exact campaign/ad group, you may use Campaign Name + Ad Group Name "create-by-name" rows and reference them by name in child rows (Amazon links by name within a single upload when IDs are blank on create).

## 3. Enums (exact values Amazon accepts)

- **Entity**: `Campaign`, `Ad Group`, `Product Ad`, `Keyword`, `Product Targeting`, `Negative Keyword`, `Campaign Negative Keyword`, `Bidding Adjustment`
- **Operation**: `Create`, `Update`, `Archive`
- **Match Type**: `Broad`, `Phrase`, `Exact`, `Negative Exact`, `Negative Phrase`
- **State**: `enabled`, `paused`, `archived`
- **Targeting Type**: `Manual`, `Auto`
- **Bidding Strategy**: `Dynamic bids - down only`, `Dynamic bids - up and down`, `Fixed bids`
- **Placement** (for Bidding Adjustment rows): `Placement Top`, `Placement Product Page`, `Placement Rest Of Search`

## 4. Default thresholds (override via project instructions)

| Rule | Default |
|---|---|
| Harvest: min orders | 2 |
| Harvest: max ACoS | ≤ target ACoS |
| Harvest starting bid | min(CPC × 1.15, targetACoS × ASP × CVR) |
| Negative: min clicks (0 orders) | 10 |
| Negative: alt spend trigger (0 orders) | spend ≥ 2 × target CPA |
| Bid-down: trigger | orders ≥ 1 AND ACoS > target ACoS |
| Bid-down: min clicks to act | 10 |
| Bid-down: max change per cycle | −25% |
| Default target ACoS (only if none supplied) | 30% (flag it) |
| target CPA | target ACoS × ASP |

## 5. Row recipes

**Harvest (new exact keyword in manual campaign):**
```
Sponsored Products | Keyword | Create | <manual Campaign ID or name> | <manual Ad Group ID or name> | | | | | | | | | | enabled | | | | | <bid> | <search_term> | Exact | | |
```
**Seal source (negative exact in the discovery campaign):**
```
Sponsored Products | Negative Keyword | Create | <source Campaign ID> | <source Ad Group ID> | | | | | | | | | | enabled | | | | | | <search_term> | Negative Exact | | |
```
**Zero-order negative:**
```
Sponsored Products | Negative Keyword | Create | <source Campaign ID> | <source Ad Group ID> | | | | | | | | | | enabled | | | | | | <search_term> | Negative Exact | | |
```
**Bid-down (update existing keyword bid):**
```
Sponsored Products | Keyword | Update | <Campaign ID> | <Ad Group ID> | | | <Keyword ID> | | | | | | | enabled | | | | | <new_bid> | <keyword text> | <existing match type> | | |
```
