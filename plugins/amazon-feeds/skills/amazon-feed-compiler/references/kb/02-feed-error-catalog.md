---
id: 02-feed-error-catalog
title: { ru: "Полный справочник ошибок фидов", en: "Full feed error catalog" }
block: 05-feeds
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [feeds, error-code, catalog, 5461, 5665, 8026, 8058, 8541, 8542, 8560, 8572, 8573, 8032, 8105, 90220, 90009, 18027, 18155, 99300, 18742, 18299, 13013, 100730, 5561, 20000, 300060]
updated: 2026-11-14
sources:
  - { url: "https://github.com/business2business17-ui/Agents/blob/main/dist/amazon-feeds/knowledge/amazon-feed-error-agent/assets/error_kb.json", kind: own, note: "свой каталог ошибок (часть подтверждена реальными репортами US 2026-10)" }
  - { url: "https://github.com/business2business17-ui/FEED-Errors", kind: own, note: "методичка агента разбора ошибок фидов" }
  - { url: "https://github.com/amzn/selling-partner-api-models/blob/main/models/listings-items-api-model/listingsItems_2021-08-01.json", kind: official, note: "issue codes из Listings Items API" }
---

# Полный справочник ошибок фидов / Full feed error catalog

Единый каталог кодов ошибок Amazon Feeds. Объединяет твой `error_kb.json` (19 кодов, часть `VERIFIED_BY_SUCCESSFUL_REUPLOAD` / `SEEDED_FROM_REAL_REPORT_US_2026-10`), методичку `FEED-Errors` и официальные issue codes из Listings Items API.

Merged catalog of Amazon feed error codes: your `error_kb.json` (19 codes, some verified by real reports), the `FEED-Errors` methodology, and official Listings Items API issue codes.

---

## 1. Как читать ошибку / How to read an error

**Один код ≠ одна причина.** Ключ разбора = `код + message + атрибут + marketplace + версия шаблона`.

A code alone is never enough. Key = `code + message + attribute + marketplace + template version`.

Порядок исследования (методичка `FEED-Errors`):
1. `Feed Processing Summary` → `Error code`, `Category`, `Affected field`, `Error message`.
2. `Template` → найти строку/ячейку/колонку.
3. `Data Definitions` → `Valid Values` → `Instructions`.
4. Сопоставить `Merchant value` vs `Amazon value` (для catalog-конфликтов).

---

## 2. Сводная таблица / Summary table

| Код | Тип | Severity | Auto-fix | Смысл (RU) |
|---|---|---|---|---|
| `5461` | BRAND_APPROVAL | BLOCKING | нет | Новый ASIN для бренда запрещён |
| `5665` | BRAND_APPROVAL | BLOCKING | нет | Brand name не одобрен |
| `8026` | CATEGORY_APPROVAL | BLOCKING | нет | Нет права на категорию/product line |
| `18299` | BRAND_APPROVAL | BLOCKING | нет | Нет одобрения на бренд |
| `8541` | CATALOG/ASIN_CONFLICT | BLOCKING | нет | GTIN совпал, но атрибуты конфликтуют (single match) |
| `8542` | ASIN_CONFLICT | BLOCKING | нет | GTIN → несколько ASIN, неоднозначно (multiple match) |
| `8560` | MULTI-CAUSE | BLOCKING | частично | Невалидные данные / нет обязательных полей / Product ID ≠ ASIN |
| `8572` | INVALID_GTIN | BLOCKING | **строго нет** | GTIN не соответствует товару |
| `8573` | ASIN_MATCH | BLOCKING | нет | Товар возможно уже существует |
| `8032` | PARENT_CHILD | ERROR | нет | Child уже привязан к другому parent |
| `8058` | MISSING_REQUIRED/INVALID_VALUE | ERROR | условно | Обязательное поле пусто/недопустимо |
| `8105` | INVALID_ENUM | ERROR | условно | Недопустимое значение атрибута |
| `90220` | MISSING_ATTRIBUTE | ERROR | условно | Обязательный атрибут не передан (напр. `size`) |
| `90009` | INVALID_ATTRIBUTE | ERROR | условно | Неизвестный/невалидный атрибут |
| `99001` | TEMPLATE_STRUCTURE | ERROR | нет | Нет обязательных колонок / битые значения |
| `13013` | OFFER_WITHOUT_CATALOG_ITEM | ERROR | нет | Offer без catalog item (следствие другой ошибки) |
| `100730` | DUPLICATE_IN_PROCESSING | ERROR | нет | Идентичный листинг уже обрабатывается |
| `20000` | MEDIA_URL_TIMEOUT | ERROR | нет | Не скачалось изображение/видео (таймаут) |
| `300060` | MEDIA_URL_INACCESSIBLE | ERROR | нет | URL медиа недоступен |
| `5561` | TRADEMARK_IN_TEXT | ERROR | нет | Торговая марка в текстовом атрибуте |
| `18027` | INVALID_IMAGE | ERROR | условно | Текст/лого/водяной знак на главном фото |
| `18155` | INVALID_PRICE | ERROR | условно | `minimum_price` > selling price |
| `99300` | PDP_RULES | ERROR | нет | Нарушение правил Product Detail Page |
| `18742` | RESTRICTED_PRODUCT | ERROR | нет | Restricted Products Policy |
| `6024` / `90202` | RESTRICTION | BLOCKING | нет | Товар/бренд ограничен |
| `4400` | APPROVAL | BLOCKING | нет | Товар требует review |

