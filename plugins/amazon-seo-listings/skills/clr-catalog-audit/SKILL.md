---
name: clr-catalog-audit
description: >
  Amazon CLR Catalog Auditor — works across ANY Amazon category. Validates filter
  attributes, cross-field title consistency, content completeness, and Rufus/COSMO
  optimization. Triggers on: "CLR", "category listings report", "catalog audit",
  "content gap", "attribute validation", "wrong enum", "unit count wrong", "fix my
  flat file", "Rufus attributes", "COSMO optimization", "listing suppressed",
  "what attributes to fill", "attribute mismatch", or any request to check, clean,
  or improve Amazon listing data. Works for ALL categories: essential oils, tea,
  pet food, home, grocery, supplements, beauty, and more. When the user shares
  Amazon search filter screenshots alongside a CLR, extract the visible filter
  checkboxes and validate those fields first — they are the highest-priority attributes.
---

# Amazon CLR Catalog Audit Skill — v4 (Universal / Multi-Category)


## ▶ Before you run (pre-flight)

- **This skill is for:** checking catalog data quality and AI (Rufus/COSMO) discoverability — attribute gaps, wrong enum values, and title↔attribute mismatches.
- **You get back:** an audit workbook with fixes + a smart-fix upload tab.
- **Pull this first:** *Category Listings Report (CLR, .xlsm)* — Seller Central → Catalog → Inventory Reports → Category Listings Report. Optional: screenshots of the category's search filters (validate those fields first).
- **Wrong tool?** Only titles → **amazon-title-compress**. Variation review-sharing risk → **amazon-review-split-auditor**.
- **Optional companions:** none.

If no CLR is attached, name it above and stop.

Produces a **single-sheet Excel audit workbook** — one row per child SKU — that the
ops team can open, filter, and action immediately. Works for any Amazon category.

**Two input modes:**
1. **CLR only** → auto-detect category from product type → apply built-in check rules
2. **CLR + Amazon search filter screenshot(s)** → extract sidebar filter attributes →
   validate those first (highest priority), then run universal checks

---

## ⚠️ CRITICAL: Output Is ONE Sheet, Not Multi-Tab

- Row 1: Section group headers (merged cells, colour-banded)
- Row 2: Column sub-headers
- Row 3+: One row per **child** SKU only
- Sheet named after the brand + category (e.g. `"EEO Audit"`, `"PawFoods Audit"`)

---

## Step 0: Read Inputs Before Writing Any Code

**Always do this first:**
1. If screenshots are attached → run Screenshot Analysis Mode (Section A) to extract
   filter attributes for this category. These become the primary checks.
2. Identify CLR file path → parse using the pattern below
3. Detect product category → load the right attribute check set
4. Run all checks → build output sheet

---

## Section A: Screenshot Analysis Mode

When the user shares Amazon search results or category page screenshots:

```
1. Identify every FILTER LABEL visible in the left-panel sidebar
   (these are the checkboxes/dropdowns customers use to filter search results)
2. For each filter label, determine:
   a. The human-readable CLR column name that maps to it
   b. The valid values (enum or free text)
   c. Whether it is multi-select or single-select
3. Build a SCREENSHOT_FILTERS list: [{filter_label, clr_column, valid_values, multi}]
4. These become the FIRST attribute checks in the audit — always flag as HIGH/CRITICAL if blank
```

### Common Filter → CLR Column Mappings (universal)

| Amazon Sidebar Filter | CLR Column Name | Notes |
|---|---|---|
| Item Form / Product Form | Item Form | enum |
| Flavor | Flavor | enum |
| Scent | Scent | free text |
| Size / Weight | Unit Count + Unit Count Type | numeric |
| Volume / Capacity | Capacity + Capacity Unit | numeric + unit |
| Count / Pack Size | Unit Count | numeric |
| Benefits | Product Benefits | multi-select enum |
| Specific Uses / Use Case | Specific Uses for Product | multi-select enum |
| Active Ingredients | Active Ingredients | free text |
| Special Features | Special Features | multi-select |
| Breed Size (pet) | Breed Size Recommendation | enum |
| Life Stage (pet) | Pet Lifestage | enum |
| Primary Ingredient (pet) | Primary Ingredient | free text |
| Flavor (pet) | Flavor | enum |
| Material | Material | free text |
| Color | Color | enum |
| Occasion | Occasion | multi-select |
| Season | Seasons | enum |
| Diet Type | Diet Type | multi-select enum |
| Specialty | Specialty | multi-select enum |

> For any filter label not in this table: inspect visible checkbox values in screenshot
> to determine valid enums, then build the check rule on the fly.

---

## CLR File Structure

Amazon's CLR is a flat-file template (.xlsm) with the **Template** sheet:

```
Row 0:  Settings string — ignore
Row 1:  Group band labels — ignore
Row 2:  HUMAN-READABLE column headers  ← use as column names
Row 3:  Attribute key names (::listing_status etc.) — ignore
Row 4:  Example/sample row (Amazon demo values) — EXCLUDE from audit
Row 5+: ACTUAL listing data
```

### Parse Pattern

```python
import openpyxl, pandas as pd

def parse_clr(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Template"]
    all_rows = list(ws.values)

    human_headers = list(all_rows[2])
    data_rows     = all_rows[5:]   # skip example row at idx 4

    df = pd.DataFrame(data_rows, columns=human_headers)
    df = df.dropna(how="all").reset_index(drop=True)
    df = df[~df.iloc[:, 0].astype(str).str.startswith("::")]

    # Deduplicate column names: Bullet Point → Bullet Point_1, _2, ...
    seen = {}
    new_cols = []
    for c in df.columns:
        k = c if c else "__BLANK__"
        if k in seen:
            seen[k] += 1
            new_cols.append(f"{k}_{seen[k]}")
        else:
            seen[k] = 0
            new_cols.append(k)
    df.columns = new_cols
    return df
```

