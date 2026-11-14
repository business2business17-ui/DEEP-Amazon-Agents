---
id: 05-feeds
title: { ru: "Feeds: форматы, заполнение, ошибки", en: "Feeds: formats, filling, errors" }
block: 05-feeds
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [feeds, json-listings-feed, feed-types, feed-api, error-code, 8032, 8541, tax-code, product-type-definitions]
updated: 2026-11-14
sources:
  - { url: "https://developer-docs.amazon.com/sp-api/docs/feeds-api-v2021-06-30-reference", kind: official, note: "Feeds API" }
  - { url: "https://github.com/business2business17-ui/FEED-Errors", kind: own, note: "свой агент по ошибкам фидов" }
---

# Feeds: форматы, заполнение, ошибки / Feeds: formats, filling, errors

Как массово загружать данные каталога (листинги, цены, остатки, связи, фото), какие форматы актуальны и как решать ошибки.

How to bulk-upload catalog data (listings, prices, stock, relationships, images), which formats are current, and how to resolve errors.

---

## 1. Ключевой факт / Key fact

Amazon **больше не принимает flat-file (Excel) и XML-фиды** для новых листингов. Актуальный стандарт — **`JSON_LISTINGS_FEED`** (JSON).

> Amazon no longer accepts flat-file/XML feeds for new listings. The current standard is **`JSON_LISTINGS_FEED`** (JSON).

---

## 2. Типы фидов / Feed types

| Feed type | Назначение |
|---|---|
| `JSON_LISTINGS_FEED` | Листинги (основной: товары, цены, остатки, связи, фото) |
| `POST_PRODUCT_DATA` | Устаревший XML (товары) — не для новых |
| `POST_INVENTORY_AVAILABILITY_DATA` | Устаревший (остатки) |
| `POST_PRODUCT_PRICING_DATA` | Устаревший (цены) |
| `POST_PRODUCT_IMAGE_DATA` | Устаревший (фото) |

---

## 3. Пайплайн Feeds API / Feeds API pipeline

1. **`createFeedDocument`** — получить URL для загрузки JSON (S3 pre-signed).
2. **Загрузить** JSON-документ по URL.
3. **`createFeed`** — создать фид, указав `feedType` и `feedDocumentId`.
4. **`getFeed`** — статус (`IN_QUEUE` → `IN_PROGRESS` → `DONE`/`CANCELLED`).
5. **`getFeedDocument`** — скачать **отчёт об обработке** (результат, ошибки).

---

## 4. Структура `JSON_LISTINGS_FEED` / Structure

```jsonc
{
  "header": {
    "sellerId": "AXXXXXXXXXXXXX",
    "version": "2.0",
    "issueLocale": "en_US"
  },
  "messages": [
    // Типы сообщений:
    { "messageId": 1, "messageType": "Product", ... },       // товар (PUT/PATCH/DELETE)
    { "messageId": 2, "messageType": "Relationship", ... },  // parent/child
    { "messageId": 3, "messageType": "Price", ... },         // цена
    { "messageId": 4, "messageType": "Inventory", ... },     // остатки
    { "messageId": 5, "messageType": "Image", ... }          // фото
  ]
}
```

Каждый `Product` содержит `sku`, `operationType` (`UPDATE`/`DELETE`/`PATCH`), `productType`, `requirements` (`LISTING`/`LISTING_PRODUCT_ONLY`/`LISTING_OFFER_ONLY`), `attributes` (snake_case, по PTD).

---

## 5. Заполнение: обязательные правила / Filling rules

- **Brand** — проставляется на **все SKU** (в т.ч. child).
- **Tax code**:
  - **US** → `A_GEN_TAX`
  - **EU** → `A_GEN_Standard`
  - **MENA (AE/SA)** → `A_GEN_TAX` `[unverified]`
- **Product Type** — по схеме PTD (обязательные атрибуты обязательны).
- **Цены** — см. `02-pricing` (градации, Min/Max, MAP).
- **Вариации** — см. `08-variations` (parent/child, тема, swatch).

---

## 6. Ошибки фидов и их решение / Feed errors & resolution

| Код | Описание | Решение |
|---|---|---|
| `8032` | «unable to assign a child SKU to more than one parent» — child уже привязан | удалить старый parent → подождать ≥30 мин → создать новый parent → привязать child |
| `8541` | Конфликт значений одного атрибута (SKU/ASIN mismatch) | привести значения к одному (проверить, что SKU соответствует ASIN) |
| `8105` | Недопустимое значение атрибута | исправить значение по PTD-схеме |
| `8560` | Отсутствует обязательное поле | добавить обязательный атрибут |
| `90220` | Обязательный атрибут не передан (напр. `size`) | заполнить атрибут |
| `90009` / `90000900` | Атрибуты невалидны (неизвестное поле) | убрать/исправить атрибут |
| `18027` | Текст/лого/водяной знак на главном фото | заменить фото (белый фон, без текста) |
| `18155` | `minimum_price` > `selling price` | исправить границы цены (см. `02-pricing`) |
| `99300` | Нарушение правил Product Detail Page | исправить недостоверную информацию |
| `18742` | Restricted Products Policy | проверить соответствие товара политике |
| `6039` / `6024` | Seller не одобрен для категории/действия | подать на разблокировку (ungating) |
| `8058` | SKU не существует для изменения | проверить SKU |

> Полный каталог и методика разбора — в своём репозитории `business2business17-ui/FEED-Errors` (промпт агента `amazon_feed_error_agent_prompt.md`).

---

## 7. Dry-run и предпросмотр / Dry-run & preview

- Listings Items API поддерживает `mode=VALIDATION_PREVIEW` (валидация без записи) — использовать перед `apply`.
- Фиды можно тестировать через `createFeed` с валидацией (см. `requirements`/`mode`).

> Always dry-run (`VALIDATION_PREVIEW`) before applying live changes.

---

## 8. Троттлинг / Throttling

- Feeds API и Listings Items API имеют лимиты (rate/burst). Следи за `x-amzn-RateLimit-Limit`.
- Массовые операции — батчами (несколько SKU в одном фиде), но в пределах лимитов.

---

## 9. Дельты по рынкам / Market deltas

| Рынок | Tax code | Язык issueLocale |
|---|---|---|
| US | `A_GEN_TAX` | en_US |
| UK/EU | `A_GEN_Standard` | локальный |
| AE/SA | `A_GEN_TAX` (verify) | en + ar |

---

## 10. Готовый пайплайн / Ready pipeline

В твоём репо `Agents` есть `shared/amazon/feed_pipeline.py`: dry run → патч → write guard → вердикт `PASS_TO_FULL_AUDIT` / `NOT_READY` (при провале файл не создаётся). Используй его для записи фида одной командой.