---

## 3. Детально: blocking-ошибки / Blocking errors (подробно)

### `5461` — New ASIN creation restricted for brand
- **Причина:** нет права создавать новый ASIN для бренда.
- **Решение:** если ASIN уже есть → привязать offer; если нужен новый → подать заявку; писать бренд точно как одобрено Amazon.
- **Auto-fix:** НЕТ.

### `5665` — Brand name not approved
- **Причина:** Amazon не разрешил использовать бренд.
- **Диагностика:** spelling, пробелы, регистр, approval, соответствие фото упаковки бренду.
- **Решение:** запросить approval или использовать точное одобренное написание.

### `18299` — Brand approval required
- **Причина:** аккаунт не одобрен для листинга в этом бренде.
- **Решение:** подать на approval / привязать к существующему ASIN / убрать SKU из загрузки до одобрения.

### `8026` — Not authorised for category/product line
- **Решение:** запросить категорийное approval. Feed-правкой обычно не решается.

### `8541` — Single matching error (catalog conflict)
- **Причина:** GTIN совпал с существующим ASIN, но `brand/title/color/size/package quantity/model` конфликтуют с каталогом.
- **Диагностика:** сравнить `Merchant value` vs `Amazon value`; подтвердить, что физический товар = этот ASIN.
- **Решение:** ASIN верен → catalog-compatible значения; товар другой → проверить GTIN; каталог неверен → **catalog correction, не фальсифицировать данные**.

### `8542` — Multiple matching error
- **Причина:** Product ID → несколько ASIN, атрибуты не дают однозначного выбора.
- **Решение:** подтвердить правильный ASIN; при неверном каталоге — эскалация.

### `8560` — Invalid data / missing required / Product ID ≠ ASIN (multi-cause)
- **НЕЛЬЗЯ трактовать по одному коду.** Причины: невалидный Product ID, неверная длина/формат UPC/EAN/ISBN, нет обязательных полей, неверный product type, Product ID ≠ ASIN, не хватает полей для нового ASIN.
- **Решение:** разобрать полный message.

### `8572` — GTIN does not match product
- **Решение:** использовать корректный GS1 GTIN или дать Amazon подтверждающую документацию. **Auto-fix строго НЕТ.**

### `8573` — Potential matching products found
- **Решение:** найти существующий ASIN → использовать существующий листинг; если товара нет → действовать по тексту ошибки.

### `6024` / `90202` / `4400` — Restricted / requires review
- **Решение:** проверить eligibility → запросить approval. Feed-only fix обычно нет.

---

## 4. Детально: variation / parent-child / 8032

