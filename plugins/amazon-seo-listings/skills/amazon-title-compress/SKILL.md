---
name: amazon-title-compress
description: "Compress an Amazon product title to 75 characters or less and produce a matching 125-character Item Highlights string, using category-specific priority rules. Accepts single (title + URL) input, batch (multiple title + URL pairs), or a CLR (Category Listing Report)/catalog export for account-level batch processing, optionally paired with an All Listings Report to backfill missing ASINs. For CLR-based account review, outputs a two-tab workbook: a reviewer-facing analysis tab and a minimal, PartialUpdate-ready upload tab (SKU, Listing Action, Product Type, Parentage Level, Parent SKU, Title, Item Highlight only)."
---

# Amazon Title Compress


## ▶ Before you run (pre-flight)

- **This skill is for:** getting titles legal for the **July 27, 2026** rule — a 75-character title plus a 125-character Item Highlights field, with your best keywords prioritized (not just chopped).
- **You get back:** a reviewer-facing analysis tab + a PartialUpdate-ready upload tab (SKU, Title, Item Highlight).
- **Pull this first:** *Category Listings Report (CLR, .xlsm)* for bulk — Seller Central → Catalog → Inventory Reports → Category Listings Report. Or a title + URL list for one-offs. Optional: *All Listings Report* to backfill missing ASINs.
- **Wrong tool?** Want a full attribute/content audit → **clr-catalog-audit**.
- **Optional companions:** your SQP / Search Term data to decide which keywords survive into the 75 characters. *(Media categories are exempt; bundles need manual review.)*

If no CLR or title list is attached, name it above and stop.

Rewrite Amazon product titles to meet the July 27, 2026 75-character limit while retaining the highest-value keywords, differentiators, and conversion signals. Route overflow to Item Highlights (125 chars), which is searchable and visible in search results and on product detail pages.

## Inputs

**Single mode:**
- Original title (pasted)
- Amazon listing URL or ASIN

**Batch mode (URL-based):** paste a list using either format — auto-detect:
```
Title 1 | https://www.amazon.com/dp/ASIN1
Title 2 | https://www.amazon.com/dp/ASIN2
```
or CSV:
```
title,url
"Product Title 1",https://www.amazon.com/dp/ASIN1
"Product Title 2",https://www.amazon.com/dp/ASIN2
```

**Batch mode (CLR-based):** an Amazon CLR (Category Listing Report) — a flat-file `.xlsm` template — or similarly structured catalog export.

**Optional companion file — All Listings Report (ASIN fallback):** Amazon's Product Id / Product Id Type columns in a CLR export are frequently blank for a meaningful share of rows (not a parsing bug — Amazon simply doesn't always populate them on export). If the user also uploads an **All Listings Report** (Seller Central → Inventory → Inventory Reports → All Listings Report; typically a tab-delimited `.txt` or `.csv`, sometimes re-saved as `.xlsx`), use it to backfill missing ASINs:
- Match rows by SKU: the All Listings Report's `seller-sku` column ↔ the CLR's `SKU` column.
- Pull the ASIN from the report's `asin1` (or `asin`) column.
- Only fill gaps — never overwrite an ASIN the CLR already has, since the CLR is the source of truth for everything else.
- If a SKU in the CLR has no match in the All Listings Report either, leave ASIN blank and do not fabricate one — flag it in Notes as "ASIN not found in CLR or All Listings Report."
- This companion file is for **reporting/reference only** (populates the ASIN column on the reviewer-facing analysis tab). It is never required to compress a title, and it is not part of what gets uploaded back to Amazon — the upload-ready tab is keyed by SKU, not ASIN (see Step 6).
- If the user doesn't provide this file and ASINs are missing, proceed anyway — leave ASIN blank on those rows rather than blocking the batch or asking permission first.

**CLR file structure (real Amazon template layout — verified against an actual export, do not assume a simple flat table):**
```
Sheet:  "Template"
Row 0:  Settings string — ignore
Row 1:  Instructions text (e.g. "Use ENGLISH to fill this template...") — ignore
Row 2:  Reference Group section labels (merged group headers, e.g. "Listing Identity", "Variations") — ignore
Row 3:  HUMAN-READABLE column headers  ← use as column names (Status, Title, SKU, Product Type, Parentage Level, Parent SKU, etc.)
Row 4:  Attribute key names (::title, contribution_sku#1.value, etc.) — ignore
Row 5:  Example/sample row (generic Amazon demo product, e.g. "Amazon Essentials Men's Full-Zip Cotton Sweater" / SKU "ABC123") — EXCLUDE from processing
Row 6+: ACTUAL listing data
```

**Do not hardcode these row numbers blindly** — Amazon's template layout has shifted between versions before (this structure was corrected after finding a real export had two more preamble rows than an earlier assumption). Instead, detect the header row dynamically: scan the first ~10 rows for the one that contains both "Title" and "SKU" as cell values — that is the header row. Everything one row below it that still looks like attribute keys (values starting with `::` or containing `#1.value`) is the attribute-key row, not data. The row after that is the example row (exclude it — it's reliably an Amazon demo product, not real inventory: watch for generic placeholder titles/SKUs like "ABC123"). Real data starts the row after the example row.

