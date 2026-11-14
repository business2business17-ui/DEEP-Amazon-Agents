---
id: 01-listings
title: { ru: "Листинги: структура и правила", en: "Listings: structure & rules" }
block: 01-listings
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [listing, title, item-name, bullets, description, backend-keywords, attributes, status, suppression, conditions, localization]
updated: 2026-11-14
sources:
  - { url: "https://github.com/amzn/selling-partner-api-models/blob/main/models/listings-items-api-model/listingsItems_2021-08-01.json", kind: official, note: "Listings Items API: операции, includedData, статусы, enforcement-действия" }
  - { url: "https://developer-docs.amazon.com/sp-api/docs/listings-items-api", kind: official, note: "Listings Items API" }
---

# Листинг: структура и правила / Listing: structure & rules

Как устроена карточка товара на Amazon, из каких полей состоит, какие правила и как это пишется через SP-API.

The anatomy of an Amazon product page: fields, rules, and how it's written via SP-API.

---

## 1. Что такое листинг / What a listing is

Листинг = **каталожный товар (catalog item)** + **offer (предложение)**.

- **Catalog item** — общие атрибуты (title, bullets, фото, атрибуты), одинаковые для всех продавцов на одном ASIN.
- **Offer** — специфика продавца: цена, количество, состояние, способ доставки.

> A listing = catalog item (shared attributes: title, bullets, images) + offer (seller-specific: price, quantity, condition, fulfillment).

---

## 2. Анатомия листинга / Listing anatomy

| Поле | Атрибут SP-API / фид | Назначение | Лимит (RU/EN) |
|---|---|---|---|
| Заголовок | `item_name` | Главное поле индексации | ~200 симв. (по категории) |
| Буллеты | `bullet_point` / Key Product Features | 5 преимуществ | ~250 симв. каждый |
| Описание | `product_description` | Длинное описание (HTML) | ~2000 симв. |
| Backend keywords | `generic_keywords` | Скрытые поисковые термины | 250 байт |
| Фото | `main_image` + gallery | Визуал | MAIN + 2–7 |
| Атрибуты | (PTD-схема) | Технические характеристики | по категории |
| Цена | `price` / offer | Цена продажи | см. `02-pricing` |
| Наличие | `fulfillmentAvailability` | Количество | — |

---

## 3. Заголовок (`item_name`) — правила / Title rules

### RU
- Формула: **Brand + Model + Ключевые атрибуты + Вариант** (цвет/размер/комплект).
- До ~200 символов (зависит от категории; некоторые — 150 и меньше).
- Каждое слово с заглавной буквы (кроме союзов/предлогов).
- Цифры арабскими (не «два», а «2»).
- **Нельзя:** цена, «free shipping», «best seller», «100%», промо-фразы, субъективные оценки, имя продавца, HTML, повторные слова.
- Локализуй под рынок: en_US (US), en_GB (UK), de_DE, fr_FR и т.д. — не дублируй en_US на EU.

### EN
- Formula: Brand + Model + key attributes + variant.
- ≤ ~200 chars (category-dependent).
- Title-case; arabic numerals.
- No price, no "free shipping"/"best seller"/"100%", no promo, no seller name, no HTML, no duplicates.
- Localize per market.

---

## 4. Буллеты (`bullet_point`) — правила / Bullets

- Ровно **5 пунктов**.
- Каждый начинается с **заглавной буквы**; описывай **выгоду**, не только характеристику.
- Держи в начале ключевые слова (индексируется сильнее).
- Нельзя: ссылки, контакты продавца, промо («купи 2 — скидка»), HTML.

---

## 5. Описание (`product_description`) — правила / Description

- До ~2000 символов, разрешён **базовый HTML** (`<b>`, `<br>`, `<ul>`).
- Нельзя: email, ссылки, имя продавца, промо.
- Индексируется слабее, чем title/bullets, но влияет на конверсию и полноту.

---

## 6. Backend keywords (`generic_keywords`) — правила / Backend

- До **250 байт** (US). Слова через пробел.
- **Нельзя:** бренды (свой и чужие), ASIN конкурентов, «new», «best seller», повтор слов из title/bullets (не дублируй), субъективные оценки.
- Пиши синонимы, аббревиатуры, варианты написания, опечатки — всё, чего нет в видимом тексте.

