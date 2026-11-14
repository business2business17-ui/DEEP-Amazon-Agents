# Импортированные скиллы (из Amazon skills.txt)

Добавлены в агентов из репозиториев списка `Amazon skills.txt`. Скиллы перенесены как
есть (`SKILL.md` + `references/`), имена сохранены.

## Что добавлено (33 скилла)

| Источник (repo) | Куда | Скиллы |
|---|---|---|
| **amzn/selling-partner-agentic-toolkit** (офиц.) | amazon-seo-listings | sp-api-knowledge, listing-issues, listing-troubleshooter, listing-buyability, listing-searchability, listing-compliance, fba-inbound-management, stockout-prevention, finance-month-end-closer, seller-analytics, support-case-helper, invite-secondary-users |
| **shikhamishra379/sellerstack-amazon-seller-toolkit** | amazon-ppc | amazon-budget-bid-reallocation, amazon-bulk-search-term-harvester, amazon-search-term-optimizer, amazon-sqpr-analysis, amazon-tacos-diagnosis |
| (тот же) | amazon-seo-listings | amazon-title-compress, amazon-listing-compliance, amazon-review-split-auditor, amazon-exec-summary, amazon-weekly-digest, clr-catalog-audit, sellerstack-start |
| **zach22-1999/amazon-skills** | amazon-seo-listings | zach-product-research, zach-listing-health-checker, zach-feature-demand-validator, zach-seller-skill-creator |
| (тот же) | amazon-ppc | zach-search-term-analyzer, zach-search-term-report-analyzer, zach-sif-cvr-threshold-analyzer |
| **luotwo/BSC-Amazon-Rufus-Cosmo** | amazon-seo-listings | amazon-rufus-cosmo |
| **shimengranhao-max/amazon-ai-shopping-skill-cn** | amazon-seo-listings | amazon-ai-shopping-cn (китайский) |

## Что НЕ добавлено (и почему)

| Репо | Причина |
|---|---|
| `sealeap-ecommerce-skills` (195 скиллов) | внутри **нет Amazon** — только eBay/Etsy/MercadoLibre/Ozon/Shopify/TikTok/Walmart/Wayfair |
| `chatgpt-seo` (27), `claude-seo` (35), `seo-skills` (3), `ai-seo-skill`, `ecommerce-seo-audit-skill` | общий **веб-SEO (Google/Bing/Shopify)**, не Amazon-маркетплейс |
| `ecommerce-seo-geo-skills` (12) | geo/веб-SEO; Amazon-релевантен только `product-listing-seo-geo-optimizer` (не перенёс — дублирует твою SEO-базу) |
| `amazon-omniscient`, `aiamazonseo`, `RankGap`, `amazon-seo-tool`, `amazon-searchterm-249-optimizer`, `seo-tool-claude-seo`, `ecommerce-seo-optimizer`, `awesome-amazon-ec-skills`, `amazon-ads-mcp`, `kdp-scout`, `ecommerce-reviews-RAG`, `amazon-fba-calculator` | **код/тулзы/дашборды без SKILL.md** (не скиллы для агентов) |
| Excel/PowerBI «Sales Analysis» (из txt: пп. 6–15, 41–42) | дашборды аналитики, не скиллы |

## Источники

Все репозитории склонированы в `C:\Users\adria\txt-repos\` (исходники). Скиллы перенесены
скриптом `txt-repos\copy-skills.ps1` (идемпотентный: пропускает уже существующие).