**Parse pattern:**
```python
import openpyxl, pandas as pd

def parse_clr(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Template"]
    all_rows = list(ws.values)

    # Dynamically find the header row instead of assuming a fixed index
    header_idx = None
    for i, row in enumerate(all_rows[:10]):
        row_vals = [str(c) for c in row if c is not None]
        if "Title" in row_vals and "SKU" in row_vals:
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Could not locate header row (expected 'Title' and 'SKU' columns) in first 10 rows")

    human_headers = list(all_rows[header_idx])
    # The row immediately after headers is attribute keys (::title etc.) — skip it
    # The row after that is the example/demo row — skip it too
    # Confirm by checking the attribute-key row looks like keys, not headers
    data_start = header_idx + 3  # header row -> attribute-key row -> example row -> real data
    data_rows = all_rows[data_start:]

    df = pd.DataFrame(data_rows, columns=human_headers)
    df = df.dropna(how="all").reset_index(drop=True)

    # Deduplicate column names: Bullet Point → Bullet Point_1, _2, ... (many columns repeat,
    # e.g. Bullet Point, Special Features, Material, Color-adjacent fields, Scent, Occasion, etc.)
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

**Parent/child/standalone split (matters for title consistency and variant handling in Step 5c):**
```python
def norm_parentage(v):
    s = str(v).strip().lower()
    return "" if s in ("none", "nan", "null") else s

df = df[df.apply(lambda r:
    str(r.get("SKU","")).strip() not in ("","nan","None") and
    norm_parentage(r.get("Parentage Level","")) in {"parent","child",""},
    axis=1
)].reset_index(drop=True)

children = df[df["Parentage Level"].fillna("").astype(str).str.lower() == "child"].reset_index(drop=True)
parents  = df[df["Parentage Level"].fillna("").astype(str).str.lower() == "parent"].reset_index(drop=True)
standalone = df[~df["Parentage Level"].fillna("").astype(str).str.lower().isin(["parent","child"])].reset_index(drop=True)

# Map parent SKU → product type, useful for confirming category consistency
# across a variation family before applying category rules to related children
parent_ptype_map = dict(zip(
    parents.get("SKU", pd.Series()).astype(str),
    parents.get("Product Type", pd.Series()).astype(str)
))
```
Process **parent, child, and standalone rows** for title rewrites — a real CLR export can show parents with their own customer-facing title (e.g. a parent SKU with title "Hygea Natural Nourishing Pet Shampoo for Dogs"), while many valid live SKUs have blank/None Parentage Level and are still standalone products. Do not filter those out. Process the parent first conceptually: its title sets the shared skeleton (Brand + Core Product Type + Category structure) that children should stay consistent with per Step 5c, then process each child, keeping the skeleton identical and only the variant element differing. Standalone rows should be treated as single-variant listings unless the CLR clearly shows otherwise. Use the parent's Product Type as a sanity check when a child's own Product Type field is blank or ambiguous.

**Multi-slot fields:** Amazon repeats some fields across multiple columns (e.g. `Bullet Point`, `Bullet Point_1`...`Bullet Point_4`; `Flavor`, `Flavor_1`, `Flavor_2`). After the dedup step above, pull all slots when scanning for differentiators, ingredients, or claims:
```python
def g(row, col_name):
    val = row.get(col_name)
    return str(val).strip() if val and str(val).strip() not in ("None","nan","") else ""

def g_multi(row, base_col, count=5):
    cols = [base_col] + [f"{base_col}_{i}" for i in range(1, count)]
    return [g(row, c) for c in cols if g(row, c)]
