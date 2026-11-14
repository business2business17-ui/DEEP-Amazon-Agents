---
id: 02-pricing
title: { ru: "Цены и градации цен", en: "Pricing & price gradients" }
block: 02-pricing
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [pricing, price, list-price, sale-price, map, minimum-price, maximum-price, uvp, buy-box, featured-offer, strike-through, quantity-discount, business-price]
updated: 2026-11-14
sources:
  - { url: "https://developer-docs.amazon.com/sp-api/docs/product-pricing-api", kind: official, note: "Product Pricing API v0" }
  - { url: "https://github.com/amzn/selling-partner-api-models/blob/main/models/product-pricing-api-model/productPricingV0.json", kind: official, note: "OfferType / PriceType schema" }
  - { url: "https://github.com/amzn/selling-partner-api-models/blob/main/models/listings-items-api-model/listingsItems_2021-08-01.json", kind: official, note: "list_price, offers, replenishmentDiscount, quantityDiscountPlan" }
---

# Цены и градации цен / Pricing & price gradients

Как устроена цена на Amazon: какие бывают типы цен, какая из них «видна человеку», как задавать градации (Min/Max, Sale, UVP, List, MAP) и как это отражается в SP-API и фидах.

How Amazon pricing works: price types, which price the shopper actually sees, how to set gradients (Min/Max, Sale, UVP, List, MAP), and how this maps to SP-API and feeds.

---

## 1. Модель цен / Price model

На Amazon у одного товара одновременно существует несколько ценовых полей. **Покупатель видит не все** — только «Featured Offer» (Buy Box) и, при наличии, зачёркнутую эталонную цену.

A single product carries several price fields at once. **The shopper sees only some** — the Featured Offer (Buy Box) and, if present, a struck-through reference price.

### Сводная таблица типов цен / Price types overview

| Тип цены (EN) | RU | Где задаётся | Видит ли покупатель | Атрибут SP-API / поле |
|---|---|---|---|---|
| **Your Price** / Standard Price | Обычная цена продажи | Seller Central / Listings Items offer | ✅ да (это «текущая цена») | `purchasable_offer` → `our_price` / `price.amount` |
| **Sale Price** | Акционная цена | Seller Central (даты) / фид | ✅ да, пока активна + зачёркнутая база | `sale_price` (со `schedule`) |
| **List Price** | Прейскурантная цена | Seller Central / PTD attribute | ✅ как зачёркнутая база «Вы экономите» | `list_price` |
| **UVP / Reference Price / Was Price** | «Было» / рекомендованная | вычисляется Amazon | ✅ зачёркнутая | (внутренняя, не задаётся напрямую) |
| **Minimum Advertised Price (MAP)** | Минимальная рекламируемая | бренд / `minimum_advertised_price` | ❌ скрыто, ограничивает показ | `minimum_advertised_price` |
| **Minimum Price** | Нижняя граница offer | Seller Central / attr | ❌ служебная | `minimum_price` |
| **Maximum Price** | Верхняя граница offer | Seller Central / attr | ❌ служебная | `maximum_price` |
| **Business Price** | Цена для B2B | Seller Central / offer B2B | ✅ бизнес-покупателям | `business_price` / offer `B2B` |
| **Dealer Price** | Оптовая цена | PTD (некоторые категории) | ❌ | `dealer_price` |
| **Quantity Price (градации)** | Цена за количество | offer / `quantityDiscountPlan` | ✅ B2B / бизнес | `quantityDiscountPlan` |

---

## 2. Какая цена видна человеку / Which price the shopper sees

**Правило:** покупатель видит цену **Featured Offer** (продавец, выигравший Buy Box). Внутри API это:

> **Rule:** the shopper sees the **Featured Offer** price (the seller who won the Buy Box). In the API:

- `RegularPrice` — текущая цена **без промо и без доставки** (это и есть «сколько стоит товар»).
- `BuyingPrice.ListingPrice` — цена **с учётом промо** (скидка/coupon на момент запроса).
- `BuyingPrice.LandedPrice` = `ListingPrice + Shipping − Points` — полная сумма к списанию.

> `RegularPrice` = current price excluding promotions, excluding shipping. `BuyingPrice.ListingPrice` = price including active promotions. `LandedPrice` = ListingPrice + Shipping − Points.