---

## 7. Атрибуты и Product Type Definitions / Attributes & PTD

- Каждый тип товара (`product_type`, напр. `CELLULAR_PHONE_CASE`) имеет **схему атрибутов** — обязательные и опциональные поля.
- Схема запрашивается через **Product Type Definitions API** (`getDefinitionsProductType`).
- Обязательные атрибуты (напр. `size`, `color`, `brand`) обязательны — без них листинг не пройдёт валидацию (ошибка `90220` «size is required»).

> Every product type has an attribute schema (required + optional), fetched via Product Type Definitions API. Missing required attributes → validation error (e.g. `90220`).

---

## 8. Статусы листинга / Listing statuses

| Статус | Значение |
|---|---|
| `BUYABLE` | Продаётся, активен |
| `DISCOVERABLE` | Виден в каталоге (может не быть в Buy Box) |
| suppressed | Подавлен — не в поиске |

**Enforcement-действия** (из API `issues`): `SEARCH_SUPPRESSED` (убрано из поиска), `LISTING_SUPPRESSED` (подавлен), `ATTRIBUTE_SUPPRESSED`, `CATALOG_ITEM_REMOVED` (удалён из каталога).

> Suppression types from API issues: `SEARCH_SUPPRESSED`, `LISTING_SUPPRESSED`, `ATTRIBUTE_SUPPRESSED`, `CATALOG_ITEM_REMOVED`.

Типичные причины подавления: битая цена (`18155`), текст на главном фото (`18027`), нарушение правил PDP (`99300`), restricted product (`18742`).

---

## 9. SP-API: операции / SP-API operations (Listings Items v2021-08-01)

| Операция | Назначение | Rate/Burst |
|---|---|---|
| `getListingsItem` | Прочитать листинг (по SKU) | 5 / 10 |
| `putListingsItem` | Создать/полностью перезаписать | 5 / 10 |
| `patchListingsItem` | Частично обновить (только top-level) | 5 / 5 |
| `deleteListingsItem` | Удалить | 5 / 5 |

Ключевые параметры:
- `marketplaceIds` — массив (для `put`/`delete` — максимум 1).
- `includedData` — что вернуть: `summaries`, `attributes`, `issues`, `offers`, `fulfillmentAvailability`, `procurement`, `relationships`, `productTypes`.
- `mode=VALIDATION_PREVIEW` — **dry-run** (валидация без записи): вернёт `status: VALID | INVALID` и `issues`.

> `mode=VALIDATION_PREVIEW` = dry-run: validates without persisting; returns `VALID | INVALID` + issues. Always dry-run before live changes.

---

## 10. Условия (condition) / Conditions

`New` · `Used` · `Collectible` · `Refurbished` · `Club`. В API: `conditionType` (`new_new`, …) или `ItemCondition`.

---

## 11. Локализация по рынкам / Localization by market

| Рынок | Язык листинга |
|---|---|
| US | en_US |
| UK | en_GB |
| DE / FR / IT / ES | de_DE / fr_FR / it_IT / es_ES |
| NL / SE / PL / BE / TR | nl_NL / sv_SE / pl_PL / nl_BE·fr_BE / tr_TR |
| AE / SA | en_AE·ar_AE / en_SA·ar_SA |

⚠️ На EU нельзя публиковать только en_US — нужен локальный язык (иначе подавление/плохое ранжирование).

---

## 12. Связь с вариациями / Link to variations

Parent/child, темы вариаций, `parentage_level` — отдельный блок `08-variations` (для чехлов MOBILIUS есть готовые правила в `S:\US AMAZON API\VARIATIONS_PHONE_CASES.md`).

---

## 13. Дельты по рынкам / Market deltas

- **US** — эталон (все правила выше).
- **EU** — локальный язык + EPR/соответствие; VAT в цене.
- **MENA (AE/SA)** — en + ar, отдельные требования (SA: SABER/ECAS) — см. `11-account`.
- **UK** — en_GB, UKCA вместо CE для ряда товаров.
