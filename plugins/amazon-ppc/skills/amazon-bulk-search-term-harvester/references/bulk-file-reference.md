# Bulk-File Reference — schema, parsing, normalization, coverage, upload

Contents: 1) Bulk-file sheets · 2) Parsing gotcha + pattern · 3) Key columns · 4) Term normalization · 5) Coverage definition · 6) Gap types & thresholds · 7) Harvest bulk schema.

## 1. Bulk-file sheets (Amazon Ads bulk export .xlsx)

Validated against a real 30-day export. Sheets present in a full export: `Portfolios`, `Sponsored Products Campaigns`, `Config`, `Sponsored Brands Campaigns`, `SB Multi Ad Group Campaigns`, `Sponsored Display Campaigns`, `SP Search Term Report`, `SB Search Term Report`, `RAS Campaigns`, `RAS Search Term Report`, `Sheet10`. Names are stable but new ad-type sheets appear over time.

Match sheets **precisely**: use `Sponsored Products Campaigns`, `SP Search Term Report`, and (optional) `SB Search Term Report`. Do NOT grab any sheet merely containing "Search Term" — that would also match `RAS Search Term Report`. This skill needs the SP Campaigns sheet (targets) + at least the SP Search Term Report sheet. SB is optional (often near-empty). RAS / SD / SB-Multi are out of scope here.

## 2. Parsing gotcha + pattern (critical)

Amazon bulk exports frequently declare a bogus `A1:A1` worksheet dimension. With `openpyxl` `read_only=True`, iteration honors that dimension and truncates every row to a single column — silently parsing zero data. Always call `ws.reset_dimensions()` on each sheet before iterating, and verify row counts after load.

```python
import openpyxl
def read_sheet(path, sheet_match):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    name = next(s for s in wb.sheetnames if sheet_match.lower() in s.lower())
    ws = wb[name]
    ws.reset_dimensions()               # <-- without this, rows truncate to 1 column
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    header, data = rows[0], rows[1:]
    assert len(data) > 0, f"{name} parsed empty — check reset_dimensions()"
    return header, data
```
(pandas alternative: `pd.read_excel(path, sheet_name=..., engine='openpyxl')` usually sidesteps the dimension bug, but validate row counts either way.)

## 3. Key columns (validated against a real export)

**Sponsored Products Campaigns sheet** (~54 cols; one row per entity, `Entity` says which). Editable columns plus many `(Informational only)` mirrors. Real columns include: `Product`, `Entity`, `Operation`, `Campaign ID`, `Ad Group ID`, `Portfolio ID`, `Ad ID`, `Keyword ID`, `Product Targeting ID`, `Campaign Name`, `Ad Group Name`, `Campaign Name (Informational only)`, `Ad Group Name (Informational only)`, `Portfolio Name (Informational only)`, `Targeting Type`, `State`, `Campaign State (Informational only)`, `Ad Group State (Informational only)`, `Daily Budget`, `SKU`, `ASIN (Informational only)`, `Ad Group Default Bid`, `Bid`, `Keyword Text`, `Match Type`, `Bidding Strategy`, `Placement`, `Percentage`, `Product Targeting Expression`, `Impressions`, `Clicks`, `Click-through Rate`, `Spend`, `Sales`, `Orders`, `Units`, `Conversion Rate`, `ACOS`, `CPC`, `ROAS`.
- Confirmed `Entity` values: Keyword, Negative Keyword, Product Targeting, Negative Product Targeting, Bidding Adjustment, Product Ad, Ad Group, Campaign, Campaign Negative Keyword, Campaign Negative Product Targeting.
- Confirmed `Match Type` values: Broad, Phrase, Exact, Negative Exact, Negative Phrase.
- Confirmed `State`: enabled, paused (archived may also appear).
- Keyword targets = rows where `Entity` = `Keyword`; they carry `Keyword Text`, `Match Type`, `State`, `Impressions`, and real `Campaign ID` / `Ad Group ID` / `Keyword ID`. Use the ID columns (not names) for the harvest upload; when a name is needed, prefer the editable `Campaign Name` over the `(Informational only)` variant.