**Зачёркнутая цена («Вы экономите X%»)** показывается только если Amazon считает эталонную цену валидной: это `List Price` (заданная) или `Was Price` (вычисленная из истории). Правила — в §4.

> The struck-through "You save X%" shows only if the reference price is valid: a set `List Price` or a computed `Was Price`. Rules in §4.

---

## 3. Strike-through и List Price / Strike-through & List Price

### Правила (RU)
- **List Price** = рекомендованная розничная цена. Её можно задавать, но Amazon её **удаляет**, если считает нерепрезентативной (завышенной / не подтверждённой рыночными данными).
- Зачёркнутая цена показывается, только если **Sale Price < List Price** и List Price валидна.
- Нельзя показывать фиктивную «было/стало»: Amazon сверяет List Price с фактической историей цен и ценами конкурентов.
- Если задать Sale Price без валидной List Price → скидка может **не отобразиться** или зачёркнутая цена не появится.
- `[forum-lifehack]` Для стабильной зачёркнутой цены держите обычную цену на уровне, по которому товар реально продавался, а Sale Price — только временно.

### Rules (EN)
- List Price is validated; Amazon removes it if it looks inflated/unrepresentative.
- Struck-through price shows only when Sale Price < List Price and the List Price is valid.
- No fake "was/now": Amazon cross-checks List Price against actual price history and competitors.
- Sale Price without a valid List Price may not render a discount.
- `[forum-lifehack]` Keep Your Price at a level you actually sold at, and use Sale Price only temporarily, for a stable strike-through.

---

## 4. Min / Max price (границы) / Minimum & Maximum price

- **Minimum Price** и **Maximum Price** — это **защита продавца**: границы, внутри которых разрешено менять цену (репрайсинг, автоматизация). Не показываются покупателю.
- Если текущая цена выходит за границы → листинг может быть **подавлен** (suppressed). Официальная ошибка: **`18155`** — «minimum price is greater than the selling price… review and update» → `LISTING_SUPPRESSED`.

> Minimum/Maximum Price are seller **guardrails** (for repricing/automation), never shown. Out-of-range → listing suppression. Official error **`18155`** ("minimum price is greater than the selling price") → `LISTING_SUPPRESSED`.

### Правило составления (RU)
1. `Minimum Price` ≤ `Your Price` ≤ `Maximum Price`.
2. `Minimum Price` ≤ `Sale Price` (иначе 18155).
3. Держи Min достаточно низким, чтобы репрайсер мог реагировать на конкурентов, но не ниже маржи безопасности.

---

## 5. MAP — Minimum Advertised Price

- Минимальная цена, которую **бренд разрешает публично показывать**. Задаётся в `minimum_advertised_price`.
- Если offer ниже MAP → Amazon показывает «See price in cart» / «Add to cart to see price», а не цену.
- Это **брендовое ограничение**, не путать с `minimum_price` (защита продавца).

> The lowest price the brand allows to be advertised. Set via `minimum_advertised_price`. Below MAP, Amazon shows "See price in cart" instead of the number. This is a **brand** restriction, distinct from `minimum_price` (seller guardrail).

---

## 6. Sale Price (правила)

- Sale Price действует **в заданном окне дат** (`schedule`: `start_at` / `end_at`).
- Скидка отображается как `% off` от валидной эталонной цены.
- По окончании окна автоматически возвращается Your Price.

> Sale Price runs within a scheduled date window (`schedule.start_at` / `end_at`); discount is shown vs a valid reference price; reverts to Your Price after the window.

---

## 7. Business Price и градации по количеству / Business Price & quantity tiers

- **Business Price** — отдельная цена для Amazon Business (B2B).
- **Градации (quantity price)**: скидка за объём — два типа:
  - `PERCENT` — % скидки на цену от порога.
  - `FIXED` — фиксированная цена за порог.
- В API: `quantityDiscountPlan` (Listings Items) или `quantityDiscountPrices` (Product Pricing, `quantityTier` + `quantityDiscountType: QUANTITY_DISCOUNT`).

> Business Price = separate B2B price. Quantity tiers: `PERCENT` or `FIXED` discounts. API: `quantityDiscountPlan` / `quantityDiscountPrices`.

---

## 8. Отражение в SP-API / SP-API mapping

### 8.1 Запись (Listings Items API) / Write

Цены задаются через **атрибуты** (PTD) и через **offer**:

