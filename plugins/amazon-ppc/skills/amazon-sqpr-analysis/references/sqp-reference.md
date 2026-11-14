# SQP Reference — parsing, columns, formulas, tags, code

Contents: 1) File parsing · 2) Column dictionary · 3) Derived metrics · 4) Tag definitions · 5) Scorecard & funnel · 6) Movers · 7) Marketplace language markers · 8) Opportunity & rent/build/defend · 9) Thresholds · 10) Adaptable code.

## 1. File parsing

- SQP CSV **row 1 is metadata**, e.g. `ASIN or Product=["B0XXXXXXXX"],Reporting Range=["Monthly"],Select year=["2026"],Select month=["April"]`. Load data with `pd.read_csv(path, skiprows=1)`. Parse ASIN/brand, year, month/week from row 1 (regex) — fall back to the filename.
- **Filename pattern:** `US_Search_Query_Performance_ASIN_View_Simple_Month_YYYY_MM_DD.csv` (also `Brand_View`, and marketplace prefixes `US_/UK_/DE_/FR_/CA_/IT_/ES_/MX_`). Use the prefix for the default marketplace and the `ASIN_View`/`Brand_View` token for the view.
- **View detection:** ASIN view has `Impressions: ASIN Count` / `...: ASIN Share %`; Brand view has `Brand Count` / `Brand Share %`. Normalize either to the canonical `*_asin`/`*_share` names below and record which view it was.
- **Reporting range:** Monthly / Weekly / Quarterly — infer comparison unit from this + the periods.
- Multiple files in a folder: glob `*Search_Query_Performance*` (or `*SQP*`), parse each, sort by period. Different ASINs in ASIN view = don't merge across ASINs; handle per-ASIN or ask.

## 2. Column dictionary (map case-insensitively)

| Canonical | Aliases |
|---|---|
| q | Search Query |
| vol | Search Query Volume |
| imp_total | Impressions: Total Count |
| imp_asin | Impressions: ASIN Count, Impressions: Brand Count |
| imp_share | Impressions: ASIN Share %, Impressions: Brand Share % |
| clk_total | Clicks: Total Count |
| clk_asin | Clicks: ASIN Count, Clicks: Brand Count |
| clk_share | Clicks: ASIN Share %, Clicks: Brand Share % |
| clk_price_market | Clicks: Price (Median) |
| clk_price_asin | Clicks: ASIN Price (Median), Clicks: Brand Price (Median) |
| cart_total | Cart Adds: Total Count |
| cart_asin | Cart Adds: ASIN Count, Cart Adds: Brand Count |
| cart_share | Cart Adds: ASIN Share %, Cart Adds: Brand Share % |
| purch_total | Purchases: Total Count |
| purch_asin | Purchases: ASIN Count, Purchases: Brand Count |
| purch_share | Purchases: ASIN Share %, Purchases: Brand Share % |
| purch_price_asin | Purchases: ASIN Price (Median) |
| purch_price_market | Purchases: Price (Median) |

Share fields may be 0–100 or 0–1 — detect and normalize to %.

## 3. Derived metrics (per query)

- mkt_cvr = purch_total / clk_total × 100 (guard 0)
- asin_cvr = purch_asin / clk_asin × 100
- mkt_ctr = clk_total / imp_total × 100
- asin_ctr = clk_asin / imp_asin × 100
- mkt_atc = cart_total / clk_total × 100 ; asin_atc = cart_asin / clk_asin × 100
- price_premium_pct = (clk_price_asin − clk_price_market) / clk_price_market × 100

## 4. Tag definitions (documented — adjust if desired)

- **t_cvr_plus** = asin_cvr > mkt_cvr
- **t_low_vis** = clk_share > imp_share  (earns clicks above visibility → rank/bid-up)
- **t_cvr_bleed** = clk_share > purch_share  (wins click, loses at purchase → conversion problem). NOTE: the source SQP-Insights UI labels this as "Click Share < Purchase Share", but the reference skill's code — and the "bleed" meaning (losing share between click and purchase) — use `clk_share > purch_share`. This reference uses the latter. To match the tool's label instead, flip the operator.
- **is_brand** = query contains any supplied brand term (lowercase substring match)
- **t_language / t_spanish** = query contains a marketplace language marker (section 7)

## 5. Scorecard & funnel aggregates (per period)

- queries = row count ; vol = Σ vol ; mkt_purch = Σ purch_total ; asin_purch = Σ purch_asin
- asin_cvr = Σ purch_asin / Σ clk_asin × 100 ; mkt_cvr = Σ purch_total / Σ clk_total × 100
- asin_ctr = Σ clk_asin / Σ imp_asin × 100 ; mkt_ctr = Σ clk_total / Σ imp_total × 100
- effective_share = Σ purch_asin / Σ purch_total × 100
- Funnel ASIN: imp=Σ imp_asin, clk=Σ clk_asin, cart=Σ cart_asin, purch=Σ purch_asin; Market = the Total sums.
- Per-stage market share = ASIN stage sum / Total stage sum × 100 (impression/click/cart/purchase share).
- Rate deltas across periods in percentage points (pp); count deltas in %.

## 6. Movers (two periods)

Outer-merge on `q` → status persist (both) / new (later only) / lost (earlier only). For persisting queries: vol_pct, mkt_purch_pct, asin_purch_pct, purch_share_delta, clk_share_delta, imp_share_delta, asin_cvr_delta. Rank wins/losses by purch_share_delta. Biggest new = highest later-period volume. For 3+ periods, keep the per-query series for a trajectory.

