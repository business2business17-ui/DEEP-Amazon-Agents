---
id: 00-markets
title: { ru: "13 маркетплейсов Amazon", en: "13 Amazon marketplaces" }
block: 00-global
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [marketplace, ids, region, endpoint, currency, vat, tax-code, language]
updated: 2026-11-14
sources:
  - { url: "https://developer-docs.amazon.com/sp-api/docs/marketplace-ids", kind: official, verified: true, note: "marketplaceId — проверено 2026-11-14" }
  - { url: "https://docs.business.amazon.com/docs/amazon-business-urls", kind: official, note: "домены магазинов" }
---

# 13 маркетплейсов Amazon / 13 Amazon marketplaces

Сводка по рынкам, на которых работаем: **US, UK, EU (DE/FR/IT/ES/NL/SE/PL/BE/TR), MENA (AE/SA)**.

Summary of the marketplaces we operate in: **US, UK, EU (DE/FR/IT/ES/NL/SE/PL/BE/TR), MENA (AE/SA)**.

---

## Ключевой факт / Key fact

**SP-API имеет 3 эндпоинта** (NA, EU, FE). Из наших 13 рынков:

- **US** → NA-эндпоинт (`sellingpartnerapi-na.amazon.com`)
- **Все остальные 12** (UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA) → **EU-эндпоинт** (`sellingpartnerapi-eu.amazon.com`)

⚠️ Вопреки распространённому заблуждению, **UAE (AE) и Saudi Arabia (SA) находятся на EU-эндпоинте**, а не FE. FE — это только SG / AU / JP.

> SP-API has 3 endpoints (NA, EU, FE). Of our 13 marketplaces: US → NA endpoint; all other 12 (incl. UAE & KSA) → EU endpoint. FE is only SG/AU/JP.

---

## Полная таблица / Full table

| Код | Рынок (RU) | Market (EN) | `marketplaceId` | Домен | Эндпоинт | Валюта | Язык(и) | VAT / налог | Tax code |
|---|---|---|---|---|---|---|---|---|---|
| US | США | United States | `ATVPDKIKX0DER` | amazon.com | NA | USD | en_US | sales tax (по штату) | `A_GEN_TAX` |
| UK | Великобритания | United Kingdom | `A1F83G8C2ARO7P` | amazon.co.uk | EU | GBP | en_GB | VAT 20% | `A_GEN_Standard` |
| DE | Германия | Germany | `A1PA6795UKMFR9` | amazon.de | EU | EUR | de_DE | VAT 19% | `A_GEN_Standard` |
| FR | Франция | France | `A13V1IB3VIYZZH` | amazon.fr | EU | EUR | fr_FR | VAT 20% | `A_GEN_Standard` |
| IT | Италия | Italy | `APJ6JRA9NG5V4` | amazon.it | EU | EUR | it_IT | VAT 22% | `A_GEN_Standard` |
| ES | Испания | Spain | `A1RKKUPIHCS9HS` | amazon.es | EU | EUR | es_ES | VAT 21% | `A_GEN_Standard` |
| NL | Нидерланды | Netherlands | `A1805IZSGTT6HS` | amazon.nl | EU | EUR | nl_NL | VAT 21% | `A_GEN_Standard` |
| SE | Швеция | Sweden | `A2NODRKZP88ZB9` | amazon.se | EU | SEK | sv_SE | VAT 25% | `A_GEN_Standard` |
| PL | Польша | Poland | `A1C3SOZRARQ6R3` | amazon.pl | EU | PLN | pl_PL | VAT 23% | `A_GEN_Standard` |
| BE | Бельгия | Belgium | `AMEN7PMS3EDWL` | amazon.com.be | EU | EUR | nl_BE / fr_BE | VAT 21% | `A_GEN_Standard` |
| TR | Турция | Turkey | `A33AVAJ2PDY3EV` | amazon.com.tr | EU | TRY | tr_TR | VAT 20% `[unverified]` | `A_GEN_Standard` `[unverified]` |
| AE | ОАЭ | United Arab Emirates | `A2VIGQ35RCS4UG` | amazon.ae | EU | AED | en_AE / ar_AE | VAT 5% | `A_GEN_TAX` `[unverified]` |
| SA | Саудовская Аравия | Saudi Arabia | `A17E79C6D8DWNP` | amazon.sa | EU | SAR | en_SA / ar_SA | VAT 15% | `A_GEN_TAX` `[unverified]` |