```

**General rules for CLR-based processing:**
- The CLR is the single source of truth. Do not fetch listing URLs even if ASINs are present.
- If the CLR is missing a detail needed to confidently apply a category rule or verify a claim, do not guess or fabricate — flag it in Notes and proceed with what's verifiable.
- If an account name is present or supplied (e.g. processing one client's catalog at a time), carry it through to output as an Account field.

If only a title is pasted with no URL and no CLR, ask for the URL or category before proceeding — category is required for correct prioritization.

## Step 1 — Establish Category

**URL-based input:** For each listing:
1. Extract the ASIN from the URL.
2. Fetch the listing page (WebFetch) to capture:
   - Category breadcrumb (this is the primary category signal)
   - Existing bullet points / About This Item
   - Product details section (materials, dimensions, variants, certifications)
3. If the page is blocked or returns no breadcrumb, ask the user: "I couldn't read the category from the listing — what category is this listed under?"
4. Map the breadcrumb to one of the Category Groups below. Use the deepest matching level (e.g. "Tools & Home Improvement > Power & Hand Tools > Drills" maps to Tools).

**CLR-based input:** For each real listing row (parent, child, or standalone) after parsing per the pattern above:
1. Read Product Type directly from the row; if blank or ambiguous on a child, fall back to `parent_ptype_map` using the row's parent SKU.
2. Map it to the closest Category Group below, using the deepest matching level.
3. Use `g_multi()` to pull all slots of Bullet Point, Flavor, Scent, and any other multi-slot fields present, to inform Step 2 parsing — no external fetch needed.

**Recommended direct Product Type → Category Group mappings for common CLR values seen in real exports:**
- `ANIMAL_FUR_CLEANER_CONDITIONER` → **Pet Supplies**
- `INSECT_REPELLENT`, `PESTICIDE`, `SURFACE_CLEANING_WIPE`, `CLEANING_AGENT`, `LAUNDRY_DETERGENT` → **Home & Kitchen** unless the browse context clearly lands in Health/Household or Pet
- `MATTRESS_COVER`, `PILLOW_PROTECTOR` → **Home & Kitchen**
- `CONDITIONER`, `SKIN_MOISTURIZER`, `LIP_BALM`, `PERSONAL_FRAGRANCE`, `ESSENTIAL_OIL` → **Beauty & Personal Care**
- `TEA`, `GROCERY` → **Grocery & Gourmet Food**
- `HERBAL_SUPPLEMENT` → **Health & Household / Supplements**
- `TEA_INFUSER` → **Home & Kitchen**
- `AROMA_DIFFUSER` → **Home & Kitchen** unless detail clearly places it in Electronics
- `APPAREL` → **Apparel & Accessories**
If a Product Type is unfamiliar or miscoded, use the title plus bullets to choose the closest shopper-facing category and flag the mismatch in Notes instead of trusting the code blindly.

## Step 2 — Parse the Original Title

Break the original title into components:
- **Brand** — registered brand/trade name
- **Model** — model number or product line name (Electronics, Tools, Automotive)
- **Core ID** — the thing it is (e.g. "Drill Driver", "Moisturizing Cream", "Dog Food")
- **Key Spec** — primary measurable differentiator (dose, capacity, wattage, size, count, weight)
- **Ingredients / Materials** — specific substances or materials (Berberine HCL, 100% Cotton, Stainless Steel)
- **Benefit Claim** — functional benefit (GLP-1 Support, Noise Canceling, Waterproof)
- **Variant** — color, flavor, scent, size variant
- **Trust Signal** — certifications, origin (Made in USA, USDA Organic, NSF Certified, UL Listed)
- **Category Descriptor** — generic category label that duplicates the browse node (e.g. "Herbal Supplements", "Power Tool", "Skincare Product") — almost always droppable

## Step 3 — Apply Category Priority Rules

Use the category group detected in Step 1. Follow the priority order: **Must-Keep → High-Value → Item Highlights → Drop**.

---

### Apparel & Accessories
**Must-Keep:** Brand, Gender/Age group, Core item type, Primary material (if distinctive — "Merino Wool", "100% Cotton"), Size indicator if in the title
**High-Value:** Color/pattern, Fit type (Slim Fit, Relaxed), Quantity (3-Pack)
**Item Highlights:** Care instructions, Additional colors, Style details, Season
**Drop:** Generic descriptors ("Comfortable", "High Quality", "Fashion"), Category label ("Shirt", "Pants" when the item type already covers it)
**Abbreviations OK:** XS, S, M, L, XL, XXL, 2XL, 3XL, oz, in, ft

---

### Automotive
**Must-Keep:** Brand, Product name, Key spec/grade (5W-30, SAE 30, 2000 PSI), Size/quantity
**High-Value:** Compatibility note (if short — "for Toyota", "Universal Fit"), Certification (API SN)
**Item Highlights:** Full vehicle compatibility list, Additional specs, Bundle contents
**Drop:** Generic ("Motor Oil", "Tire Inflator" when already in product name), "High Performance"
**Abbreviations OK:** qt, gal, oz, PSI, RPM, V, W, Ah

---

### Baby Products
**Must-Keep:** Brand, Product name, Key feature/mode count ("4-in-1"), Color/pattern
**High-Value:** Age/weight range, Size stage (Newborn, Infant, Toddler)
**Item Highlights:** Weight limits, Safety certifications (JPMA, ASTM), Machine washable, Included accessories
**Drop:** Generic reassurance ("Safe", "Comfortable", "Soft")
**Abbreviations OK:** lbs, oz, in

---

### Beauty & Personal Care
**Must-Keep:** Brand, Product name, Skin/hair type if specific (Dry Skin, Oily Skin), Size/count
**High-Value:** Key active ingredient if it's the point of the product (Vitamin C, Hyaluronic Acid, Retinol), Dermatologist tested, Fragrance-free
**Item Highlights:** Full ingredient callouts, Certifications (EWG, Cruelty-Free, Vegan), For use with instructions, Regimen placement (AM/PM)
**Drop:** Generic ("Natural", "Clean Beauty", "Best Seller"), redundant category label
**Abbreviations OK:** oz, fl oz, mL, g

---

### Electronics & Computers
**Must-Keep:** Brand, Model number/name, Primary function (Noise Canceling Headphones, 4K Monitor), Key spec (resolution, storage, wattage, connectivity)
**High-Value:** Color/finish, Compatibility signal (USB-C, Bluetooth 5.3), Generation/version
**Item Highlights:** Battery life, Included accessories, OS compatibility, Warranty details
**Drop:** Marketing ("Next-Gen", "Ultra", "Pro" unless it's the official product name), redundant "Smart" unless it distinguishes from a dumb version
**Abbreviations OK:** GB, TB, MB, GHz, MHz, W, V, Ah, mAh, in, mm, ms, Hz, USB, HDMI, 4K, 8K

---

### Grocery & Gourmet Food
**Must-Keep:** Brand, Product name, Flavor/variety, Net weight or count, Pack size
**High-Value:** Dietary claim (Gluten-Free, Keto, Non-GMO, Organic) — only if it's a primary purchase driver for this product
**Item Highlights:** Full certifications, Allergen info, Nutritional highlights, Storage/preparation
**Drop:** Generic ("Delicious", "All-Natural" without certification, "Artisan")
**Abbreviations OK:** oz, fl oz, lb, g, kg, mL, L, pk, ct

---

### Health & Household / Supplements
**Must-Keep:** Brand, Active ingredient + form (Berberine HCL, Magnesium Glycinate — form specificity matters for search), Dose (1500mg), Count (60ct, 90ct)
**High-Value:** Primary benefit (GLP-1 Support, Sleep Support) — keep if space allows
**Item Highlights:** Additional ingredients, Origin (Made in USA), Certifications (NSF, USP, GMP), Usage instructions, Dietary callouts (Vegan, Non-GMO)
**Drop:** Generic category label ("Herbal Supplement", "Dietary Supplement", "Vitamin"), "All Natural", "Pure"
**Abbreviations OK:** mg, mcg, IU, g, ct, cap, tab, soft, oz

---

### Home & Kitchen
**Must-Keep:** Brand, Product name, Key feature or mode count ("7-in-1", "Self-Cleaning"), Capacity/size
**High-Value:** Material (Stainless Steel, Cast Iron, BPA-Free), Color if it's a primary driver
**Item Highlights:** Dishwasher safe, Oven safe temp, Included accessories, Warranty, Compatible appliances
**Drop:** "Perfect For", "Ideal For", generic "Kitchen Essential"
**Abbreviations OK:** qt, oz, in, ft, sq ft, W, V, lb

---

### Office Products & Stationery
**Must-Keep:** Brand, Product name, Key spec (yield, page count, capacity), Count/pack size
**High-Value:** Compatibility (printer model series if short), Color
**Item Highlights:** Full compatibility list, ISO yield, Page coverage spec
**Drop:** Generic ("Office Essential", "Professional Quality")
**Abbreviations OK:** pk, ct, in, mm, lb (paper weight), XL, HY (High Yield)

---

### Pet Supplies
**Must-Keep:** Brand, Product name, Target animal + life stage (Adult Dog, Senior Cat, Puppy), Primary protein/main ingredient, Size/weight
**High-Value:** Special formula callout (Grain-Free, Limited Ingredient, Sensitive Stomach) if it's the purchase reason
**Item Highlights:** Guaranteed analysis, AAFCO statement, Full ingredient list, Certifications
**Drop:** "Premium", "Gourmet", "Wholesome", generic "Dog Food" when "Chicken & Rice Dog Food" already covers it
**Abbreviations OK:** lb, lbs, oz, kg, ct

---

### Sports & Outdoors / Exercise & Fitness
**Must-Keep:** Brand, Product name, Key spec (weight capacity, resistance level, volume, distance rating), Size/color if it drives the purchase
**High-Value:** Material (if distinctive — Titanium, Carbon Fiber, 600D Polyester), Gender/age if targeted
**Item Highlights:** Dimensions, Weight, Warranty, Compatible accessories, Activity-specific callouts
**Drop:** "High Performance", "Professional Grade" (unless it's a certified pro product)
**Abbreviations OK:** lbs, kg, oz, L, gal, in, ft, cm, mm

---

### Tools & Home Improvement
**Must-Keep:** Brand, Model number (if well-known) OR product name, Type (Cordless Drill Driver, Impact Wrench), Key spec (voltage, torque, PSI, CFM)
**High-Value:** Chuck size or bit size, Speed/variable speed, Battery included flag (if a major differentiator)
**Item Highlights:** Included accessories and battery/charger info, Kit contents, Warranty, Compatibility (FLEXVOLT, POWERSTATE)
**Drop:** "Powerful", "Professional", "Heavy-Duty" unless technically specified
**Abbreviations OK:** V, Ah, in, ft, lbs, RPM, PSI, CFM, HP, W

---

### Toys & Games
**Must-Keep:** Brand, Product/set name, Piece count (for LEGO-type sets) or Key feature, Age range
**High-Value:** Theme or character name if it drives purchase, Battery requirements (Battery-Free is a selling point)
**Item Highlights:** Dimensions (assembled/box), Battery specs and count, Choking hazard note if relevant, Educational skill callouts
**Drop:** "Fun", "Educational" as standalone words (show it, don't say it)
**Abbreviations OK:** pc, pcs, in, cm

---

## Step 4 — Compression Rules (Universal)

Apply to all categories after priority mapping:

**Character counting:** Count every character including spaces. The Amazon limit is 75 for the title, 125 for Item Highlights.

**Target length strategy:** Amazon's rule is **75 characters or less**, not "aim for 70 no matter what." For optimization, aim for a **useful, information-dense target band of roughly 68-75 characters** when the product has enough verified attributes to support that naturally. Do **not** pad with filler words, weak adjectives, or redundant category labels just to reach 70.

**No-change rule for already compliant titles:** If the current title is already **<= 75 characters** and does **not** violate a known Amazon title rule, prefer **No Change** unless at least one of these is true:
- the brand is missing or should be normalized for consistency
- a critical differentiator / size / count / target use is missing
- the title is inconsistent with the parent-child family skeleton
- the title contains awkward, redundant, or low-value wording that a cleaner rewrite materially improves
- the title is compliant but too vague to identify the actual product clearly
If none of the above are true, keep the existing title and state: `Already compliant at [X] chars; no change recommended.`

**Bytes vs characters:** Amazon enforces some category title limits by *byte* length, not character count. Plain ASCII letters, digits, spaces, and the approved punctuation below are 1 byte each, so for an ASCII title the character count equals the byte count. Non-ASCII characters cost more — an em dash "—" is 3 bytes, curly/smart quotes are 3 bytes each, accented letters and ® © ™ are 2–3 bytes, and emoji are 4+. Stay in ASCII: use a straight quote `"`, a plain hyphen `-`, and the ` | ` separator, so the count you see is the count Amazon enforces. (This is the underlying reason the separator rule forbids em dashes.)