### Separate Parents from Children

```python
df = df[df.apply(lambda r: str(r.get("Parentage Level","")).lower().strip()
                 in {"parent","child"} and str(r.get("SKU","")).strip()
                 not in ("","nan","None"), axis=1)].reset_index(drop=True)

children = df[df["Parentage Level"].str.lower() == "child"].reset_index(drop=True)
parents  = df[df["Parentage Level"].str.lower() == "parent"].reset_index(drop=True)

# Map parent SKU → product type for browse node mismatch detection
parent_ptype_map = dict(zip(
    parents.get("SKU", pd.Series()).astype(str),
    parents.get("Product Type", pd.Series()).astype(str)
))
```

### Helper: Safe Value Getter

```python
def g(row, col_name):
    val = row.get(col_name)
    return str(val).strip() if val and str(val).strip() not in ("None","nan","") else ""

def g_multi(row, base_col, count=5):
    """Get multi-slot field values: base_col, base_col_1, base_col_2 ..."""
    cols = [base_col] + [f"{base_col}_{i}" for i in range(1, count)]
    return [g(row, c) for c in cols if g(row, c)]
```

---

## Section B: Category Auto-Detection

```python
CATEGORY_MAP = {
    # Essential Oils / Fragrance
    "SCENTED_OIL": "essential_oils",
    "ESSENTIAL_OIL": "essential_oils",
    "FRAGRANCE_OIL": "essential_oils",
    "AROMA_OIL": "essential_oils",
    "AROMATHERAPY_OIL": "essential_oils",
    "AROMA_DIFFUSER": "diffuser",

    # Tea / Supplements / Grocery
    "TEA": "tea",
    "HERBAL_SUPPLEMENT": "supplement",
    "HERBAL_TEA": "tea",
    "SUPPLEMENT": "supplement",
    "GROCERY": "grocery",
    "FOOD_AND_BEVERAGE": "grocery",

    # Pet
    "PET_FOOD": "pet_food",
    "DOG_FOOD": "pet_food",
    "CAT_FOOD": "pet_food",
    "PET_SUPPLEMENT": "pet_food",
    "PET_SUPPLY": "pet_supply",
    "DOG_TREAT": "pet_food",

    # Home / Cleaning
    "HOME_CLEANING": "home",
    "HOME_FRAGRANCE": "home_fragrance",
    "CANDLE": "home_fragrance",
    "REED_DIFFUSER": "home_fragrance",

    # Beauty / Personal Care
    "BEAUTY": "beauty",
    "SKIN_CARE": "beauty",
    "HAIR_CARE": "beauty",
    "LOTION": "beauty",
}

def detect_category(children_df):
    """
    Returns the most common category slug detected from product types in the CLR.
    Falls back to 'generic' if no match found.
    """
    counts = {}
    for ptype in children_df.get("Product Type", pd.Series()).astype(str):
        slug = CATEGORY_MAP.get(ptype.upper().strip(), None)
        if slug:
            counts[slug] = counts.get(slug, 0) + 1
    if not counts:
        return "generic"
    return max(counts, key=counts.get)
```

---

## Section C: Category-Specific Attribute Check Registry

Each category defines its filter attribute checks. Checks are skipped for categories that
don't have them. When screenshots are provided, SCREENSHOT_FILTERS override or extend this.

### Structure of a Check Definition

```python
{
    "key":      "item_form",           # unique key used in summary
    "label":    "ITEM FORM",           # section header shown in Excel
    "clr_col":  "Item Form",           # column name in CLR (after dedup)
    "multi":    False,                 # True = multi-slot (base + _1 + _2 ...)
    "slots":    1,                     # number of slots if multi
    "type":     "enum",                # "enum" | "free_text" | "numeric" | "scan"
    "valid":    {"Oil","Drops",...},   # valid values (enum type only)
    "fix_map":  {"oil":"Oil",...},     # case/typo fix suggestions
    "default":  "Oil",                 # recommended fill value when blank
    "rufus":    "filter invisible",    # impact note used in Issue cell
    "severity": "HIGH",               # base severity if blank: CRITICAL/HIGH/MEDIUM
}
```

### Built-In Check Sets by Category

