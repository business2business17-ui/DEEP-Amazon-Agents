---
name: amazon-review-split-auditor
description: >
  Amazon Review Sharing Policy Auditor — analyzes Amazon Category Listing Reports (.xlsm/.xlsx) to identify which product variation families are at risk of review splitting under Amazon's updated February–May 2026 policy. Use this skill whenever a user uploads an Amazon Category Listing Report (flat file), variation flat file, or any Amazon listing export and asks about review sharing, review split risk, variation compliance, review status audit, or wants to check which ASINs may lose shared reviews. Also trigger when the user mentions: "review sharing policy", "reviews will be split", "variation audit", "at risk of review split", "Amazon review policy update", "which products will lose reviews", or "audit my variations". Always trigger even if the user just drops a .xlsm or .xlsx file and says they want to understand review risk. Returns a formatted Excel Audit Tracker.
---

# Amazon Review-Split Auditor


## ▶ Before you run (pre-flight)

- **This skill is for:** seeing which variation families will lose shared reviews under the **Feb–May 2026** review-sharing policy.
- **You get back:** a colour-coded Excel tracker (Shared / At-Risk Split / Needs-Manual-Review / Standalone) + a theme-by-theme fix playbook.
- **Pull this first:** *Category Listings Report (CLR, .xlsm)* or a variation flat file — Seller Central → Catalog → Inventory Reports → Category Listings Report.
- **Wrong tool?** General catalog data quality → **clr-catalog-audit**.
- **Optional companions:** Keepa (review-count history) to monitor counts after a split. *(Reviews aren't natively exportable — this predicts risk from structure, then you verify flagged families on Amazon.)*

If no CLR / variation file is attached, name it above and stop.

## What This Skill Does

Amazon updated its review sharing policy (effective February–May 2026). Reviews are now **only shared** across variation families where the differences are minor and don't affect core functionality. Products with significant variation differences (flavor, formulation, scent as primary, different materials, bundle vs. standalone, etc.) will have reviews **split** — each child variant shows only its own reviews.

This skill runs in **two phases**:

**Phase 1 — Automated audit** (always run first)
1. Parse the uploaded CLR (`.xlsm` or `.xlsx`)
2. Extract every variation family (parent + children)
3. Classify each family as **Shared**, **At Risk - Split**, **Needs Manual Review**, or **N/A - Standalone**
4. Output a colour-coded Excel Audit Tracker

**Phase 2 — Manual verification + final reclassification** (for "Needs Manual Review" families only)
5. Guide the user to verify flagged families directly on Amazon.com
6. Reclassify confirmed families as **Shared (Manually Verified)** or **At Risk - Split**
7. Produce a clean final output with no unresolved yellow rows

---

## Step 1: Understand the Input File

The Category Listing Report (flat file) has a sheet called **`Template`**. Key rows:
- **Row 4**: Human-readable column headers
- **Row 5**: Amazon API attribute names (the machine names)
- **Row 6+**: Actual product data

Critical columns to extract (by header name, row 4):

| Column | What It Tells You |
|---|---|
| `Status` | listing_status — only process "Active" or non-blank rows |
| `SKU` | Unique identifier for each child listing |
| `Parentage Level` | "Parent" or "Child" — identifies the family structure |
| `Parent SKU` | For child rows: links back to parent. For parents: their own SKU |
| `Variation Theme Name` | THE key signal — e.g. "FlavorName-SizeName", "Color", "ScentName" |
| `Item Name` / `Title` | Product name for display in the audit |
| `Brand Name` | Client / brand |
| `Product Id` | ASIN (if Product Id Type = ASIN) |
| `Flavor` | flavor attribute value |
| `Scent` | scent attribute value |
| `Material` | material attribute values |
| `Color` | color attribute value |
| `Size` | size attribute value |
| `Number of Items` | pack quantity |
| `Item Package Quantity` | alternate pack field |
| `Special Ingredients` | supplement-specific formulation signal |
| `Active Ingredients` | pharma/supplement active ingredient values |
| `Specific Uses for Product` | use-case variation signal |
| `Age Gender Category` | user-profile variation signal |
| `Model Number` / `Model Name` | model/generation signal |

Run `scripts/run_audit.py` to do the heavy lifting — it handles parsing, classification, and Excel generation.

---

## Step 2: Classification Rules

Apply these rules in order. The **first matching rule wins**.

### 🔴 SPLIT RISK (reviews will NOT be shared)

| Policy Theme | Triggers When Variation Theme Contains... | Also Check Attributes |
|---|---|---|
| Flavor / Ingredients / Formulation | `Flavor`, `FlavorName`, `Ingredient`, `Formul`, `Formula` | `flavor`, `special_ingredients`, `active_ingredients` fields differ across children. Scope: food, drinks, and supplements (e.g., protein shake chocolate vs vanilla; pet food chicken vs salmon) |
| Scent (primary) | `ScentName`, `Scent` — AND product category is fragrance/candle/personal care | `scent` field populated |
| Material / Finish | `MaterialType`, `Material`, `Finish`, `Fabric` | `material` fields differ across children |
| Platform / Compatibility | `Compatibility`, `Platform`, `OperatingSystem`, `DeviceType` | |
| Model / Generation | `ModelName`, `ModelNumber`, `Generation`, `Version` | `model_name`, `model_number` fields differ |
| Bundles / Accessories | `BundleOption`, `AccessoryType`, `KitType`, `Bundle` | `package_contains_sku` present |
| Fit / Special Sizes | `FitType`, `FitName`, `SpecialSize` | "slim fit", "petite", "tall", "plus size" in title |
| Use-case / Intended User | `UseCaseType`, `UseCase`, `SkinType`, `HairType`, `GenderType` | `specific_uses_for_product`, `age_gender_category` vary |
| Performance / Power | `Wattage`, `Voltage`, `Power`, `RAM`, `Storage`, `Capacity` | |
| Home appliances (power changes by size) | `Size`, `SizeName` — **only when product is a home appliance** (waffle maker, AC, drill, blender, etc.) | Size variation where functional capacity (BTU, wattage, slots) changes with size — checked via product name against appliance keyword list |
| Design Differences | `DesignName`, `Design` | significant design variation in jewelry/accessories |

### 🟢 SHARED (reviews will continue to be shared)

| Policy Theme | Triggers When Variation Theme Contains... |
|---|---|
| Color / Pattern | `Color`, `ColorName`, `Pattern`, `Print` |
| Size / Dimensions | `Size`, `SizeName`, `Dimension` — same product function at different sizes. **⚠️ Exception: home appliances where size changes power/capacity (waffle maker 2 vs 4 slots, AC different BTU) → flagged as Needs Manual Review instead of Shared** |
| Pack / Quantity | `Count`, `PackQuantity`, `PackSize`, `Quantity`, `Multi` |
| Scent (secondary) | `ScentName` — AND product type is cleaning/trash bags (scent is incidental) |
| Fitment | `Fitment`, `VehicleModel`, `PhoneModel`, `DeviceModel` |

### 🟡 NEEDS MANUAL REVIEW

The script flags a family for manual review when it cannot confidently classify from data alone:
- Variation theme is **deprecated** (Amazon marked it "Do Not Use") — the underlying theme keyword is obscured
- Theme has **both safe and risky components** (e.g., `FlavorName-Color`)
- Size variation where function may change with size (e.g., appliances, concentrates vs. ready-to-use)
- Scent in an ambiguous product category

**Important:** "Needs Manual Review" does NOT mean the family is at risk. In practice, the majority of deprecated-theme families turn out to be sharing reviews fine — the flag just means automated classification wasn't reliable enough to confirm.

### ⬜ N/A — STANDALONE

A product with no variation children. Review sharing policy is irrelevant — there is nothing to share or split. These are automatically marked N/A by the script and require zero action.

**Do not confuse FBA/non-FBA SKU pairs with variation children.** Two SKUs that map to the same ASIN (e.g., `HN-5001` and `HN-5001-FBA`) are the same product on different fulfilment channels — not separate variants. The script handles this automatically.

---

## Step 3: Run the Automated Audit

1. Install dependencies if needed: `pip install openpyxl pandas --break-system-packages -q`
2. Run the bundled script:
   ```
   python scripts/run_audit.py "<path_to_category_listing_report>" "<output_path>"
   ```
3. The script handles parsing, classification, FBA deduplication, cross-family ASIN detection, and Excel generation
4. Save the output to the workspace folder
5. Share the file and report: "X parent families reviewed — Y shared, Z at risk, W need manual review, V standalone"

---

## Step 4: Post-Audit — Manual Verification of "Needs Manual Review" Families

After sharing the Phase 1 output, guide the user through verifying the flagged families. Pull the list of unique parent ASINs/SKUs from the "Needs Manual Review" rows and present them clearly.

### How to verify — 3 methods (fastest to most thorough)

**Method 1 — Live product page (30 seconds per ASIN, recommended)**
Go to Amazon.com and search for the parent ASIN directly. Click between the child variants in the variation selector dropdown. Watch the star rating and review count:
- Same number across all variants → ✅ Reviews are sharing
- Number changes when you switch variants → 🔴 Reviews are already split

**Method 2 — Variation Wizard in Seller Central**
Go to Catalog → Add Products → search for the parent ASIN → Edit Variation. Scroll past the variation list and look for an info banner: *"Reviews are shared across this variation family"* (safe) or a split warning (at risk). Note: this banner is not always shown for all ASINs.

**Method 3 — Seller Assistant tool**
In Seller Central Help, search "review sharing" or paste the parent ASIN. Amazon's own tool gives a definitive eligibility answer.

### Key things to check for each flagged family

- **Deprecated STYLE_NAME / COLOR_SIZE themes** → usually size or format variations (e.g., 24oz vs gallon vs 3-pack). Typically sharing. Confirm on Method 1.
- **Concentrated vs. Ready-to-Use variants** → same formula, different dilution. Usually sharing, but worth confirming.
- **Mixed SIZE + STYLE themes** → if the size change doesn't alter the core product function, usually sharing.
- **Different scent variants in cleaning products** → scent is incidental, usually sharing.

### What to do with the results

After the user completes the manual check, ask them to confirm:
1. Which families are confirmed **sharing** → reclassify as `Shared (Manually Verified)`
2. Which families are confirmed **not sharing** → reclassify as `At Risk - Split`

Then update the Excel file accordingly — update the Review Status cell, Policy Reason, Audit Notes (add "Seller manually confirmed on Amazon.com that reviews are sharing/not sharing"), and Recommended Action. Re-save as a FINAL version.

The goal is a clean output where every row is either Green, Red, or Grey — no unresolved Yellow rows remain.

---

## Step 5: Generate the Excel Audit Report

Output a professional Excel file with **two sheets**:

### Sheet 1: "Audit Tracker"

Columns (in order):
| Column | Source |
|---|---|
| Account / Brand | `Brand Name` from listing |
| Parent ASIN | `Product Id` where `Parentage Level = Parent` |
| Parent SKU | `SKU` where `Parentage Level = Parent` |
| Child ASIN | `Product Id` for each child row |
| Child SKU | `SKU` for each child row |
| Product Name | `Item Name` / `Title` |
| Variation Theme | `Variation Theme Name` |
| Review Status | "Shared", "At Risk - Split", "Needs Manual Review", or "N/A - Standalone" |
| Policy Reason | The Amazon policy category name |
| Audit Notes | Detailed explanation: what was detected and why |
| Recommended Action | Concrete next step |

#### Colour coding for Review Status:
- **Shared / Shared (Manually Verified)** → Green fill (`#C6EFCE`), dark green text (`#276213`)
- **At Risk - Split** → Red fill (`#FFC7CE`), dark red text (`#9C0006`)
- **Needs Manual Review** → Yellow fill (`#FFEB9C`), dark amber text (`#9C5700`)
- **N/A - Standalone** → Grey fill (`#EDEDED`), grey text (`#595959`)

### Sheet 2: "Summary"

- Total entries audited
- Count by status: Shared / At Risk / Manual Review / N/A - Standalone
- List of most common risky variation themes
- Date of audit and file name processed

---

## Important Notes

- The CLR `.xlsm` must be opened with `data_only=True` to get values not formulas
- The "Template" sheet is the correct sheet — skip `Instructions`, `Data Definitions`, etc.
- Row 4 = column headers; Row 5 = API attribute names; actual data starts at Row 6 or 7
- If the file has no `Parentage Level` column, infer families by grouping on `Parent SKU`
- ⚠️ CATALOG OVERLAP warnings (same child ASIN under two parent SKUs) are flagged automatically — these are a separate catalog hygiene issue, not a review sharing issue, but should be fixed in Seller Central
- Always show the user a count at the end: "X families reviewed — Y shared, Z at risk, W manual review, V standalone (N/A)"

Read `references/amazon_policy.md` for the complete Amazon policy text to use in Audit Notes explanations.

---

## Fix Playbook — How to Save Review Sharing

When a family is flagged **At Risk - Split**, always present the applicable fixes before recommending separation. Work through the fix options in order — start with the safest/lowest-effort fix first.

**Always end the fix recommendation with a timing note** — if a major sales event (Prime Day, Black Friday, peak season) is within 6 weeks, escalate urgency. Amazon cases take 1–3 weeks. Act early.

---

### Fix Playbook: Scent (Primary) — Essential Oils, Candles, Perfumes, Air Fresheners

**Fix 1 — Make Size the Primary Theme (Recommended first path)**

If the family also varies by size (10ml vs 30ml vs 100ml, single vs 3-pack), change theme from `ScentName` → `SizeName-ScentName`. Size becomes primary, scent becomes secondary (incidental). Amazon's own policy says scent-as-secondary = SHARED.

- Effort: Low — flat file upload or Manage Variations
- Safety: 🟡 Medium — works confidently for cleaning/household; grey area for essential oils
- Steps: Update theme via flat file → open 3 Seller Central cases (1 for review sharing request, 2 for child ASIN data corrections that surface during theme change) → expect 1–2 weeks resolution

**Fix 2 — Change Theme to Flavor Name (Grey area, competitor-validated)**

In the **Aromatherapy / Essential Oils / Carrier Oils browse path**, some sellers use `FlavorName` instead of `ScentName`. Amazon permits this in this specific category — "Lavender", "Peppermint", "Tea Tree" are treated as flavors. MAYJAM (same browse path) uses this successfully.

- Effort: Low — flat file theme change
- Safety: 🟡 Grey area — confirmed working in Aromatherapy node; do NOT attempt in other categories without verifying a competitor uses it first
- Steps: Same as Fix 1 (flat file + 3 cases). Best timed 4–6 weeks before Prime Day / peak season
- Confirm first: Check a direct competitor's variation structure on Amazon.com — if they use FlavorName in the same browse node, it's a green light

**Fix 3 — Pack Quantity as Primary Theme**

Restructure each scent into its own parent, varying only by pack size (1-pack, 3-pack, 6-pack). Theme = `PackQuantity` or `Count` → 100% SHARED per Amazon policy. Best-selling scents get their own consolidated review pool.

- Effort: Medium — requires restructuring variation families
- Safety: 🟢 100% safe — pack/quantity is explicitly SHARED
- Trade-off: Each scent becomes a separate parent. Review pools split by scent but safe within each scent's pack sizes
- Best for: High-velocity single scents (e.g., EEO's top-selling Lavender, Peppermint)

**Fix 4 — Color as Primary Theme (Permanent long-term fix)**

Design distinct colored packaging per scent variant. Theme = `Color` → 100% SHARED. Lavender gets purple label, Peppermint gets green, Tea Tree gets white, etc. All variants share reviews under one parent.

- Effort: High — requires packaging redesign and new listing images
- Safety: 🟢 100% safe — Color is explicitly SHARED
- Best for: Brands willing to invest in packaging as a long-term brand-building move. Pitch as a brand refresh project
- Note: Color difference must be clearly visible in main listing image — Amazon may challenge if images look identical

**Fix 5 — Don't Touch Deprecated Themes That Are Already Sharing**

If a family uses a deprecated theme (e.g., `STYLE_NAME`, `COLOR_SIZE`) AND reviews are currently sharing — **do not change anything.** Deprecated theme families sit in an ambiguous state that Amazon has not yet enforced. Changing the theme resets the eligibility clock and may trigger a split.

- Effort: Zero
- Safety: 🟢 Safe as long as you don't touch it
- How to verify: Go to Amazon.com → click between child variants → watch if star rating and review count stay the same → if yes, leave it alone

**Fix 6 — Bundle ASIN + Amazon Vine (Post-Split Recovery)**

If splitting is unavoidable, launch a **multi-scent gift set bundle** as a new ASIN (e.g., "Lavender + Peppermint + Tea Tree Discovery Set"). Enroll in Amazon Vine immediately to seed 30 reviews quickly. Bundle builds its own review pool independently and captures "gifting" search demand.

- Effort: Medium — new ASIN creation, Vine enrollment ($200 fee)
- Safety: 🟢 100% safe — new standalone ASIN
- Best for: Post-split recovery or launching a new scent with zero reviews

---

### Fix Playbook: Flavor / Ingredients / Formulation — Supplements, Food, Beverages, Pet Food

**Fix 1 — Pack Quantity as Primary Theme (Safest)**

If variants differ by flavor AND pack size, restructure so each flavor is its own parent varying only by count (30-count vs 60-count vs 90-count). Theme = `PackQuantity` → SHARED. Each flavor builds its own review pool safely.

- Effort: Medium
- Safety: 🟢 100% safe
- Best for: Supplements (EcoTeas, Himalayan Secrets, Natura) where 30ct/60ct/90ct variation exists alongside flavor

**Fix 2 — Remove Flavor Variants from Parent, Keep Only Size/Count**

If the risky child ASINs (different flavors) are low-review or low-velocity, remove them from the variation family. Keep only same-formula, different-size variants under one parent. Low-review flavor variants become standalones — they lose nothing meaningful.

- Effort: Low — flat file PartialUpdate to detach child ASINs
- Safety: 🟢 Safe
- Best for: Families where 1–2 flavor outliers are dragging down the whole family's risk status

**Fix 3 — Consolidate Formula, Rebrand as "Original" vs "New Formula"**

If two variants are nearly identical in formulation (same active ingredients, minor flavor difference), consider consolidating into one SKU. Alternatively, reframe one variant as "Original" and another as a size variant of the same product.

- Effort: Medium-High — may require label change
- Safety: 🟡 Grey area — Amazon may flag if formulation fields differ in the listing
- Best for: Supplement brands where "flavor" is a minor note (e.g., lightly flavored vs unflavored protein)

**Fix 4 — Separate High-Review ASINs Before Split Hits**

If the policy enforcement email has already arrived (30-day notice), immediately detach the highest-review child ASIN and make it a standalone parent BEFORE Amazon executes the split. It retains its review count as a standalone. Then rebuild variation structure cleanly.

- Effort: Low — flat file detach
- Safety: 🟢 Safe — proactive detach before Amazon's system splits it
- Timing: Must be done before Amazon's enforcement date on the 30-day notice email

---

### Fix Playbook: Material / Finish — Cookware, Apparel, Accessories

**Fix 1 — Color as Primary Theme**

If material variants also differ visually (stainless steel = silver, cast iron = black, copper = rose gold), restructure with Color as primary theme. Material becomes a secondary attribute mentioned in title/bullets.

- Effort: Medium — theme change + image update
- Safety: 🟢 100% safe if color genuinely differs
- Best for: Cookware, jewelry, home goods

**Fix 2 — Separate Premium Material as Upgrade ASIN**

Position the premium material (e.g., stainless steel) as a standalone "Premium" or "Pro" version with its own ASIN and build its review pool via Vine. The base material variant keeps existing reviews as its own standalone.

- Effort: Low — detach one child, Vine enroll
- Safety: 🟢 Safe
- Best for: When material difference is genuinely a tier upgrade (basic vs premium line)

---

### Fix Playbook: Bundles / Accessories

**Fix 1 — Detach Bundle ASIN, Keep as Standalone**

The standalone product and the bundle should never be in the same variation family. Detach the bundle ASIN — it becomes its own standalone with its own review pool. The standalone base product keeps its existing reviews.

- Effort: Low — flat file detach
- Safety: 🟢 100% correct per Amazon policy
- Note: This is not a workaround — Amazon's policy was always that bundles should be separate ASINs

**Fix 2 — Reframe Bundle as "Kit" with Distinct ASIN**

If the bundle has strong reviews, give it a distinct kit-branded ASIN ("Starter Kit", "Complete Set") so it stands independently and builds its own search ranking and review pool over time.

- Effort: Low-Medium
- Safety: 🟢 Safe

---

### Fix Decision Matrix — Quick Reference

When presenting fixes to the user, use this matrix to prioritize:

| At Risk Reason | Fastest Fix | Safest Fix | Long-Term Fix |
|---|---|---|---|
| Scent (Primary) — Essential Oils | Fix 2: Flavor Name theme | Fix 3: Pack Quantity | Fix 4: Color packaging |
| Scent (Primary) — Candles/Perfumes | Fix 1: Size-Scent theme | Fix 3: Pack Quantity | Fix 4: Color packaging |
| Flavor/Formulation — Supplements | Fix 2: Detach outlier variants | Fix 1: Pack Quantity | Separate by formula line |
| Flavor/Formulation — Food/Pet Food | Fix 2: Detach outlier variants | Fix 1: Pack Quantity | Fix 4: Vine recovery |
| Material/Finish | Fix 1: Color as primary | Fix 2: Separate premium tier | Color packaging redesign |
| Bundle/Accessories | Fix 1: Detach bundle ASIN | Fix 1: Detach bundle ASIN | Distinct Kit ASIN |
| Home Appliance Size | Confirm specs first | Separate by wattage/BTU | Separate product lines |

### Timing Rule (Always State This)
> If a major sales event is within **6 weeks** — Prime Day, Black Friday, Cyber Monday, peak season — flag this as **urgent**. Amazon Seller Central cases take 1–3 weeks. Theme changes need time to propagate. Vine reviews take 2–4 weeks to appear. Every week of delay = lost review-sharing benefit during peak traffic.