**Safe abbreviations (all categories):**
- Units: oz, fl oz, lb, lbs, g, kg, mg, mcg, mL, L, qt, gal, in, ft, cm, mm, W, V, Ah, mAh
- Count: ct, pk, ea, pc, pcs
- Size: XS, S, M, L, XL, XXL, 2XL, 3XL
- Common: USB, HDMI, LED, LCD, AC, DC, AI, UV, IR, BPA, NSF, GMP, USDA

**Separators:** Use a single space or ` | ` (pipe with spaces) between components. Do not use em dashes, hyphens as separators, or commas to separate major components (commas OK within a component list like "Magnesium Glycinate, Ceylon Cinnamon").

**Never do:**
- Truncate mid-word to hit the limit
- Keyword-stuff with synonyms ("Weight Loss Supplement Fat Burner Diet Pills")
- Use ALL CAPS except for established acronyms and brand names that are stylized that way
- Include promotional language: "Best", "#1", "Top Rated", "Sale", "Free Shipping"
- Repeat the brand in the title if it's already in the Brand field on Amazon (though in practice, leading with brand in the title is still common and acceptable)
- Include special characters other than: `+`, `&`, `/`, `#`, `|`, `%`, `(`, `)`
- Drop a compliance-required or claim-substantiating element to save space. Prop 65 warnings, allergen statements, child/choking-hazard notices, and certifications that are legally load-bearing (USDA Organic, NSF, GMP, "Made in USA" under FTC rules) must never be deleted. If they don't fit the title, route them to Item Highlights or the matching flat-file attribute — relocate, never remove.
- Invent or upgrade a claim that isn't on the listing. Every word you keep or route must trace to the fetched listing content. If the page was blocked and a spec couldn't be verified, leave it out — never fabricate dimensions, materials, counts, or benefits to fill space. A made-up claim is an account-health risk, not a conversion win.