```python
CATEGORY_CHECKS = {

    # ── ESSENTIAL OILS ──────────────────────────────────────────────────────
    "essential_oils": [
        {   "key":"item_form","label":"ITEM FORM ★ Filter",
            "clr_col":"Item Form","multi":False,"type":"enum",
            "valid":{"Oil","Drops","Liquid","Sprays","Roll-Ons","Solid","Gel",
                     "Capsule","Creams","Patch","Powders","Stick","Tablet"},
            "fix_map":{"drops":"Drops","oil":"Oil","liquid":"Liquid","spray":"Sprays"},
            "default":"Oil","rufus":"filter invisible","severity":"HIGH"},
        {   "key":"benefits","label":"PRODUCT BENEFITS ★ Filter",
            "clr_col":"Product Benefits","multi":True,"slots":5,"type":"enum",
            "valid":{"Aromatherapy","Relaxation","Mood Enhancement","Stress Relief",
                     "Sleep Support","Energizing","Sinus Relief","Antibacterial",
                     "Cleansing","Hair Growth","Warming","Immunity","Soothing",
                     "Headache Relief","Cold Relief","Brightening"},
            "default":"Aromatherapy | Relaxation | Mood Enhancement | Stress Relief",
            "rufus":"zero Rufus benefit coverage","severity":"HIGH"},
        {   "key":"specific_uses","label":"SPECIFIC USES ★ Filter",
            "clr_col":"Specific Uses for Product","multi":True,"slots":5,"type":"enum",
            "valid":{"Aromatherapy","Candle Making","Soap Making","Diffuser Use",
                     "Room Freshener","Massage","Bath","Hair Care","Skin Care",
                     "Reed Diffuser","Wax Melts"},
            "default":"Aromatherapy | Candle Making | Soap Making | Diffuser Use | Room Freshener",
            "rufus":"invisible in Candle/Soap/Diffuser filters","severity":"HIGH"},
        {   "key":"recommended_uses","label":"RECOMMENDED USES",
            "clr_col":"Recommended Uses For Product","multi":True,"slots":5,"type":"enum",
            "valid":{"Bath","Aromatherapy","Candle Making","Massage","Diffuser",
                     "Soap Making","Skin Care","Hair Care"},
            "default":"Bath | Aromatherapy | Candle Making | Massage | Diffuser",
            "rufus":"COSMO miss","severity":"MEDIUM"},
        {   "key":"active_ing","label":"ACTIVE INGREDIENTS",
            "clr_col":"Active Ingredients","multi":True,"slots":3,"type":"free_text",
            "default":"[Scent] Oil (e.g. Lavender Oil)",
            "rufus":"ingredient search miss","severity":"MEDIUM"},
        {   "key":"scent_duration","label":"SCENT DURATION ★ Filter",
            "clr_col":"SCAN:duration","multi":False,"type":"scan",
            "default":"Value: 8 | Unit: Hours",
            "rufus":"invisible in Duration filter","severity":"HIGH"},
        {   "key":"capacity","label":"CAPACITY / VOLUME ★ Filter",
            "clr_col":"Capacity","multi":False,"type":"numeric",
            "default":"Parse from title (e.g. 30 ml → Capacity: 30 | Unit: Milliliters)",
            "rufus":"invisible in Volume filter","severity":"HIGH"},
        {   "key":"scent","label":"SCENT",
            "clr_col":"Scent","multi":True,"slots":3,"type":"free_text",
            "default":"Fill scent name (free text)",
            "rufus":"scent search miss","severity":"MEDIUM"},
        {   "key":"seasons","label":"SEASONS",
            "clr_col":"Seasons","multi":False,"type":"enum",
            "valid":{"Spring","Summer","Fall","Winter","All Season","Holiday"},
            "fix_map":{"all seasons":"All Season","all-season":"All Season","autumn":"Fall"},
            "default":"All Season","rufus":"seasonal filter miss","severity":"MEDIUM"},
        {   "key":"occasions","label":"OCCASIONS",
            "clr_col":"SCAN:occasion","multi":True,"slots":10,"type":"scan",
            "default":"Birthday | Housewarming | Self Care | Aromatherapy",
            "rufus":"gifting filter miss","severity":"MEDIUM"},
    ],

    # ── TEA / GROCERY ──────────────────────────────────────────────────────
    "tea": [
        {   "key":"item_form","label":"ITEM FORM ★ Filter",
            "clr_col":"Item Form","multi":False,"type":"enum",
            "valid":{"Tea Bags","Loose Leaf","Powder","Liquid","Capsules","Tablets",
                     "Softgels","Gummies","Extract","Tincture","Spray"},
            "fix_map":{"teabags":"Tea Bags","loose leaves":"Loose Leaf","looseleaf":"Loose Leaf"},
            "default":"Tea Bags","rufus":"filter invisible","severity":"HIGH"},
        {   "key":"caffeine","label":"CAFFEINE CONTENT ★ Filter",
            "clr_col":"Caffeine Content Description","multi":False,"type":"enum",
            "valid":{"Caffeinated","Decaffeinated","Naturally Caffeinated","High Caffeine",
                     "Medium Caffeine","Low Caffeine","Caffeine Free"},
            "fix_map":{"high caf":"High Caffeine","decaf":"Decaffeinated",
                       "yes":"Caffeinated","caffeine free":"Caffeine Free"},
            "default":"Caffeinated","rufus":"invisible in caffeine filter","severity":"CRITICAL"},
        {   "key":"tea_variety","label":"TEA VARIETY ★ Filter",
            "clr_col":"Tea Variety","multi":False,"type":"enum",
            "valid":{"Yerba Mate","Green Tea","Black Tea","White Tea","Oolong Tea",
                     "Herbal Tea","Chamomile Tea","Peppermint Tea","Rooibos","Matcha",
                     "Chai","Hibiscus Tea","Ginger Tea","Lavender Tea","Earl Grey",
                     "English Breakfast"},
            "fix_map":{"mate tea":"Yerba Mate"},
            "default":"Herbal Tea","rufus":"tea variety filter miss","severity":"HIGH"},
        {   "key":"flavor","label":"FLAVOR ★ Filter",
            "clr_col":"Flavor","multi":False,"type":"enum",
            "valid":{"Unflavored","Peppermint","Mint","Lemon","Honey","Cinnamon",
                     "Chamomile","Ginger","Vanilla","Blueberry","Raspberry","Peach",
                     "Apple","Orange","Berry","Chai","Lavender","Rose","Hibiscus",
                     "Green Tea","Matcha","Original","Natural"},
            "fix_map":{"plain":"Unflavored","pure":"Unflavored","yerba mate":"Unflavored"},
            "default":"Unflavored","rufus":"flavor filter miss","severity":"HIGH"},
        {   "key":"specialty","label":"SPECIALTY / CERTIFICATION",
            "clr_col":"Specialty","multi":True,"slots":5,"type":"enum",
            "valid":{"Organic","Organic Certified","Non-GMO","Fair Trade Certified",
                     "Kosher","Halal","Vegan","Vegetarian","Gluten Free","Herbal",
                     "Natural","Raw","Biodynamic","Rainforest Alliance Certified"},
            "fix_map":{"gmo free":"Non-GMO","caffeine free":"Non-GMO"},
            "default":"Non-GMO | Organic","rufus":"organic/specialty filter miss","severity":"HIGH"},
        {   "key":"diet_type","label":"DIET TYPE ★ Filter",
            "clr_col":"Diet Type","multi":True,"slots":5,"type":"enum",
            "valid":{"Vegan","Vegetarian","Gluten Free","Kosher","Halal","Paleo",
                     "Keto","Dairy Free","Nut Free","Sugar Free","Low Sodium","Organic"},
            "default":"Vegan | Gluten Free","rufus":"diet filter miss","severity":"HIGH"},
        {   "key":"recommended_uses","label":"RECOMMENDED USES ★ Filter",
            "clr_col":"Recommended Uses For Product","multi":True,"slots":5,"type":"enum",
            "valid":{"Natural Energy Boost","Detox/Cleanse Support","Coffee Alternative",
                     "Antioxidant Support","Digestive Health","Immune Support","Relaxation",
                     "Stress Relief","Anxiety Relief","Focus & Concentration",
                     "Weight Management","Hydration","Alertness","Athletic Performance",
                     "Sleep Support"},
            "fix_map":{"digestion":"Digestive Health","energy":"Natural Energy Boost"},
            "default":"Natural Energy Boost | Relaxation | Digestive Health",
            "rufus":"invisible in 'tea for X' queries","severity":"HIGH"},
    ],

    # ── PET FOOD ─────────────────────────────────────────────────────────
    # Base rules — extend with screenshot filters when user shares sidebar screenshot
    "pet_food": [
        {   "key":"life_stage","label":"LIFE STAGE ★ Filter",
            "clr_col":"Pet Lifestage","multi":False,"type":"enum",
            "valid":{"Puppy","Adult","Senior","All Life Stages","Kitten","Kitten & Adult"},
            "fix_map":{"all":"All Life Stages","all ages":"All Life Stages"},
            "default":"Adult","rufus":"life stage filter miss","severity":"HIGH"},
        {   "key":"breed_size","label":"BREED SIZE ★ Filter",
            "clr_col":"Breed Size Recommendation","multi":True,"slots":3,"type":"enum",
            "valid":{"Small Breeds","Medium Breeds","Large Breeds","Extra Large Breeds",
                     "Toy Breeds","All Breed Sizes"},
            "fix_map":{"small":"Small Breeds","large":"Large Breeds","all":"All Breed Sizes"},
            "default":"All Breed Sizes","rufus":"breed size filter miss","severity":"HIGH"},
        {   "key":"flavor","label":"FLAVOR ★ Filter",
            "clr_col":"Flavor","multi":True,"slots":3,"type":"free_text",
            "default":"Chicken | Beef | Salmon (free text — match title)",
            "rufus":"flavor filter miss","severity":"HIGH"},
        {   "key":"primary_ingredient","label":"PRIMARY INGREDIENT ★ Filter",
            "clr_col":"Primary Ingredient","multi":False,"type":"free_text",
            "default":"Chicken (or dominant protein — free text)",
            "rufus":"ingredient filter miss","severity":"HIGH"},
        {   "key":"item_form","label":"ITEM FORM ★ Filter",
            "clr_col":"Item Form","multi":False,"type":"enum",
            "valid":{"Dry","Wet","Semi-Moist","Freeze-Dried","Dehydrated","Raw",
                     "Kibble","Pâté","Gravy","Stew","Chunks"},
            "default":"Dry","rufus":"filter invisible","severity":"HIGH"},
        {   "key":"diet_type","label":"DIET TYPE / SPECIALTY",
            "clr_col":"Diet Type","multi":True,"slots":3,"type":"enum",
            "valid":{"Grain Free","Limited Ingredient","Natural","Organic",
                     "High Protein","Weight Control","Sensitive Stomach",
                     "Hypoallergenic","No Artificial Flavors"},
            "default":"Natural | Grain Free","rufus":"diet filter miss","severity":"MEDIUM"},
        {   "key":"specific_uses","label":"SPECIFIC USES ★ Filter",
            "clr_col":"Specific Uses for Product","multi":True,"slots":3,"type":"enum",
            "valid":{"Weight Management","Digestive Health","Joint Health","Skin & Coat",
                     "Urinary Health","Dental Health","Immune Support","Heart Health",
                     "Senior Support","Puppy Development"},
            "default":"Digestive Health | Skin & Coat",
            "rufus":"use-case filter miss","severity":"HIGH"},
    ],

    # ── HOME FRAGRANCE ────────────────────────────────────────────────────
    "home_fragrance": [
        {   "key":"item_form","label":"ITEM FORM ★ Filter",
            "clr_col":"Item Form","multi":False,"type":"enum",
            "valid":{"Candle","Wax Melt","Reed Diffuser","Room Spray","Solid",
                     "Gel","Liquid","Powder"},
            "default":"Candle","rufus":"filter invisible","severity":"HIGH"},
        {   "key":"scent","label":"SCENT ★ Filter",
            "clr_col":"Scent","multi":True,"slots":3,"type":"free_text",
            "default":"Fill scent name","rufus":"scent filter miss","severity":"HIGH"},
        {   "key":"capacity","label":"BURN TIME / CAPACITY ★ Filter",
            "clr_col":"Capacity","multi":False,"type":"numeric",
            "default":"Parse from title (e.g. 8 oz → Capacity: 8 | Unit: Ounce)",
            "rufus":"volume filter miss","severity":"HIGH"},
        {   "key":"occasions","label":"OCCASIONS ★ Filter",
            "clr_col":"SCAN:occasion","multi":True,"slots":10,"type":"scan",
            "default":"Birthday | Holiday | Housewarming | Self Care",
            "rufus":"gifting filter miss","severity":"MEDIUM"},
        {   "key":"seasons","label":"SEASONS",
            "clr_col":"Seasons","multi":False,"type":"enum",
            "valid":{"Spring","Summer","Fall","Winter","All Season","Holiday"},
            "fix_map":{"all seasons":"All Season","autumn":"Fall"},
            "default":"All Season","rufus":"seasonal filter miss","severity":"MEDIUM"},
    ],

    # ── BEAUTY / PERSONAL CARE ────────────────────────────────────────────
    "beauty": [
        {   "key":"item_form","label":"ITEM FORM ★ Filter",
            "clr_col":"Item Form","multi":False,"type":"enum",
            "valid":{"Cream","Lotion","Gel","Serum","Oil","Spray","Foam","Powder",
                     "Sheet Mask","Stick","Balm","Toner","Essence"},
            "default":"Cream","rufus":"filter invisible","severity":"HIGH"},
        {   "key":"skin_type","label":"SKIN TYPE ★ Filter",
            "clr_col":"Skin Type","multi":True,"slots":3,"type":"enum",
            "valid":{"All Skin Types","Dry","Oily","Combination","Sensitive",
                     "Normal","Mature","Acne-Prone"},
            "default":"All Skin Types","rufus":"skin type filter miss","severity":"HIGH"},
        {   "key":"benefits","label":"PRODUCT BENEFITS ★ Filter",
            "clr_col":"Product Benefits","multi":True,"slots":5,"type":"enum",
            "valid":{"Moisturizing","Anti-Aging","Brightening","Firming","Hydrating",
                     "SPF Protection","Soothing","Exfoliating","Cleansing","Healing"},
            "default":"Moisturizing | Hydrating",
            "rufus":"benefit filter miss","severity":"HIGH"},
        {   "key":"active_ing","label":"ACTIVE INGREDIENTS ★ Filter",
            "clr_col":"Active Ingredients","multi":True,"slots":3,"type":"free_text",
            "default":"Key ingredient (e.g. Hyaluronic Acid, Retinol)",
            "rufus":"ingredient filter miss","severity":"HIGH"},
    ],

    # ── GENERIC (unknown category) ─────────────────────────────────────────
    # Note: when category is unknown, the skill asks the user for a screenshot
    # and builds checks dynamically. These are minimal fallback checks only.
    "generic": [
        {   "key":"item_form","label":"ITEM FORM",
            "clr_col":"Item Form","multi":False,"type":"free_text",
            "default":"Check Amazon flat file for this category's valid Item Form values",
            "rufus":"filter visibility","severity":"MEDIUM"},
        {   "key":"specific_uses","label":"SPECIFIC USES",
            "clr_col":"Specific Uses for Product","multi":True,"slots":3,"type":"free_text",
            "default":"Share an Amazon search screenshot — I will extract valid values for this category",
            "rufus":"use-case filter miss","severity":"MEDIUM"},
    ],
}
```