**SP / SB Search Term Report sheets** (~27 / ~25 cols). Real columns: `Product`, `Campaign ID`, `Ad Group ID`, `Keyword ID`, `Product Targeting ID`, `Campaign Name (Informational only)`, `Ad Group Name (Informational only)`, `Portfolio Name (Informational only)`, `State`, `Bid`, `Keyword Text`, `Match Type`, `Product Targeting Expression`, `Customer Search Term`, `Impressions`, `Clicks`, `Click-through Rate`, `Spend`, `Sales`, `Orders`, `Units`, `Conversion Rate`, `ACOS`, `CPC`, `ROAS`.
- Metrics are plain `Sales` / `Orders` / `ACOS` / `CPC` / `Conversion Rate` here (NOT the standalone report's "7 Day Total Sales"). Map accordingly.
- `Match Type` in the search-term sheet can be auto values: `loose-match`, `close-match`, `complements`, `substitutes` (auto-targeting source) as well as Broad/Phrase/Exact. The customer search term is normalized regardless of source.
- Each term row carries its source `Campaign ID` / `Ad Group ID` — use these for the paired source-negative row.
- ASP per term ≈ `Sales / Orders` (where Orders > 0) if a per-term price is needed for the harvest bid.

## 4. Term normalization (apply to BOTH search terms and keyword targets)

- Unicode NFKC; smart quotes -> straight quotes.
- Lowercase, trim, collapse internal whitespace to single spaces.
- Strip leading/trailing punctuation; keep internal apostrophes and hyphens.
- Simple plural singularization (drop trailing `s` / `es` / `ies` -> `y`) with a stoplist so real words aren't mangled: gas, class, lens, series, glass, bus, gps, news, plus, analysis, ... (extend as needed).
- Result: "car tip" and "car tips" collapse to one term and match a keyword in either form.
- Drop ASIN-form terms matching `^B[A-Z0-9]{9}$` (case-insensitive) — keyword harvesting only.

## 5. Coverage definition (scope-sensitive)

Within the campaigns currently in scope:
- A term is **covered in match type M** if there exists an enabled `Keyword` entity with that normalized text, `Match Type = M`, `State = enabled` (and its ad group / campaign enabled), and `Impressions > 0`.
- Paused, archived, or zero-impression keywords do NOT count as coverage.
- Coverage is recomputed for whatever scope (portfolio / campaign substring) is active — a term covered account-wide may be uncovered within a specific ASIN's campaigns.

## 6. Gap types & thresholds (defaults, overridable)

| Gap type | Rule | Action |
|---|---|---|
| Uncovered converter | orders ≥ min_orders (1) AND ACoS ≤ target AND not covered in any match type | Harvest to Exact (priority) |
| Broad-only converter | covered only in Broad AND converting | Add Phrase/Exact |
| Uncovered non-converter | spend but 0 orders AND untargeted | Not a harvest; hand to optimizer negatives |
| Over-covered | covered in Exact AND Phrase AND Broad | Consolidate (dedupe self-competition) |

- coverage_% = Σ ad sales of covered converting terms ÷ Σ ad sales of all converting terms, in scope.
- harvestable_sales = Σ ad sales of uncovered converters.
- harvest starting bid = min(term CPC × 1.15, target ACoS × ASP × CVR); ASP from account/brand context, else CPC-based.

## 7. Harvest bulk upload schema (SP)

Emit rows in the Sponsored Products bulk format (same columns as the optimizer/reallocation skills). Because the bulk file has real IDs, fill them:

**Harvest (new exact keyword in the manual/harvest campaign):**
```
Sponsored Products | Keyword | Create | <manual Campaign ID> | <manual Ad Group ID> | | | | | | | | | | enabled | | | | | <bid> | <term> | Exact | | |
```
**Paired source negative (in the discovery auto/broad campaign the term came from):**
```
Sponsored Products | Negative Keyword | Create | <source Campaign ID> | <source Ad Group ID> | | | | | | | | | | enabled | | | | | | <term> | Negative Exact | | |
```
IDs come from the bulk file's SP Campaigns sheet (map campaign/ad-group name -> ID). If a target manual campaign doesn't exist yet, create it by name and reference child rows by name within the same upload. Never invent an ID; flag if genuinely missing.