**Compression tactics (use in order):**
1. Drop the category descriptor first — it duplicates the browse node
2. Move trust signals and certifications to Item Highlights
3. Use abbreviations for units and counts
4. Consolidate benefit claims — keep the strongest one, move secondary claims to Item Highlights
5. Move compatibility details to Item Highlights unless they are the primary search filter (e.g., "for iPhone 15")
6. Trim flavor/color from title if the product has a variation page with that attribute already (but keep it if it's a single-variant listing)

## Step 5 — Build Item Highlights

Item Highlights should:
- Pick up everything dropped from the title that is still searchable and conversion-relevant
- Not repeat what is already in the title
- Read as a natural, useful string — not a keyword dump
- Stay at or under 125 characters
- Lead with the highest-conversion overflow content (certifications, origin, secondary ingredients, key claims)

## Step 5b — Route to Structured Attributes (Rufus / COSMO / Search Filters)

Item Highlights is free text. Amazon's AI shopping layer — Rufus and the COSMO knowledge graph — and the left-rail search filters read **structured flat-file attributes**, not free text. So a fact dropped from the title doesn't only "live" in Item Highlights; if it maps to a structured field, populate that field too, or it stays invisible to filtered search and AI answers. Routing to Item Highlights protects keyword indexation; routing to the structured attribute protects filter and AI retrieval. Do both.

For every element you drop or route, check whether it maps to a structured attribute and flag it. Common mappings:

| Displaced element | Structured attribute to populate |
|---|---|
| Material / fabric / finish | `material`, `fabric_type` |
| Scent / fragrance | `scent_name` |
| Flavor / variety | `flavor_name` |
| Diet / specialty (Keto, Vegan, Organic) | `diet_type`, `specialty` |
| Form (capsule, powder, liquid, gel) | `item_form` |
| Active / key ingredient | `special_ingredients`, `active_ingredients` |
| Color | `color_name` |
| Size / capacity / count | `size_name`, `unit_count`, `item_dimensions` |
| Skin / hair type / body part | `skin_type`, `hair_type`, `body_part` |
| Certification / origin | `country_of_origin`, certification attributes |
| Use case / occasion | `recommended_uses_for_product`, `specific_uses` |

This is the difference between information that is merely *present* on the page and information Amazon can actually *retrieve*.

## Step 5c — Variation & Parent-Child Handling

Before trimming a variant attribute (size, color, flavor, scent, count) from the title, check whether the ASIN is a child in a variation family:

- **CLR-based input:** this is answered primarily by the `Parentage Level` column (`parent` vs `child`) parsed in the Inputs section. A `child` row belongs to a variation family defined by its parent relationship and, where present, fields such as `Variation Theme Name`. A row with no parent match or `Parentage Level` blank/absent should be treated as standalone.
- **URL-based input:** infer from the listing page (variation swatches/dropdowns present = part of a family).

Then apply:
- **Child of a variation family:** the variant is already defined by the parent relationship and, where present in the CLR, fields such as `Variation Theme Name` plus the child's variation attributes, so the title doesn't need to carry the full descriptor — and titles should stay structurally consistent across the family (same skeleton, only the variant differs). Keep the variant word only if it's the primary search term buyers use; otherwise let the variation attribute carry it.
- **Standalone / single-variant listing:** keep the variant in the title — no variation attribute is doing that job, so dropping it loses the search term entirely.
- **Never strip the element that distinguishes one child from another** (e.g. removing "5 lb" when 2 lb / 5 lb / 10 lb are siblings) — it makes the children indistinguishable in search and on the family page.

If the listing doesn't make the family relationship clear, treat it as single-variant and keep the variant.

## Step 5d — Judgment on Category Rules

The category priority tables in Step 3 cover the common cases. If a specific ASIN or category has a nuance the standard rules don't anticipate — an unusual product type, a compliance requirement specific to that subcategory, a search-behavior pattern that makes a different element more valuable than what the table lists — apply judgment and deviate, explaining the reasoning in "What Moved and Why" or the Reason for Recommendation column.

This is for genuine edge cases, not a license to redesign the framework per ASIN. Default to the category table; deviate only when it materially improves the recommendation, and always state why.

## Step 6 — Output

**Single listing:**
```
TITLE ([X]/75 chars):
[New title]

ITEM HIGHLIGHTS ([X]/125 chars):
[Item Highlights string]

WHAT MOVED AND WHY:
- [Component]: moved to Item Highlights — [reason]
- [Component]: dropped — [reason]

STRUCTURED ATTRIBUTES TO SET (flat file — so Rufus/COSMO & filters can read it):
- [attribute] = [value]
(omit this block if nothing was routed to a structured field)

ORIGINAL ([X] chars):
[Original title]
```

**Batch (URL-based):**
Output a numbered block per listing using the same format, then a summary table:

```
| # | ASIN | Category | Orig Chars | New Title Chars | IH Chars |
|---|------|----------|------------|-----------------|----------|
| 1 | ... | ... | 162 | 71 | 98 |
```

**Batch (CLR-based / account review):**
When the input is a CLR and the output is meant for stakeholder review (e.g. an account manager, client-facing sheet), produce a single Excel-ready workbook with **two tabs**:

*Tab 1 — "Title Compress Analysis"* — reviewer-facing, one row per ASIN/SKU:
| Account | Brand | ASIN | SKU | Parentage Level | Parent SKU | Product Type | Current Title | Current Char | Suggested Title Rewrite | New Char | Suggested Item Highlights | IH Char | Structured Attributes to Set | Reason for Recommendation | Priority (High/Medium/Low) | Notes |

If an All Listings Report was supplied, ASIN is backfilled per the Inputs section; otherwise leave blank rather than guessing.

*Tab 2 — "CLR Upload Ready"* — built for the account manager to paste straight back into the flat file after approving Tab 1. **Do not pass through all ~570 CLR columns.** A title/Item Highlights partial-update only needs the fields Amazon actually reads for that action, plus family context for the reviewer:
| SKU | Listing Action | Product Type | Parentage Level | Parent SKU | Title | Item Highlight |

- **SKU** — required; Amazon's identifier for which row to update.
- **Listing Action** — required; must read `Edit (Partial Update)` (the CLR's human-readable value for `::record_action` / `update_delete=PartialUpdate`) so Amazon only touches the columns actually filled in and leaves everything else on the live listing untouched.
- **Product Type** — carried over as-is from the CLR row; many multi-category CLR exports still validate/route per row on this field even in partial-update mode, so keep it rather than assume it's optional.
- **Parentage Level** and **Parent SKU** — carried over as-is from the CLR row, unchanged. These are not required for the content update itself, but they must stay in the sheet so the account manager can see family context at a glance and so nothing looks accidentally unlinked during review. Never leave Parent SKU out of this tab.
- **Title** — the suggested rewrite from Tab 1 (identical value, not re-derived).
- **Item Highlight** — the suggested Item Highlights from Tab 1 (identical value, not re-derived). Leave blank if nothing was displaced from the title for that row.
- Do **not** include Status (`::listing_status`, Active/Inactive) in this tab — it isn't part of a title/Item Highlights update, and carrying it along risks accidentally resubmitting a stale status value.
- Do **not** include pricing, dimensions, compliance, image, or any other CLR column here — those aren't being changed, and PartialUpdate only requires columns for fields actually being modified. A wide passthrough of the full CLR schema is not "safer" for a partial update; it's noise a reviewer has to scroll past and a larger blast radius if a stray value in an untouched column gets included by mistake.
- **Item Type Keyword (browse node path)** — never include in Tab 2. This field wasn't touched by the compression logic, so resubmitting it in a PartialUpdate risks either an attribute-mismatch error against Amazon's current live classification, or an unintended browse node reassignment — for a field this workflow was never asked to change. If the user wants visibility into current browse node placement for reference, add it as a read-only column on Tab 1 only, sourced straight from the CLR with no modification.
- Column order in Tab 2: put **Parent SKU immediately after SKU** (not buried later in the row) so family context is visible without scrolling — this was flagged as easy to miss otherwise, even though the data itself was already present and correctly populated (populated only on Child rows; blank on Parent/standalone rows is correct, not missing data).
- Column names and Product Type/Listing Action/Parentage Level/Parent SKU values must match the source CLR verbatim (same casing, same enum text) so re-upload requires no remapping.

**Behavior rules for this review sheet:**
- If the title is already compliant and no material improvement is needed, keep `Suggested Title Rewrite` the same as `Current Title`, keep `New Char` equal to `Current Char`, and state `Already compliant at [X] chars; no change recommended.` in Reason for Recommendation.
- When a rewrite is needed, prefer a final title that lands in the **68-75 char band** if meaningful verified attributes support it naturally.
- Do not shorten a title aggressively to 30-50 chars unless that shorter form is clearly the strongest compliant option.
- `Suggested Item Highlights`, `IH Char`, and `Structured Attributes to Set` should be populated only when something meaningful is displaced from the title or needs to be preserved for search/filter/AI retrieval.
- Notes may mention that IH / attributes / notes can be hidden before a client-facing share if the reviewer wants a cleaner handoff.

**Sort order — group by family, not alphabetically or by row order in the CLR:**
1. Sort by Parent SKU first (rows with no Parent SKU, i.e. standalone products, sort by their own SKU).
2. Within each family, the parent row comes first, followed by its children in the order they appear in the CLR.
3. This keeps each variation family visually together in the sheet — the parent's title skeleton sits immediately above its children's variants, making it easy to spot inconsistency across a family at a glance.

Priority logic for the review tab:
- High = current title exceeds 75 chars, or violates a known Amazon policy (promotional language, symbols, ALL CAPS, keyword stuffing)
- Medium = compliant but materially improvable for clarity, brand normalization, family consistency, or missing differentiator
- Low = already compliant and only minor cleanup is suggested, or no change is recommended

Notes column: flag anything uncertain, anything routed to Item Highlights/structured attributes worth the reviewer's awareness, or any deviation from standard category logic and why.

Process every row in the CLR — no skipping, even if "no change needed."

## When to Ask Questions

Ask only if:
- The listing URL is blocked, returns no breadcrumb, and the category cannot be inferred from the title
- The original title is missing a key piece of information that would materially change compression choices (e.g., no count/size visible anywhere)
- A batch input has formatting that cannot be auto-parsed into title + URL pairs

Do not ask permission to proceed. Do not ask the user to verify the category if you can read it from the breadcrumb.

---

## Changelog

**v12** — Item Type Keyword (browse node) exclusion guardrail and Parent SKU visibility fix, no original logic removed:
- **Browse node field explicitly barred from Tab 2** (Step 6) — Item Type Keyword carries the product's browse node path (e.g. "Pet Supplies > Dogs > Grooming > Shampoos & Conditioners > Shampoos"). It's untouched by this workflow, so it must never ride along in a PartialUpdate upload sheet: resubmitting a value the compression logic never verified risks an attribute-mismatch error or an unintended reclassification. Available as a reference-only column on Tab 1 if requested, never on Tab 2.
- **Parent SKU repositioned to column 2 in Tab 2** — data was already correct (only Child rows populated; Parent/standalone rows correctly blank), but its position later in the row made it easy to miss during review. Moved immediately after SKU.

**v11** — fixed CLR Upload Ready tab bloat and restored Parent SKU visibility, no original logic removed:
- **Two-tab output restored, Tab 2 rebuilt as a real PartialUpdate sheet** (Step 6) — the CLR-based batch workflow now explicitly produces "Title Compress Analysis" (reviewer-facing, unchanged from v10's single-tab content) plus a genuinely minimal "CLR Upload Ready" tab. Passing through the CLR's full ~570-column schema into the upload tab was wrong: a title/Item Highlights PartialUpdate in Amazon's flat-file system only requires SKU + Listing Action (`Edit (Partial Update)`) + the field(s) actually being changed — everything else stays untouched on the live listing when PartialUpdate is used, so including 560+ unrelated blank columns added no safety and just made the sheet unusable to hand to an account manager.
- **Parent SKU (and Parentage Level) explicitly required in the upload tab** — these carry no update instruction to Amazon by themselves, but dropping them made it impossible for a reviewer to see family context at a glance in the trimmed sheet, which is what triggered this fix. Both are now named columns in Tab 2, never omitted.
- **Status column deliberately excluded from Tab 2** — `::listing_status` (Active/Inactive) isn't part of a title/Item Highlights change; carrying it along in an upload-ready sheet risks resubmitting a stale value with no upside.
- **All Listings Report accepted as an optional companion input** (Inputs) — CLR exports frequently ship with blank Product Id/ASIN on a real share of rows; this isn't a parsing bug to "fix" in the CLR reader, it's a gap in what Amazon exports. When the user also provides an All Listings Report, ASIN is backfilled by SKU match for reporting purposes only (Tab 1). The upload tab was never keyed by ASIN and doesn't need it. If no companion file is provided, ASIN stays blank on those rows rather than being guessed at.

**v10** — added compliant-title preservation logic and single-tab review output, no original logic removed:
- **Amazon rule vs optimization target clarified** (Step 4) — the hard rule remains **75 characters or less** for titles, while optimization now aims for an information-dense **68-75 char band** when supported by real attributes. The skill must not pad titles just to hit 70.
- **No-change rule for already compliant titles** (Step 4, CLR review output) — if a current title is already <= 75 characters and does not have a policy/clarity/family-consistency problem, the default recommendation is now to keep it unchanged instead of rewriting it shorter for no strong reason.
- **Single consolidated CLR review tab** (Step 6 + frontmatter) — replaced the older two-tab stakeholder workflow with one `Title Compress Review` tab that includes title, Item Highlights, structured attributes, reasons, priority, and notes in columns.
- **Anti-overcompression guardrail** (Step 4/Step 6) — rewrites should not collapse a title to a much shorter 30-50 char form unless that is genuinely the best compliant option.

**v8** — fixed leftover variation-theme field wording for full CLR naming consistency, no original logic removed:
- **Step 5c terminology aligned** — replaced the leftover `variation_theme` wording with CLR-consistent language referencing the parent relationship and, where present, fields such as `Variation Theme Name`. This is mainly a clarity/documentation fix so the instructions don't mix generic snake_case with the actual CLR column naming.

**v7** — fixed standalone-SKU exclusion and tightened real-CLR category mapping, no original logic removed:
- **Standalone rows no longer get filtered out** (Inputs) — many real CLR exports contain valid live SKUs with blank/None `Parentage Level`; these must still be processed. Parsing now keeps parent, child, and standalone rows instead of accidentally dropping standalone listings.
- **CLR-based processing wording corrected** (Step 1) — changed from "each child row" to all real listing rows, so the instructions match the intended account-level audit workflow.
- **Direct Product Type mapping hints added** (Step 1) — documented real PTD values seen in live exports (for example `ANIMAL_FUR_CLEANER_CONDITIONER`, `MATTRESS_COVER`, `ESSENTIAL_OIL`, `TEA`, `HERBAL_SUPPLEMENT`) so the agent can map them consistently to shopper-facing category groups instead of relying on vague inference.
- **Variation field wording tightened** (Step 5c) — references `Variation Theme Name` where present in CLR exports rather than assuming a single field label.

**v6** — fixed parent-title assumption, added family grouping to output, no original logic removed:
- **Corrected parent processing** (Step 1, CLR-based input) — parents can carry a real customer-facing title in a real CLR export (confirmed in Hygea data: parent SKU with its own title). Both parent and child rows are now processed, with the parent's title treated as the skeleton children should stay consistent with.
- **Parentage Level + Parent SKU columns added to Tab 2** — makes family relationships visible directly in the stakeholder review sheet, not just inferable from the CLR.
- **Family-grouped sort order for Tab 2** — rows sort by Parent SKU (parent first, then its children in CLR order) instead of raw CLR row order or alphabetically, so reviewers can see a full family's titles together and immediately spot inconsistency across variants.

**v5** — corrected CLR row structure against a real export (v4's assumption was wrong by 2 rows), no original logic removed:
- **Verified structure**: headers sit at row 3 (not row 2), attribute keys at row 4 (not row 3), example row at row 5 (not row 4), real data starts row 6 (not row 5). A real Hygea export showed the v4 assumption would have misread the example row as data and the true header row as an attribute-key row.
- **Dynamic header detection**: rather than trust a hardcoded row index again, the parser now scans the first ~10 rows for the one containing both "Title" and "SKU" and treats that as the header row, with the example row and data start computed relative to it. Protects against Amazon shifting the template layout again.
- **Example-row fingerprint**: documented that the example row is a generic Amazon demo product (e.g. "Amazon Essentials Men's Full-Zip Cotton Sweater", SKU "ABC123") — useful as a sanity check when confirming the row was skipped correctly.

**v4** — corrected CLR parsing to match Amazon's real flat-file structure, no original logic removed:
- **Real CLR parse pattern** (Inputs) — CLR is an `.xlsm` with a `Template` sheet; human headers sit at row 2, an example row at row 4 must be excluded, and actual data starts at row 5. Previously assumed a generic flat table.
- **Parent/child split via `Parentage Level`** (Inputs, Step 5c) — process child rows for title rewrites; use parent's Product Type as a fallback when a child's own field is blank; variation-family detection in Step 5c now ties directly to this column instead of inference alone.
- **Multi-slot field handling** (Inputs) — fields like `Bullet Point`, `Flavor`, `Scent` repeat across deduplicated columns (`_1`, `_2`...); added a helper to pull all slots when scanning for differentiators or claims.

**v3** — added CLR-based account workflow, no original logic removed:
- **CLR input mode** (Inputs, Step 1) — accepts a CLR/catalog export as the single source of truth for account-level batch runs; no listing URL fetch needed or performed when a CLR is provided.
- **Dual-tab account review output** (Step 6) — CLR-based batch runs now produce a two-tab workbook: full technical detail (Tab 1) plus a condensed Account/Brand/ASIN/SKU/Priority review sheet (Tab 2) for stakeholder handoff.
- **Judgment note** (Step 5d) — explicit guidance to deviate from standard category rules only for genuine edge cases, with reasoning stated — not a general license to redesign the framework per ASIN.

**v2** — added four capabilities, no original logic removed:
- **Byte vs character counting** (Step 4) — Amazon enforces some title limits by byte length; stay ASCII so the visible count matches the enforced count.
- **Structured attribute routing** (Step 5b) — displaced facts that map to flat-file attributes (material, scent, diet_type, item_form, etc.) are flagged for the structured field, so Rufus, COSMO, and search filters can retrieve them — not just Item Highlights free text.
- **Compliance + integrity guardrails** (Step 4 "Never do") — never delete a compliance-required or claim-substantiating element to save space; never fabricate a claim that isn't on the listing.
- **Variation / parent-child handling** (Step 5c) — don't strip the attribute that distinguishes a child ASIN; keep variants on standalone listings; keep titles consistent across a family.