---

## Section D: Universal Check Functions (run for ALL categories)

These run regardless of category. They use title signals and CLR field values.

### D1. Title ↔ Attribute Cross-Field Consistency

**Title is ground truth.** Parse signals from title → compare to corresponding attributes.
Flag every mismatch. This catches the most common errors: title says "30 ml" but Capacity
blank; title says "for Puppies" but Life Stage = "Adult"; title says "Grain Free" but
Diet Type blank.

```python
import re

# --- Signal extractors (extend per category) ---

TITLE_SIGNALS = {
    # Volume / Capacity
    r"(\d+(?:\.\d+)?)\s*ml\b":     ("Capacity", "Milliliters"),
    r"(\d+(?:\.\d+)?)\s*fl\.?\s*oz":("Capacity","Fl Oz"),
    r"(\d+(?:\.\d+)?)\s*oz\b":     ("Capacity", "Ounce"),
    r"(\d+(?:\.\d+)?)\s*g\b":      ("Unit Count", "Gram"),
    r"(\d+(?:\.\d+)?)\s*lb\b":     ("Unit Count", "Pound"),
    r"(\d+(?:\.\d+)?)\s*kg\b":     ("Unit Count", "Kilogram"),

    # Form signals
    r"\btea\s+bags?\b":             ("Item Form", "Tea Bags"),
    r"\bloose.?leaf\b":             ("Item Form", "Loose Leaf"),
    r"\bpowder\b":                  ("Item Form", "Powder"),
    r"\bcandle\b":                  ("Item Form", "Candle"),
    r"\breed\s+diffuser\b":         ("Item Form", "Reed Diffuser"),
    r"\broll.?on\b":                ("Item Form", "Roll-Ons"),
    r"\bspray\b":                   ("Item Form", "Spray"),

    # Caffeine signals
    r"\bhigh.?caf":                 ("Caffeine Content Description","High Caffeine"),
    r"\bdecaf\b|caffeine.?free":    ("Caffeine Content Description","Decaffeinated"),
    r"\bnaturally.?caffeinat":      ("Caffeine Content Description","Naturally Caffeinated"),

    # Pet signals
    r"\bpuppy|puppies\b":           ("Pet Lifestage", "Puppy"),
    r"\bsenior\b":                  ("Pet Lifestage", "Senior"),
    r"\bkitten\b":                  ("Pet Lifestage", "Kitten"),
    r"\bsmall\s+breed":             ("Breed Size Recommendation", "Small Breeds"),
    r"\blarge\s+breed":             ("Breed Size Recommendation", "Large Breeds"),
    r"\bgrain.?free\b":             ("Diet Type", "Grain Free"),

    # Count
    r"(\d+)\s*count\b":            ("Unit Count", "Count"),
    r"pack\s+of\s+(\d+)":          ("Unit Count", "Count"),  # → Each Unit Count
    r"(\d+)\s*pk\b":               ("Unit Count", "Count"),
}

def check_title_consistency(row):
    """
    Returns list of {field, title_signal, attr_value, fix} dicts.
    """
    title = g(row, "Title")
    if not title:
        return []
    issues = []
    tl = title.lower()
    for pattern, (field, expected) in TITLE_SIGNALS.items():
        m = re.search(pattern, tl)
        if not m:
            continue
        # Get current attribute value (search flexibly)
        actual = ""
        for col in row.index if hasattr(row, "index") else row.keys():
            if field.lower() in str(col).lower():
                v = g(row, col)
                if v:
                    actual = v
                    break
        if not actual:
            issues.append({
                "field": field,
                "title_signal": m.group(0),
                "attr_value": "BLANK",
                "fix": expected if not expected.startswith("(") else f"Fill {field}"
            })
        elif expected and actual.lower() != expected.lower():
            issues.append({
                "field": field,
                "title_signal": m.group(0),
                "attr_value": actual,
                "fix": expected
            })
    return issues
```