`marketplaceId` — проверено по официальной документации SP-API (2026-11-14). Ставки VAT и tax codes для TR/AE/SA помечены `[unverified]` — сверить перед продакшеном (см. `02-pricing` и `05-feeds`).

> `marketplaceId` verified against official SP-API docs (2026-11-14). VAT rates and tax codes for TR/AE/SA are `[unverified]` — re-check before production.

---

## Региональные особенности / Regional notes

### US (NA)
- Единый NA-эндпоинт; на нём же CA/MX/BR с теми же ключами (см. `S:\US AMAZON API`).
- Налог: Amazon сам собирает marketplace sales tax по штатам — seller задаёт `taxCode = A_GEN_TAX`.
- Язык листинга: en_US.

### UK (EU) — после Brexit
- По-прежнему **EU-эндпоинт** SP-API (Brexit не изменил endpoint).
- Свой VAT-номер (GB) обязателен для хранения на FBA-складах UK.
- Отдельно от EU: CE → **UKCA** маркировка для ряда товаров.

### EU core (DE/FR/IT/ES) + EU прочие (NL/SE/PL/BE)
- Один EU-эндпоинт, но **каждый рынок — отдельный VAT-регистрационный режим**.
- **OSS / IOSS** для трансграничной торговли; **EPR** (упаковка, WEEE, батарейки) — особенно жёстко в DE и FR.
- Язык листинга — локальный (de_DE, fr_FR, …). Нельзя дублировать только en_US.
- `taxCode = A_GEN_Standard` для всех EU-рынков.

### TR (Турция)
- EU-эндпоинт, валюта TRY, язык tr_TR.
- Местный KDV (VAT) 20%; правила импорта и регистрации местного юрлица — отличаются. `[unverified]`

### MENA (AE / SA)
- **EU-эндпоинт** SP-API (не FE).
- GCC VAT: AE 5%, SA 15%. Локализация: AE — en_AE + ar_AE, SA — en_SA + ar_SA.
- Единый GCC-подход, но SA — отдельные требования по SABER/маркировке (см. `11-account`, compliance). `[unverified]`

---

## Матрица «что различается по рынкам» / What differs by market

| Аспект | US | UK | EU core | EU прочие | MENA |
|---|---|---|---|---|---|
| Эндпоинт SP-API | NA | EU | EU | EU | EU |
| Валюта | USD | GBP | EUR | EUR/SEK/PLN | AED/SAR |
| VAT / налог | sales tax | 20% | 19–22% | 21–25% | 5–15% |
| Tax code | `A_GEN_TAX` | `A_GEN_Standard` | `A_GEN_Standard` | `A_GEN_Standard` | `A_GEN_TAX` (verify) |
| Язык листинга | en_US | en_GB | локальный | локальный | en + ar |
| Compliance | — | UKCA | CE + EPR | CE + EPR | SABER/ECAS (SA) |
| Отчёты рекламы | USD | GBP | EUR | местн. | местн. |

Полные разборы отличий — в соответствующих блоках (`01-listings`, `02-pricing`, `05-feeds`, `10-logistics`, `11-account`).

---

## Источники / Sources
- SP-API Marketplace IDs (official, verified): https://developer-docs.amazon.com/sp-api/docs/marketplace-ids
- Amazon Business URLs: https://docs.business.amazon.com/docs/amazon-business-urls
- Домены/IDs также сверены с `Parser-AMZ-Company` (`MARKETS` в исходнике).
