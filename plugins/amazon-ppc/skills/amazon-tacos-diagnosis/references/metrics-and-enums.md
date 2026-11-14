# Metrics, Column Aliases & Enums — TACoS Diagnosis

Table of contents: 1) Column alias map · 2) Formulas · 3) Severity & RAG thresholds · 4) Owner-surface enum · 5) Attribution caveats.

## 1. Column alias map

Amazon report headers vary by console version, report type, and region. Normalize incoming columns to canonical names by matching case-insensitively against these aliases. Never fail on a header mismatch — map, then proceed.

| Canonical | Known aliases (any of) |
|---|---|
| ad_spend | Spend, Cost, Total Spend |
| ad_sales | 7 Day Total Sales, 14 Day Total Sales, Total Sales, Sales, 7 Day Total Sales (₹/$) |
| ad_orders | 7 Day Total Orders (#), 14 Day Total Orders (#), Orders, Total Orders |
| impressions | Impressions |
| clicks | Clicks |
| cpc | Cost Per Click (CPC), CPC |
| ctr | Click-Thru Rate (CTR), CTR |
| acos | Total Advertising Cost of Sales (ACOS), ACOS, ACoS |
| roas | Total Return on Advertising Spend (ROAS), ROAS, ROAS |
| advertised_asin | Advertised ASIN, ASIN, (Child) ASIN |
| advertised_sku | Advertised SKU, SKU |
| campaign | Campaign Name, Campaign |
| portfolio | Portfolio name, Portfolio |
| child_asin | (Child) ASIN, Child ASIN, ASIN |
| sessions | Sessions, Sessions - Total, Sessions – Total |
| session_pct | Session Percentage, Session Percentage - Total |
| buybox_pct | Featured Offer (Buy Box) Percentage, Buy Box Percentage, Buy Box % |
| units_ordered | Units Ordered, Units Ordered - Total |
| unit_session_pct | Unit Session Percentage, Unit Session Percentage - Total |
| ordered_product_sales | Ordered Product Sales, Ordered Product Sales - Total |
| page_views | Page Views, Page Views - Total |

SQPR (Search Query Performance) columns: `Search Query`, `Search Query Volume`, `Impressions: Total Count`, `Impressions: ASIN Share %`, `Clicks: ASIN Share %`, `Cart Adds: ASIN Share %`, `Purchases: Total Count`, `Purchases: ASIN Share %`. The `Purchases: ASIN Share %` is the organic-vs-total purchase share used to detect "renting owned traffic".

## 2. Formulas

- Total Sales (per ASIN) = ordered_product_sales (Business Report; ship-based, includes organic + ad)
- Ad Sales (per ASIN) = Σ ad_sales across SP+SB+SD for that advertised ASIN
- Organic Sales = max(Total Sales − Ad Sales, 0); if raw value < 0, flag "attribution/halo mismatch"
- ACoS = ad_spend ÷ Ad Sales
- TACoS = ad_spend ÷ Total Sales
- Ad-Sales Dependency = Ad Sales ÷ Total Sales
- CVR = unit_session_pct (already sessions→units conversion)
- ASP = ordered_product_sales ÷ units_ordered
- Net contribution margin = ordered_product_sales − COGS − referral_fee − FBA_fee − ad_spend
  - referral_fee ≈ referral_rate × ordered_product_sales (default 15% if category rate unknown — flag the assumption)
- Break-even ACoS = (ASP − COGS_per_unit − fees_per_unit) ÷ ASP  (the ACoS at which an incremental ad-driven sale earns zero contribution)
- Profit rule: target ACoS should sit below break-even ACoS; an ASIN with actual ACoS > break-even is losing money on its ad-driven units.

Sales variance bridge (chained; hold prior for un-stepped factors):
```
units = sessions * buybox_pct * cvr
sales = units * asp
traffic_effect  = d_sessions * buybox_p * cvr_p * asp_p
buybox_effect   = sessions_c * d_buybox * cvr_p * asp_p
cvr_effect      = sessions_c * buybox_c * d_cvr * asp_p
price_effect    = sessions_c * buybox_c * cvr_c * d_asp
# sum ≈ d_sales (chaining residual is small; report residual if > 5%)
```
TACoS bridge: `d_tacos ≈ (d_spend / sales_c) − (spend_p * d_sales / (sales_p * sales_c))`.

## 3. Severity & RAG thresholds (defaults — overridable via project instructions)

Driver severity (share of the ASIN's total sales change explained by that driver):
- High: driver explains ≥ 50% of |ΔTotal Sales|, or the ASIN flipped from profit to loss
- Medium: 20–50%
- Low: < 20%

RAG vs target (per metric):
- TACoS: Green ≤ target; Amber ≤ 1.25× target; Red > 1.25× target
- Net margin: Green ≥ target margin; Amber 0 to target; Red < 0
- Ad dependency (mature ASIN): Green stable/falling; Amber +5–10pt; Red > +10pt WoW/MoM

## 4. Owner-surface enum

Every recommended action carries exactly one owner:
- **Paid** — bids, budgets, placements, targeting, negatives (hand to reallocation / search-term skills)
- **Organic** — SEO/listing keywords, backend terms, rank strategy
- **Retail** — price, Buy Box, catalog/variation, content/A+, reviews
- **Ops** — stock/restock, suppression, case management

## 5. Attribution caveats (state these when relevant)

- Ad-attributed sales use a click-attribution window (SP default 7-day; some reports 14-day) and can include **halo** (sales of other ASINs from an ad click). Business-Report sales are ship/order-based. So Ad Sales and the ASIN's share of Total Sales are not perfectly commensurable — treat Organic Sales as an estimate and flag large mismatches rather than trusting the exact figure.
- SB/SD sales can double-count with SP on the same ASIN. When summing across ad types, note the possible overlap; do not present the sum as exact incremental.