### D2. Browse Node (Item Type Keyword)

```python
def check_browse_node(row, parent_ptype_map, valid_keywords=None):
    val        = g(row, "Item Type Keyword")
    child_ptype= g(row, "Product Type")
    parent_sku = g(row, "Parent SKU")
    par_ptype  = parent_ptype_map.get(parent_sku, "")

    if par_ptype and child_ptype and par_ptype != child_ptype:
        return (val[:50] if val else "",
                f"Product type mismatch: child={child_ptype}, parent={par_ptype}",
                "OPEN SS CASE FIRST. Align to parent product type or re-parent.")
    if not val:
        return ("", "BLANK — browse node missing",
                "Fill item_type_keyword in flat file")
    if valid_keywords and val.lower() not in {v.lower() for v in valid_keywords}:
        return (val[:50], f"Unrecognised keyword: '{val}'",
                f"Use one of: {', '.join(list(valid_keywords)[:4])}")
    return (val[:50], "✓ OK", None)
```

### D3. Unit Count

```python
ML_TO_FL_OZ = {10:0.34,15:0.51,30:1.01,60:2.03,100:3.38,
               120:4.06,240:8.11,500:16.91,1000:33.81}

UC_TYPE_VALID = {"Count","Fl Oz","Milliliters","Ounce","Gram","Kilogram",
                 "Pound","Liter","Milliliter","Fluid Ounce","Serving"}

def check_unit_count(row):
    uc  = g(row, "Unit Count")
    uct = g(row, "Unit Count Type")
    current = f"{uc} ({uct})" if uc else ""
    issues = []

    if not uc:
        title = g(row, "Title")
        m = re.search(r"(\d+(?:\.\d+)?)\s*(ml|fl\.?\s*oz|oz|g|lb|count|pack)\b", title, re.I)
        issues.append(f"BLANK — parse from title: {m.group(0)}" if m else "BLANK — fill unit quantity")
    if uct and uct not in UC_TYPE_VALID:
        issues.append(f'Invalid Unit Count Type: "{uct}"')
    elif uc and not uct:
        issues.append("Unit Count Type is blank")

    if not issues:
        return (current, "✓ OK", None)
    fix = "Unit Count = quantity | Unit Count Type from: Count / Gram / Ounce / Milliliters"
    return (current or "BLANK", " | ".join(issues), fix)
```

