# Report Catalog — fetch paths & column notes

Contents: 1) Ads console reports · 2) Seller Central reports · 3) Brand Analytics · 4) Keepa · 5) Helium 10 · 6) Intentwise & margin · 7) Format tips.

Paths reflect the current UI and can shift; if one moved, search the report name. Prefer XLSX or CSV exports.

## 1. Amazon Ads console (ads.amazon.com)
Sponsored ads → Measurement & Reporting → Reports → "Create report". Choose **Ad product** (Sponsored Products / Sponsored Brands / Sponsored Display), **Report type**, **date range/unit** (daily or summary), then Download.

| Report type | Grain | Used for |
|---|---|---|
| Advertised product | Advertised ASIN/SKU × campaign | Ad spend & ad sales per ASIN (tacos-diagnosis) |
| Search term | Customer search term × ad group | Harvest / negatives / bid-down (search-term-optimizer) |
| Campaign | Campaign | Ranking, reallocation (budget-bid-reallocation) |
| Targeting | Keyword / product target | Match types, already-exact check |
| Placement | Placement (Top / Product page / Rest) | Placement modifiers |
| Budget | Campaign budget | Out-of-budget / time-in-budget signal |

Run the same type for SP, SB, and SD separately when the brand runs all three, then combine.

## 2. Seller Central
- **Business Report — Detail Page Sales and Traffic by Child Item:** Reports → Business Reports → left panel "By ASIN" → *Detail Page Sales and Traffic by Child Item* → set date range → Download. Key columns: Sessions, Session Percentage, Page Views, **Featured Offer (Buy Box) Percentage**, Units Ordered, Unit Session Percentage (= CVR), Ordered Product Sales.
- **FBA Inventory:** Reports → Fulfillment → Inventory → *FBA Inventory* (sellable units) ; **Inventory Ledger** (units over time → OOS days) ; Inventory → *Restock Inventory* (days of supply, recommended restock). IPI/aged: Inventory → Inventory Planning.

## 3. Brand Analytics (requires Brand Registry)
Brands → Brand Analytics.
- **Search Query Performance (SQPR)** — Search Query × ASIN: impression/click/cart-add/purchase totals and **ASIN share %** (organic-vs-total purchase share). Choose ASIN or brand view + weekly/monthly/quarterly.
- **Top Search Terms (Amazon Search Terms)** — search frequency rank + top-3 clicked ASINs, click & conversion share.
- Market Basket, Repeat Purchase Behavior, Demographics (situational).

## 4. Keepa (retail history — the signals Amazon doesn't export)
Open the product on keepa.com → the **Data** tab / CSV export (or Keepa API). Available series over time: Amazon price, New price, **Buy Box price & Buy Box seller**, **Sales Rank (BSR)**, **Rating**, **Review count**, offer count. Use it for: price-change timing, Buy Box loss timing, rating/review slips, and BSR spikes (OOS proxy). This is the primary source for rating history and price history in tacos-diagnosis.

## 5. Helium 10
- **Cerebro** (reverse-ASIN): organic + sponsored rank per keyword for an ASIN.
- **Keyword Tracker**: rank over time (slope → rank trajectory for the flywheel view / digest rank watch).
- **Market Tracker**: category share.

## 6. Intentwise & margin inputs
- **Intentwise**: connected Amazon ads + retail analytics (included in the current plan) — an alternative to manual exports for near-real-time pulls.
- **Margin inputs** (internal): COGS per unit, referral fee % (category rate; Amazon fee schedule), FBA fulfilment fee (from a fee preview or an internal cost sheet). Needed for net contribution margin and break-even ACoS.

## 7. Format tips
- Prefer CSV/XLSX; keep Amazon's original headers so alias-mapping works.
- Match date ranges across reports for a given run (same start/end) so the join is apples-to-apples.
- For period-over-period, export the current window and the comparison window separately, or one longer window with a date column the skill can split.
