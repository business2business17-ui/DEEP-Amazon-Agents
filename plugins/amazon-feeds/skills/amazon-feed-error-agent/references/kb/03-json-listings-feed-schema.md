---
id: 03-json-listings-feed-schema
title: { ru: "JSON-схема JSON_LISTINGS_FEED", en: "JSON_LISTINGS_FEED schema" }
block: 05-feeds
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [feeds, json-listings-feed, schema, message-type, product, relationship, price, inventory, image]
updated: 2026-11-14
sources:
  - { url: "https://github.com/amzn/selling-partner-api-models/blob/main/models/listings-items-api-model/listingsItems_2021-08-01.json", kind: official, note: "Listings Items API v2021-08-01 model" }
---

# JSON-схема `JSON_LISTINGS_FEED` / JSON_LISTINGS_FEED schema

Структура JSON-фида листингов (текущий стандарт; XML/flat-file не принимаются).

The JSON listings feed structure (current standard; XML/flat-file deprecated).

---

## 1. Верхний уровень / Top level

```jsonc
{
  "header": {                    // метаданные фида
    "sellerId": "AXXXXXXXXXXXXX",
    "version": "2.0",
    "issueLocale": "en_US"       // язык сообщений об ошибках
  },
  "messages": [ /* ... */ ]       // массив сообщений
}
```

---

## 2. Сообщения (message types) / Messages

| `messageType` | Назначение |
|---|---|
| `Product` | Создать/обновить/удалить catalog item (атрибуты) |
| `Relationship` | Связи parent/child (вариации) |
| `Price` | Цены |
| `Inventory` | Остатки |
| `Image` | Изображения |

Каждое сообщение: `messageId` (int), `messageType`, `operationType`, `sku` (+ специфичные поля).

`operationType`: `UPDATE` · `PATCH` · `DELETE`.

---

## 3. Product / Товар

```jsonc
{
  "messageId": 1,
  "messageType": "Product",
  "operationType": "UPDATE",     // UPDATE | PATCH | DELETE
  "productType": "CELLULAR_PHONE_CASE",
  "requirements": "LISTING",      // LISTING | LISTING_PRODUCT_ONLY | LISTING_OFFER_ONLY
  "attributes": {                 // snake_case, по схеме PTD
    "item_name": [{ "value": "MOBILIUS ...", "language_tag": "en_US", "marketplace_id": "ATVPDKIKX0DER" }],
    "bullet_point": [{ "value": "...", "language_tag": "en_US", "marketplace_id": "ATVPDKIKX0DER" }],
    "brand": [{ "value": "MOBILIUS" }],
    "list_price": [{ "currency": "USD", "value": 29.99, "marketplace_id": "ATVPDKIKX0DER" }],
    "size": [{ "value": "iPhone 15 Pro Max" }],
    "color": [{ "value": "Japanese Asian Art" }]
    // … остальные атрибуты PTD
  },
  "sku": "215-Japanese-Asian-Art"
}
```

**`requirements`**: `LISTING` (всё), `LISTING_PRODUCT_ONLY` (только каталог, без offer), `LISTING_OFFER_ONLY` (только offer — цена/остатки).

**Атрибуты** = имя поля (snake_case, из PTD) → массив значений; каждое значение имеет `value`, опционально `language_tag`, `marketplace_id`, `currency`, `unit`.

---

## 4. Price / Цена

```jsonc
{
  "messageId": 3,
  "messageType": "Price",
  "operationType": "UPDATE",
  "sku": "215-Japanese-Asian-Art",
  "price": { "currency": "USD", "value": 24.99 },          // Your Price
  "sale_price": { "currency": "USD", "value": 19.99 },      // акционная (со schedule)
  "list_price": { "currency": "USD", "value": 29.99 },      // List Price
  "minimum_advertised_price": { "currency": "USD", "value": 24.99 }, // MAP
  "minimum_price": { "currency": "USD", "value": 15.00 },   // нижняя граница
  "maximum_price": { "currency": "USD", "value": 40.00 },   // верхняя граница
  "business_price": { "currency": "USD", "value": 22.99 },  // B2B
  "marketplace_id": "ATVPDKIKX0DER"
}
```

Полный разбор типов цен и правила градаций — в `02-pricing`.

---

## 5. Inventory / Остатки

```jsonc
{
  "messageId": 4,
  "messageType": "Inventory",
  "operationType": "UPDATE",
  "sku": "215-Japanese-Asian-Art",
  "fulfillmentAvailability": [
    {
      "fulfillmentChannelCode": "DEFAULT",   // DEFAULT = FBM; AMAZON_NA = FBA
      "quantity": 100
    }
  ],
  "marketplace_id": "ATVPDKIKX0DER"
}
```

---

## 6. Relationship / Связи (вариации)

```jsonc
{
  "messageId": 2,
  "messageType": "Relationship",
  "operationType": "UPDATE",
  "sku": "215-Japanese-Asian-Art",      // child SKU
  "relationshipType": "VARIATION",
  "parent_sku": "215-Japanese-Asian-Art", // parent (для child) ИЛИ child_skus для parent
  "variation_theme": {
    "name": "COLOR/SIZE",
    "attributes": ["COLOR", "SIZE"]
  },
  "marketplace_id": "ATVPDKIKX0DER"
}
```

Правила сборки parent/child и ошибка `8032` — в `08-variations` и `02-feed-error-catalog`.

---

## 7. Image / Изображения

```jsonc
{
  "messageId": 5,
  "messageType": "Image",
  "operationType": "UPDATE",
  "sku": "215-Japanese-Asian-Art",
  "images": [
    { "imageType": "MAIN",   "url": "https://.../main.jpg", "marketplace_id": "ATVPDKIKX0DER" },
    { "imageType": "PT1",    "url": "https://.../infographic.jpg" },
    { "imageType": "SWATCH", "url": "https://.../swatch.jpg" }
  ]
}
```

Требования к картинкам — в `09-design` (MAIN: белый фон RGB 255,255,255, ≥85% кадра, без текста).

---

## 8. Отражение в API / API mapping

Тот же контент через **Listings Items API** (`putListingsItem` / `patchListingsItem` / `deleteListingsItem`): параметры `marketplaceIds`, `mode=VALIDATION_PREVIEW` (dry-run), `includedData`. Разбор операций — в `01-listings`.

---

## 9. Примечания / Notes

- `issueLocale` — язык сообщений об ошибках (напр. `en_US`, `de_DE`, `fr_FR`).
- `attributes` — строго по схеме **Product Type Definitions** (запросить через Product Type Definitions API).
- Tax code: US → `A_GEN_TAX`, EU → `A_GEN_Standard`, MENA → `A_GEN_TAX` `[unverified]`.
- Всегда dry-run (`VALIDATION_PREVIEW`) перед записью живого каталога.