### D4. Images

```python
def check_images(row):
    img_cols = ["Main Image URL"] + [f"Other Image URL{'_'+str(i) if i else ''}"
                                      for i in range(8)]
    filled = sum(1 for c in img_cols if g(row, c))
    if filled == 0:
        return (0, "No images — listing invisible",
                "Upload main (white bg) + 4+ lifestyle/infographic images")
    if filled < 5:
        return (filled, f"{filled}/9 images (<5)",
                "Add infographic and lifestyle images to reach 7+")
    if filled < 7:
        return (filled, f"{filled}/9 — could improve",
                "Add lifestyle and size comparison images")
    return (filled, "✓ OK", None)
```

### D5. Bullet Points

```python
def check_bullets(row):
    bullets = [g(row, "Bullet Point")] + [g(row, f"Bullet Point_{i}") for i in range(1,5)]
    filled  = sum(1 for b in bullets if b)
    if filled == 0:
        return (0, "No bullets — listing looks empty", "Write 5 bullets")
    if filled < 5:
        return (filled, f"Only {filled}/5 bullets", f"Add {5-filled} more bullets")
    return (filled, "✓ OK", None)
```

### D6. Product Description

```python
def check_description(row):
    desc = g(row, "Product Description")
    if not desc:
        return ("", 0, "BLANK — Google SEO miss",
                "Write 500+ char description: brand story + benefits + use cases")
    n = len(desc)
    preview = desc[:60]
    if n < 200:
        return (preview, n, f"{n} chars (min 200 required)", "Expand to 500–1000 chars")
    if n < 500:
        return (preview, n, f"{n} chars (rec. 500+ for Google SEO)",
                "Expand for Google indexing")
    if n > 2000:
        return (preview, n, f"{n} chars (max 2000)", "Trim to under 2000 chars")
    return (preview, n, "✓ OK", None)
```

### D7. Backend Keywords (Search Terms)

```python
def check_keywords(row):
    kw_cols = ["Generic Keyword"] + [f"Generic Keyword_{i}" for i in range(1,5)]
    raw     = [g(row, c) for c in kw_cols]
    filled  = sum(1 for f in raw if f)
    total_chars = sum(len(f) for f in raw if f)
    displays = [f[:25] if f else "—" for f in raw]

    if filled == 0:
        issue = "No keywords filled"
        fix   = "Fill all 5 fields (250 bytes each, no commas, no brand names)"
    elif filled < 4:
        issue = f"Only {filled}/5 slots used"
        fix   = f"Fill {5-filled} more fields with long-tail search terms"
    else:
        issue = "✓ OK"
        fix   = None
    return (*displays, str(total_chars), f"{filled}/5", issue, fix)
```