### `8032` — Child SKU already assigned to another parent
- **Причина:** child уже привязан к parent; Amazon не даёт привязать к новому, пока жив старый parent.
- **Порядок исправления** (подтверждено реальной раскаткой MOBILIUS, 2026-11-13):
  1. Удалить старые **parents** (только parents — **child SKU удалять ЗАПРЕЩЕНО**).
  2. **Подождать ≥ 30 мин**.
  3. Создать новый parent.
  4. Привязать children.
  5. Проверить (`BUYABLE`/`DISCOVERABLE`, нет 8032).

---

## 5. Детально: медиа-ошибки / Media errors

### `20000` — Media download timeout
- **Причина:** Amazon не скачал image/video URL за время (медленный/перегруженный хост или неверный URL).
- **Диагностика:** открыть URL в браузере; тот же домен раньше работал? → временно медленный сервер; сравнить репорты (одинаковые URL падают снова или каждый раз разные).
- **Решение:** URL открывается → подождать 15–20 мин и перезалить только затронутые SKU (partial update); не открывается → починить URL или залить медиа на надёжный хостинг.

### `300060` — Media not accessible
- **Причина:** URL не существует, файрвол блокирует Amazon, хост нестабилен.
- **Решение:** починить URL/восстановить файл, разрешить Amazon-серверы на хосте, переехать на надёжный хостинг.

---

## 6. Детально: прочие / Other

### `5561` — Trademarked term in text attribute
- **Причина:** в текстовом атрибуте (напр. `generic_keyword`) торговая марка (в `[скобках]` в message).
- **Решение:** убрать термин из атрибута (proposed value считает `parse_processing_report.py`, нужен approval); не заменять другой ТМ.

### `100730` — Identical listing already being processed
- **Причина:** тот же фид залит дважды, пока первый не завершился.
- **Решение:** НЕ перезаливать; дождаться завершения первого (≥20 мин).

### `13013` — Offer cannot be added: product not in catalog
- **Причина:** catalog item ещё не создан (следствие другой ошибки: 100730/18299/5461/8541/8542…).
- **Решение:** чинить первопричину; если SKU удаляли — перезалить с исходным UPC/GTIN; cross-marketplace — подождать появления товара.

### `18027` — text/logo/watermark on main image
- **Решение:** заменить главное фото (белый фон, без текста). → `SEARCH_SUPPRESSED`.

### `18155` — minimum_price > selling price
- **Решение:** исправить границы цены (см. `02-pricing`). → `LISTING_SUPPRESSED`.

### `99300` — PDP rules violation
- **Решение:** исправить недостоверную информацию на PDP.

### `18742` — Restricted Products Policy
- **Решение:** проверить соответствие товара политике.

---

## 7. Паттерны без кода / Patterns without a code

| Паттерн | Что проверять |
|---|---|
| Invalid enum | `Valid Values`, dropdown, marketplace, точное написание, регистр |
| Missing required attribute | `Data Definitions`, условные требования, product type, зависимые атрибуты |
| Invalid image URL | синтаксис URL, HTTP/HTTPS, доступность, тип, main vs additional, дубли, запрещённые символы |
| Parent/child variation conflict | `parentage`, `parent_sku`, `relationship_type`, `variation_theme`, согласованность child |
| Invalid unit | `value` + `unit` как единая пара |
| Catalog value conflict | не принимать Amazon value автоматически без подтверждения физического товара |
| Duplicate SKU/identifier | повторная строка? повторный offer? неверный GTIN? попытка создать 2-й ASIN? |

---

## 8. Защищённые поля (не менять без отдельного подтверждения) / Protected fields

`SKU`, `EAN/UPC/GTIN/ISBN`, `ASIN`, `Brand`, `Manufacturer`, `Product Type`, `Parent SKU`, `Child SKU`, `Variation Theme`, `Country of Origin`, battery/dangerous-goods, `Package Quantity`, `Unit Count`. **Не выдумывать идентификаторы.**

---

## 9. Ключевой принцип / Core principle

`Error Code + Message + Attribute + Marketplace + Template Version` — вместе, никогда по одному коду. Методика полного цикла разбора (INTAKE→…→RE-ANALYZE) — в `business2business17-ui/FEED-Errors`.