## 7. Marketplace language markers (non-English flag)

- US / MX / ES → Spanish markers, e.g.: para, niños, niño, mujer, hombre, libro, regalo, juguete, con, sin, de la, para el
- DE → German: für, kinder, mit, ohne, geschenk, buch, und
- FR → French: pour, enfant, avec, sans, cadeau, livre, jouet
- IT → Italian: per, bambini, con, senza, regalo, libro, giocattolo
- UK / CA(en) → leave empty (no flag)
Use lowercase substring match; treat as a heuristic and label as "possible non-English", not definitive.

## 8. Opportunity & rent/build/defend

- winnable_purchases = max(target_purch_share − purch_share, 0)/100 × purch_total (latest period). No target → proxy ceiling = min(clk_share, purch_share × 1.5); document proxy. Rank desc; tie-break by vol.
- Paid/organic (needs ad Search Term Report): ad_purch(query) from the SP/SB report (match customer search term to SQP query; note fuzzy matches). organic_purch ≈ purch_asin − ad_purch (floor 0). ad_dependency = ad_purch / purch_asin.
  - Rent: purch_share high AND ad_dependency high → test pulling paid.
  - Build: purch_share low, rising (positive delta) → invest paid.
  - Defend: purch_share high AND ad_dependency low → defensive ads only.
- Query↔search-term matching is imperfect; label the split as an estimate.

## 9. Thresholds (defaults, overridable via project context)

| Rule | Default |
|---|---|
| Funnel leak: absolute drop | ≥ 10 pp vs previous stage |
| Funnel leak: relative drop | ≥ 30% (curr < 0.70 × prev) |
| Price-premium "meaningful" | > 25% vs market → likely cart→purchase bleed |
| Opportunity proxy (no target) | min(click share, purchase share × 1.5) |

## 10. Adaptable code (patterns — adapt column names to the actual file)

```python
import pandas as pd, numpy as np, re, glob, os

def parse_meta(path):
    first = open(path, encoding='utf-8-sig').readline()
    asin = (re.search(r'ASIN or Product=\["?([A-Z0-9]+)"?\]', first) or [None,None])[1]
    year = (re.search(r'Select year=\["?(\d{4})"?\]', first) or [None,None])[1]
    month = (re.search(r'Select month=\["?([A-Za-z]+)"?\]', first) or [None,None])[1]
    view = 'ASIN' if 'ASIN_View' in os.path.basename(path) else ('Brand' if 'Brand_View' in os.path.basename(path) else None)
    mkt = os.path.basename(path)[:2].upper()
    return dict(asin=asin, year=year, month=month, view=view, marketplace=mkt, path=path)

RENAME = { 'Search Query':'q','Search Query Volume':'vol',
  'Impressions: Total Count':'imp_total','Impressions: ASIN Count':'imp_asin','Impressions: Brand Count':'imp_asin','Impressions: ASIN Share %':'imp_share','Impressions: Brand Share %':'imp_share',
  'Clicks: Total Count':'clk_total','Clicks: ASIN Count':'clk_asin','Clicks: Brand Count':'clk_asin','Clicks: ASIN Share %':'clk_share','Clicks: Brand Share %':'clk_share',
  'Clicks: Price (Median)':'clk_price_market','Clicks: ASIN Price (Median)':'clk_price_asin','Clicks: Brand Price (Median)':'clk_price_asin',
  'Cart Adds: Total Count':'cart_total','Cart Adds: ASIN Count':'cart_asin','Cart Adds: Brand Count':'cart_asin','Cart Adds: ASIN Share %':'cart_share','Cart Adds: Brand Share %':'cart_share',
  'Purchases: Total Count':'purch_total','Purchases: ASIN Count':'purch_asin','Purchases: Brand Count':'purch_asin','Purchases: ASIN Share %':'purch_share','Purchases: Brand Share %':'purch_share' }

def load(path, brand_kw, lang_markers):
    df = pd.read_csv(path, skiprows=1)
    df.columns = [c.strip() for c in df.columns]
    df = df.rename(columns=RENAME)
    df['q'] = df['q'].astype(str).str.strip().str.lower()
    for c in ['imp_share','clk_share','cart_share','purch_share']:
        if df[c].max() is not None and df[c].max() <= 1.0: df[c] = df[c]*100
    df['mkt_cvr']  = np.where(df.clk_total>0, df.purch_total/df.clk_total*100, 0)
    df['asin_cvr'] = np.where(df.clk_asin>0,  df.purch_asin/df.clk_asin*100, 0)
    df['mkt_ctr']  = np.where(df.imp_total>0, df.clk_total/df.imp_total*100, 0)
    df['asin_ctr'] = np.where(df.imp_asin>0,  df.clk_asin/df.imp_asin*100, 0)
    df['t_cvr_plus']  = df.asin_cvr > df.mkt_cvr
    df['t_low_vis']   = df.clk_share > df.imp_share
    df['t_cvr_bleed'] = df.clk_share > df.purch_share
    df['is_brand']    = df.q.apply(lambda x: any(b in x for b in brand_kw))
    df['t_language']  = df.q.apply(lambda x: any(m in x for m in lang_markers))
    return df

# folder ingestion: files = sorted(glob.glob(os.path.join(folder,'*Search_Query_Performance*.csv')), key=lambda p: (parse_meta(p)['year'], parse_meta(p)['month']))
```
Adapt to the actual headers; if a required column is absent, surface it rather than guessing.