### D8. Variation Theme

```python
DEPRECATED_THEMES = {"SET_NAME","SCENT_NAME (Deprecated: Do Not Use)","STYLE"}

def check_variation_theme(row):
    val = g(row, "Variation Theme Name")
    if not val:
        return ("", "BLANK", "SCENT  (or SIZE / COLOR / SCENT/SIZE)")
    if val in DEPRECATED_THEMES or "Deprecated" in val:
        return (val[:25], "Deprecated — review split risk",
                "Open SS case → migrate to SCENT or SCENT/SIZE")
    return (val[:25], "✓ OK", None)
```

### D9. Safety / Prop 65

```python
def check_prop65(row_dict):
    for col, val in row_dict.items():
        if any(t in str(col).lower() for t in
               ("prop","warning","compliance","safety","hazmat")):
            v = str(val).strip()
            if v and v not in ("None","nan",""):
                return (v[:40], "✓ OK", None)
    return ("", "BLANK — CA Prop 65 compliance risk",
            '"no_warning_required"  or confirm from supplier SDS')
```

---

## Section E: Dynamic Attribute Check Runner

### ⚠️ Fix → Column Rule (CRITICAL — applies to every check)

**Fix → must show the CORRECT value for THIS specific product — not a list to pick from.**

The skill reads the product's title, scent, product type, and other attributes to infer
the right answer. Ops should be able to copy the Fix → cell value directly into the flat
file with zero research.

| Field Type | Fix → shows |
|---|---|
| `enum` (blank) | The ONE correct valid value inferred from title/scent/type |
| `enum` (wrong) | The corrected valid value (with brief explanation of what was wrong) |
| `free_text` | The actual value derived from the product (e.g. `"Lavender Oil"` from scent) |
| `numeric` | Value parsed from title + correct unit (e.g. `Capacity: 30 \| Unit: Milliliters`) |

**Never show a menu. Never say "pick one". Never say "fill value". Give the answer.**