```jsonc
// attributes (snake_case, PTD)
"list_price":            [{ "currency": "USD", "value": 29.99, "marketplace_id": "ATVPDKIKX0DER" }],
"sale_price":            [{ "currency": "USD", "value": 19.99, "marketplace_id": "ATVPDKIKX0DER" }],
"minimum_advertised_price": [{ "currency": "USD", "value": 24.99, "marketplace_id": "ATVPDKIKX0DER" }],
"business_price":        [{ "currency": "USD", "value": 18.99, "marketplace_id": "ATVPDKIKX0DER" }]
```

> Офер (актуальная цена продажи) — `purchasable_offer` / `price` в операции PUT/PATCH:
> The offer (actual selling price) — `purchasable_offer` / `price` in PUT/PATCH.

### 8.2 Чтение (Product Pricing API) / Read

| Операция | Что возвращает | Лимит (rate/burst) |
|---|---|---|
| `getPricing` | Цены seller'а по ASIN/SKU | 0.5 / 1 |
| `getCompetitivePricing` | Конкурентные цены (свое + чужие offers) | 0.5 / 1 |
| `getListingOffers` | Offers на листинг | (см. модель) |
| `getItemOffers` | Offers на товар по ASIN | (см. модель) |

Структура offer (`OfferType`):
- `offerType`: `B2C` | `B2B`
- `BuyingPrice`: `ListingPrice`, `LandedPrice`, `Shipping`, `Points` (цена с промо + доставка)
- `RegularPrice`: текущая цена **без промо и без доставки**
- `businessPrice`: цена для B2B
- `quantityDiscountPrices`: градации по количеству
- `FulfillmentChannel`: `Amazon` (FBA) | `Merchant` (FBM)
- `ItemCondition`, `ItemSubCondition`, `SellerSKU`

---

## 9. Buy Box (Featured Offer) — факторы / Buy Box factors

Кто «виден» покупателю — определяется алгоритмом Featured Offer. Ключевые факторы:

1. **Landed price** (цена + доставка) — главный фактор.
2. **Fulfillment**: FBA обычно выигрывает у FBM при близкой цене.
3. **Метрики продавца**: ODR, время ответа, история.
4. **Наличие** на складе.
5. **Профессиональный план** (Pro seller) и история.

> The Featured Offer algorithm weights: landed price (primary), fulfillment (FBA > FBM at close price), seller metrics (ODR, response), stock, Pro plan + history.

---

## 10. Дельты по рынкам / Market deltas

| Рынок | Валюта | Особенность цен |
|---|---|---|
| US | USD | sales tax добавляется на checkout (по штату) |
| UK / EU | GBP / EUR | Цены указываются **вкл. VAT** (в отличие от US); MAP применяется аналогично |
| SE / PL | SEK / PLN | локальная валюта; те же правила strike-through |
| TR | TRY | высокая волатильность валюты — чаще пересматривать Min/Max `[unverified]` |
| AE / SA | AED / SAR | VAT 5% / 15%; единый GCC-подход к цене `[unverified]` |

Полные правила VAT/tax — в `05-feeds` и `02-pricing` (расширение).

---

## 11. Частые ошибки / Common price errors

| Код / симптом | Причина | Решение |
|---|---|---|
| `18155` `LISTING_SUPPRESSED` | `minimum_price` > `selling price` | снизить `minimum_price` ниже текущей цены |
| Нет зачёркнутой цены | List Price невалидна / не подтверждена | задать реалистичную List Price или дождаться Was Price |
| "See price in cart" | offer ниже MAP | поднять цену ≥ `minimum_advertised_price` |
| Sale не отображается | нет окна дат / нет валидной базы | задать `schedule` + валидную List Price |
| Buy Box не выигрывается | высокая landed price / метрики / FBM | снизить цену, включить FBA, починить метрики |

---

## 12. Итог: формула «прогрузки цен» / Price-gradient recipe

Для корректной «прогрузки» градаций задавай одновременно и согласованно:

```
minimum_price ≤ sale_price ≤ your_price ≤ list_price
your_price ≥ minimum_advertised_price (если бренд требует MAP)
your_price ≤ maximum_price
```

И держи: `sale_price` — только в окне дат; `list_price` — реалистичной; `business_price` и `quantityDiscountPlan` — для B2B-градаций.