```python
import re

# ══════════════════════════════════════════════════════════════════════════════
# SMART FIX ENGINE
# Infers the correct attribute value for THIS product from title, scent,
# product type, and filled attributes. Returns ONE specific valid value.
# Never returns a list of options. Never says "fill value".
# ══════════════════════════════════════════════════════════════════════════════

def build_smart_fix(row, chk):
    """
    Returns the single best Fix → value for this specific product.
    Priority: title signals → scent/flavor → product type → category default.
    """
    title  = g(row, "Title").lower()
    ptype  = g(row, "Product Type").upper()
    scent  = (g(row, "Scent") or g(row, "Scent_1") or g(row, "Flavor") or "").lower()
    key    = chk["key"]
    valid  = chk.get("valid", set())
    fmap   = chk.get("fix_map", {})
    dflt   = chk.get("default", "")

    # ── ITEM FORM ────────────────────────────────────────────────────────────
    if key == "item_form":
        if re.search(r"\btea\s+bags?\b", title):      return "Tea Bags"
        if re.search(r"\bloose.?leaf\b", title):      return "Loose Leaf"
        if re.search(r"\broll.?on\b", title):         return "Roll-Ons"
        if re.search(r"\breed\s+diffuser\b", title):  return "Reed Diffuser"
        if re.search(r"\bcandle\b", title):           return "Candle"
        if re.search(r"\bwax\s+melt\b", title):       return "Wax Melt"
        if re.search(r"\bspray\b", title):            return "Sprays"
        if re.search(r"\bpowder\b", title):           return "Powder"
        if re.search(r"\bcapsule\b", title):          return "Capsules"
        if re.search(r"\bgummies\b", title):          return "Gummies"
        if re.search(r"\btablet\b", title):           return "Tablets"
        if re.search(r"\bserum\b", title):            return "Serum"
        if re.search(r"\blotion\b", title):           return "Lotion"
        if re.search(r"\bcream\b", title):            return "Cream"
        if re.search(r"\bgel\b", title):              return "Gel"
        if re.search(r"\bdry\b", title) and ("PET" in ptype or "DOG" in ptype or "CAT" in ptype): return "Dry"
        if re.search(r"\bwet\b", title) and ("PET" in ptype or "DOG" in ptype or "CAT" in ptype): return "Wet"
        # Product type fallback
        if any(t in ptype for t in ("ESSENTIAL","FRAGRANCE","AROMA","SCENTED","OIL")): return "Oil"
        if "TEA" in ptype:      return "Tea Bags"
        if "DIFFUSER" in ptype: return "Reed Diffuser"
        if "CANDLE" in ptype:   return "Candle"
        return dflt or "Oil"

    # ── PRODUCT BENEFITS ─────────────────────────────────────────────────────
    if key == "benefits":
        SCENT_BENEFITS = {
            "lavender":     "Aromatherapy | Relaxation | Sleep Support | Stress Relief | Mood Enhancement",
            "peppermint":   "Aromatherapy | Energizing | Headache Relief | Mood Enhancement | Stress Relief",
            "eucalyptus":   "Aromatherapy | Sinus Relief | Cold Relief | Relaxation | Mood Enhancement",
            "lemon":        "Aromatherapy | Energizing | Mood Enhancement | Brightening | Stress Relief",
            "frankincense": "Aromatherapy | Immunity | Soothing | Relaxation | Mood Enhancement",
            "tea tree":     "Aromatherapy | Antibacterial | Cleansing | Relaxation | Mood Enhancement",
            "rosemary":     "Aromatherapy | Energizing | Hair Growth | Mood Enhancement | Stress Relief",
            "cinnamon":     "Aromatherapy | Warming | Energizing | Mood Enhancement | Stress Relief",
            "orange":       "Aromatherapy | Energizing | Mood Enhancement | Relaxation | Stress Relief",
            "jasmine":      "Aromatherapy | Relaxation | Soothing | Mood Enhancement | Stress Relief",
            "ylang ylang":  "Aromatherapy | Relaxation | Mood Enhancement | Soothing | Stress Relief",
            "bergamot":     "Aromatherapy | Relaxation | Mood Enhancement | Stress Relief | Energizing",
            "cedarwood":    "Aromatherapy | Relaxation | Sleep Support | Stress Relief | Mood Enhancement",
            "sandalwood":   "Aromatherapy | Relaxation | Soothing | Mood Enhancement | Stress Relief",
            "rose":         "Aromatherapy | Relaxation | Soothing | Mood Enhancement | Stress Relief",
            "grapefruit":   "Aromatherapy | Energizing | Mood Enhancement | Brightening | Stress Relief",
            "patchouli":    "Aromatherapy | Relaxation | Grounding | Mood Enhancement | Stress Relief",
            "vetiver":      "Aromatherapy | Relaxation | Grounding | Sleep Support | Stress Relief",
        }
        for k, v in SCENT_BENEFITS.items():
            if k in scent or k in title:
                return v
        # Beauty fallback
        if re.search(r"\bmoistur", title): return "Moisturizing | Hydrating | Soothing"
        if re.search(r"\banti.?ag", title): return "Anti-Aging | Firming | Brightening"
        return "Aromatherapy | Relaxation | Mood Enhancement | Stress Relief"

    # ── SPECIFIC USES ─────────────────────────────────────────────────────────
    if key == "specific_uses":
        if re.search(r"\breed\s+diffuser\b", title) or "DIFFUSER" in ptype:
            return "Room Freshener | Diffuser Use | Aromatherapy"
        if re.search(r"\broll.?on\b", title):
            return "Aromatherapy | Skin Care | Massage"
        if re.search(r"\bcandle\b", title) or "CANDLE" in ptype:
            return "Candle Making | Room Freshener | Aromatherapy"
        if any(t in ptype for t in ("ESSENTIAL","FRAGRANCE","AROMA","OIL")):
            return "Aromatherapy | Candle Making | Soap Making | Diffuser Use | Room Freshener"
        # Pet food specific uses
        if "PET" in ptype or "DOG" in ptype or "CAT" in ptype:
            if re.search(r"\bdigest", title):   return "Digestive Health | Immune Support"
            if re.search(r"\bjoint", title):    return "Joint Health | Senior Support"
            if re.search(r"\bskin|coat\b", title): return "Skin & Coat | Digestive Health"
            return "Digestive Health | Skin & Coat | Immune Support"
        return "Aromatherapy | Candle Making | Diffuser Use | Soap Making | Room Freshener"

    # ── RECOMMENDED USES ─────────────────────────────────────────────────────
    if key == "recommended_uses":
        if re.search(r"\benergy\b|caffeinat|high.?caf", title):
            return "Natural Energy Boost | Alertness | Focus & Concentration"
        if re.search(r"\brelax|calm|sleep\b", title):
            return "Relaxation | Sleep Support | Stress Relief"
        if re.search(r"\bdetox|cleanse\b", title):
            return "Detox/Cleanse Support | Digestive Health | Immune Support"
        if re.search(r"\bimmune\b", title):
            return "Immune Support | Antioxidant Support"
        if any(t in ptype for t in ("ESSENTIAL","FRAGRANCE","AROMA","OIL")):
            return "Bath | Aromatherapy | Massage | Diffuser | Candle Making"
        return "Natural Energy Boost | Relaxation | Digestive Health"

    # ── ACTIVE INGREDIENTS ────────────────────────────────────────────────────
    if key == "active_ing":
        AI_MAP = {
            "lavender":"Lavender Oil",      "peppermint":"Peppermint Oil",
            "eucalyptus":"Eucalyptus Oil",  "lemon":"Lemon Oil",
            "frankincense":"Frankincense Oil","tea tree":"Tea Tree Oil",
            "rosemary":"Rosemary Oil",      "jasmine":"Jasmine Oil",
            "rose":"Rose Oil",              "sandalwood":"Sandalwood Oil",
            "ylang ylang":"Ylang Ylang Oil","bergamot":"Bergamot Oil",
            "cedarwood":"Cedarwood Oil",    "lemongrass":"Lemongrass Oil",
            "orange":"Orange Oil",          "cinnamon":"Cinnamon Oil",
            "patchouli":"Patchouli Oil",    "grapefruit":"Grapefruit Oil",
            "vetiver":"Vetiver Oil",        "clary sage":"Clary Sage",
            "vanilla":"Vanilla Fragrance Oil","pine":"Pine Oil",
            "spearmint":"Spearmint Oil",    "geranium":"Geranium Oil",
        }
        for k, v in AI_MAP.items():
            if k in scent or k in title:
                return v
        scent_cap = scent.split()[0].capitalize() if scent else ""
        return f"{scent_cap} Oil" if scent_cap else "Fill ingredient name (e.g. Lavender Oil)"

    # ── SCENT DURATION ────────────────────────────────────────────────────────
    if key == "scent_duration":
        if re.search(r"\breed\s+diffuser\b", title) or "DIFFUSER" in ptype:
            return "Value: 30 | Unit: Days"
        if re.search(r"\bcandle\b", title) or "CANDLE" in ptype:
            return "Value: 40 | Unit: Hours"
        return "Value: 8 | Unit: Hours"

    # ── CAPACITY / VOLUME ─────────────────────────