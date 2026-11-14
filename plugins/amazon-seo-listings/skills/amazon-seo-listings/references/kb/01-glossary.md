---
id: 01-glossary
title: { ru: "Глоссарий терминов Amazon", en: "Amazon terms glossary" }
block: 00-global
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [glossary, terms, ru, en]
updated: 2026-11-14
---

# Глоссарий / Glossary

Термины в оригинале (EN) + русский перевод + краткое определение на обоих языках.
Terms in original (EN) + Russian translation + short definition in both languages.

---

## Общее / General

**ASIN — Amazon Standard Identification Number**
- RU: 10-символьный идентификатор товара на Amazon (обычно `B0XXXXXXXX`).
- EN: Amazon's 10-character product identifier (usually `B0XXXXXXXX`).

**SKU — Stock Keeping Unit**
- RU: Внутренний артикул продавца (уникальный в рамках аккаунта).
- EN: Seller's internal stock unit (unique per account).

**GTIN — Global Trade Item Number** (UPC / EAN / ISBN)
- RU: Глобальный штрихкод товара: UPC (12 цифр, США), EAN (13 цифр, EU/MENA).
- EN: Global barcode: UPC (12 digits, US), EAN (13 digits, EU/MENA).

**FNSKU — Fulfillment Network SKU**
- RU: Штрихкод Amazon для товара на FBA (начинается с `X0...`).
- EN: Amazon's FBA barcode (starts with `X0...`).

**Marketplace / marketplaceId**
- RU: Площадка Amazon; `marketplaceId` — её код в SP-API (см. `00-markets.md`).
- EN: Amazon storefront; `marketplaceId` is its SP-API code (see `00-markets.md`).

**Seller Central / Vendor Central**
- RU: Seller Central — кабинет стороннего продавца (3P); Vendor Central — для вендоров (1P, Amazon покупает оптом).
- EN: Seller Central = third-party seller (3P); Vendor Central = vendor (1P, Amazon buys wholesale).

**Offer / Listing**
- RU: Offer — предложение товара по цене/наличию; Listing — карточка товара (каталог).
- EN: Offer = price/stock proposal; Listing = product detail page (catalog).

---

## Листинг / Listing

**item_name (Title)**
- RU: Заголовок товара. RU: лимит ~200 символов (зависит от категории).
- EN: Product title; ~200 chars (category-dependent).

**bullet points / Key Product Features**
- RU: 5 маркированных пунктов-преимуществ под ценой.
- EN: 5 bullet points under the price.

**product_description**
- RU: Длинное описание внизу карточки (не индексируется так же сильно, как title/bullets).
- EN: Long description at the bottom (less indexed than title/bullets).

**generic_keywords / backend search terms**
- RU: Скрытые поисковые термины (backend). Лимит ~250 байт.
- EN: Hidden backend search terms; ~250-byte limit.

**product type / Product Type Definitions (PTD)**
- RU: Тип товара (напр. `CELLULAR_PHONE_CASE`), задаёт схему обязательных атрибутов в фиде.
- EN: Product type (e.g. `CELLULAR_PHONE_CASE`) defining required attributes in a feed.

**parentage (parent / child)**
- RU: parent — общая карточка вариаций; child — отдельный вариант (ASIN). `parentage_level=parent|child`.
- EN: parent = variation umbrella; child = individual variant (ASIN). `parentage_level=parent|child`.

**variation theme**
- RU: Тема вариаций (напр. `COLOR/SIZE`, `SIZE/COLOR`) — по каким атрибутам отличаются child'ы.
- EN: Variation theme (e.g. `COLOR/SIZE`) — which attributes distinguish children.

**condition**
- RU: Состояние товара: `New`, `Used`, `Refurbished`, `Collectible`.
- EN: Item condition: `New`, `Used`, `Refurbished`, `Collectible`.

**browse node**
- RU: Узел категорийного дерева Amazon (категория товара).
- EN: Amazon category tree node.

---

## Цены / Pricing

**Buy Box / Featured Offer**
- RU: «Купить сейчас» — окно покупки. Выигрывает offer с лучшей комбинацией цена+логистика+метрики.
- EN: The "Buy Now" box. Won by the offer with best price+fulfillment+metrics combo.

**List Price**
- RU: Рекомендованная/прейскурантная цена (обычно зачёркнута). Должна быть валидной — см. правила strike-through.
- EN: Recommended/list price (usually struck through). Must be valid — see strike-through rules.

**Sale Price / Your Price**
- RU: Sale Price — акционная цена (показывает скидку от List/Was). Your Price — обычная цена продажи.
- EN: Sale Price = promo price (shows discount); Your Price = normal selling price.

**UVP / Reference Price / Was Price**
- RU: «Рекомендованная розничная цена» / база для показа зачёркнутой цены и «Вы экономите X%».
- EN: Reference price shown as struck-through baseline for "You save X%".

**MAP — Minimum Advertised Price**
- RU: Минимальная рекламируемая цена (ограничение бренда; ниже — нельзя показывать публично).
- EN: Brand-enforced minimum advertised price (can't show lower publicly).

**Minimum / Maximum price**
- RU: Границы допустимой цены offer (в API/фиде), защита от ошибок репрайсинга.
- EN: Allowed price bounds for an offer (API/feed), repricing guardrails.

**Business Price / B2B**
- RU: Цена для бизнес-покупателей (Amazon Business).
- EN: Price for business customers (Amazon Business).

**quantity price schedule / tiered pricing**
- RU: Цена за количество (градации «2 шт = скидка»).
- EN: Quantity-based price tiers (e.g. "2-pack discount").

**strike-through pricing**
- RU: Правила показа зачёркнутой цены (было/стало). Жёстко регулируется Amazon.
- EN: Rules for showing struck-through prices. Strictly regulated.

**Dealer Price**
- RU: Оптовая/дилерская цена в некоторых категориях.
- EN: Wholesale/dealer price in some categories.

---

## SEO

**A9**
- RU: Поисковый алгоритм Amazon (релевантность: индексация, CTR, конверсия, продажи).
- EN: Amazon's search algorithm (relevance: indexation, CTR, conversion, sales).

**COSMO**
- RU: Семантический слой Amazon (понимание намерений покупателя, связи понятий).
- EN: Amazon's semantic layer (shopper intent, concept relations).

**Rufus**
- RU: Покуп-ассистент Amazon (генеративный AI-поиск); учитывает атрибуты и вопрос-ответ.
- EN: Amazon's AI shopping assistant (generative search); uses attributes and Q&A.

**indexation / indexed keywords**
- RU: По каким ключам карточка реально находится в поиске. Неиндексированный ключ = невидимость.
- EN: Which queries the listing actually ranks for. Unindexed = invisible.

**organic rank / keyword rank**
- RU: Позиция товара по ключу в органической выдаче.
- EN: Position of the item for a keyword in organic results.

**search volume**
- RU: Сколько раз в месяц ищут ключ (оценка через Helium 10 / Brand Analytics).
- EN: Monthly query count (estimated via Helium 10 / Brand Analytics).

**long-tail keyword**
- RU: Длинный низкочастотный, но высоко-конверсионный запрос.
- EN: Long, low-volume but high-conversion query.

---

## PPC / Реклама / Advertising

**SP — Sponsored Products**
- RU: Реклама товаров в выдаче/на карточках (CPC).
- EN: Product ads in search/detail pages (CPC).

**SB — Sponsored Brands**
- RU: Брендовая реклама (логотип + товары) вверху выдачи.
- EN: Brand ad (logo + products) at top of search.

**SBV — Sponsored Brands Video**
- RU: Видео-формат Sponsored Brands.
- EN: Video format of Sponsored Brands.

**SD — Sponsored Display**
- RU: Медийная/ретаргетинговая реклама (аудитории, таргетинг по товарам).
- EN: Display/retargeting ads (audiences, product targeting).

**CPC / CPM / vCPM**
- RU: CPC — плата за клик; CPM — за 1000 показов; vCPM — за 1000 видимых показов.
- EN: CPC = per click; CPM = per 1000 impressions; vCPM = per 1000 viewable impressions.

**bid / bid adjustment**
- RU: Ставка за клик; adjustment — надбавка за размещение (top of search, product page).
- EN: Max price per click; adjustment = placement multiplier.

**budget**
- RU: Дневной бюджет кампании.
- EN: Daily campaign budget.

**match type (broad / phrase / exact)**
- RU: Тип соответствия ключа: широкое / фразовое / точное.
- EN: Keyword match type: broad / phrase / exact.

**negative keywords (negative exact / phrase)**
- RU: Минус-слова, исключающие нерелевантные запросы.
- EN: Negative keywords excluding irrelevant queries.

**ACoS / TACoS / ROAS**
- RU: ACoS = реклама/продажи (%). TACoS = реклама/общий оборот (%). ROAS = продажи/реклама.
- EN: ACoS = ad spend/sales (%). TACoS = ad spend/total revenue (%). ROAS = sales/ad spend.

**CTR / CVR**
- RU: CTR = клики/показы. CVR = заказы/клики.
- EN: CTR = clicks/impressions. CVR = orders/clicks.

**search term report (STR)**
- RU: Отчёт по реальным поисковым запросам, которые привели к кликам/продажам.
- EN: Report of actual queries that triggered clicks/sales.

**targeting (auto / manual; product / audience)**
- RU: Авто (Amazon сам подбирает) / ручное; таргетинг по товарам или аудиториям (SD).
- EN: Auto vs manual; product targeting vs audience targeting (SD).

**dayparting**
- RU: Расписание показа/ставок по часам и дням.
- EN: Scheduling bids/ads by hour and day.

**campaign / ad group / portfolio**
- RU: Кампания → группы объявлений → объявления. Portfolio — набор кампаний с общим бюджетом.
- EN: Campaign → ad groups → ads. Portfolio = campaigns sharing a budget.

---

## Feeds

**feed / feed type**
- RU: Пакет данных для массового обновления каталога. Тип — `JSON_LISTINGS_FEED` и др.
- EN: Bulk catalog-update payload. Type e.g. `JSON_LISTINGS_FEED`.

**JSON_LISTINGS_FEED**
- RU: JSON-фид листингов (текущий стандарт; XML/flat-file Amazon больше не принимает).
- EN: JSON listings feed (current standard; XML/flat-file deprecated).

**flat file**
- RU: Устаревший табличный формат фида (не принимать для новых).
- EN: Deprecated tabular feed format.

**feed processing report**
- RU: Отчёт о результатах обработки фида (успехи, warnings, ошибки).
- EN: Feed result report (successes, warnings, errors).

**error code**
- RU: Код ошибки фида (напр. `8032` — child уже привязан к parent, `8541` — конфликт значений).
- EN: Feed error code (e.g. `8032` — child already linked, `8541` — value conflict).

**Product Type Definitions (PTD)**
- RU: Схема атрибутов для типа товара (обязательные/опциональные поля фида).
- EN: Attribute schema per product type (required/optional feed fields).

**submission / batch**
- RU: Отправка фида; batch — порция записей в одном фиде.
- EN: Feed submission; batch = set of records in one feed.

---

## Промо / Promotions

**coupon**
- RU: Зелёный бейдж скидки на карточке (процент или сумма).
- EN: Green discount badge on the listing (percentage or amount).

**Lightning Deal / Best Deal / 7-day Deal**
- RU: Виды Deal: Lightning (несколько часов), Best Deal / 7-day Deal (неделя).
- EN: Deal types: Lightning (hours), Best/7-day Deal (a week).

**voucher**
- RU: Ваучер — скидка через promo-код/купоны (ограничения и правила).
- EN: Voucher — discount via promo code.

**Prime Exclusive Discount**
- RU: Скидка только для Prime-подписчиков.
- EN: Discount visible only to Prime members.

**Subscribe & Save (S&S)**
- RU: Подписка на регулярную покупку со скидкой (для расходных товаров).
- EN: Recurring-delivery subscription with discount (consumables).

**Vine**
- RU: Программа ранних отзывов от доверенных ревьюеров (платная, по уровням).
- EN: Early reviews from trusted reviewers (paid, tiered).

**Brand Tailored Promotion**
- RU: Целевые промо для сегментов аудитории бренда (повторные покупатели, подписчики и т.д.).
- EN: Targeted promos for brand audience segments.

---

## Дизайн / Design

**main image**
- RU: Главное фото — чисто-белый фон, товар ≥85% кадра, без текста/водяных знаков.
- EN: Main image — pure white background, product ≥85% of frame, no text/watermark.

**gallery / carousel**
- RU: Галерея фото (MAIN + 2–7 дополнительных).
- EN: Image gallery (MAIN + 2–7 additional).

**infographic / lifestyle image**
- RU: Инфографика (текст+иконки на фото) / сцена использования.
- EN: Infographic (text+icons) / in-use scene.

**A+ Content (basic / premium)**
- RU: Модульный контент под bullets (базовый — всем брендам, премиум — с видео/интерактивом).
- EN: Modular content below bullets (basic for all brands, premium adds video/interactive).

**Brand Story**
- RU: Карусель о бренде, показывается на всех карточках бренда.
- EN: Brand carousel shown across the brand's listings.

**Brand Store**
- RU: Многостраничный витринный магазин бренда (amazon.com/название).
- EN: Multi-page branded storefront.

---

## Логистика / Logistics

**FBA — Fulfillment by Amazon**
- RU: Amazon хранит, пакует, доставляет и обслуживает возвраты.
- EN: Amazon stores, packs, ships, and handles returns.

**FBM — Fulfillment by Merchant**
- RU: Продавец сам хранит и доставляет.
- EN: Seller fulfills orders themselves.

**SFP — Seller Fulfilled Prime**
- RU: Prime-доставка силами продавца (свой склад + Prime-стандарты).
- EN: Prime shipping by the seller (own warehouse + Prime standards).

**LTL — Less Than Truckload**
- RU: Доставка груза «не полный фура» (паллеты).
- EN: Palletized freight (not a full truck).

**SPD — Small Parcel Delivery**
- RU: Доставка малыми посылками (коробки).
- EN: Small-parcel (box) delivery.

**AWD — Amazon Warehousing & Distribution**
- RU: Оптовый склад Amazon для пополнения FBA-складов.
- EN: Amazon bulk-warehousing to replenish FBA.

**IPI — Inventory Performance Index**
- RU: Метрика здоровья запасов (влияет на лимиты хранения).
- EN: Inventory health score (affects storage limits).

**stranded inventory**
- RU: Товар на складе без активного листинга (не продаётся, копится плата).
- EN: Warehouse stock without an active listing (unsellable, accrues fees).

**removal order**
- RU: Заказ на вывод/утилизацию товара со склада.
- EN: Order to remove/dispose of warehouse stock.

---

## Аккаунт / Account

**Account Health / AHR**
- RU: Рейтинг здоровья аккаунта (нарушения, метрики; красный/жёлтый/зелёный).
- EN: Account Health Rating (violations, metrics; red/yellow/green).

**ODR — Order Defect Rate**
- RU: Доля дефектных заказов (A-to-Z, негатив, возвраты) — ключевая метрика.
- EN: Defective-order ratio (A-to-Z, negative, returns) — key metric.

**policy violation**
- RU: Нарушение правил Amazon (на карточке/аккаунте).
- EN: Amazon policy breach (listing/account).

**Plan of Action (POA)**
- RU: План исправления нарушений для восстановления аккаунта/листинга.
- EN: Remediation plan to reinstate account/listing.

**Brand Registry**
- RU: Регистрация бренда (требует товарный знак) — доступ к A+, Brand Store, инструментам защиты.
- EN: Brand enrollment (trademark required) — unlocks A+, Store, brand protection.

**ungating / category approval**
- RU: Разблокировка ограниченной категории/бренда (инвойсы, документы).
- EN: Approval to sell a restricted category/brand.

**VAT / OSS / IOSS**
- RU: VAT — НДС; OSS — единый режим по EU; IOSS — импортный режим для посылок ≤150 EUR.
- EN: VAT; OSS = one-stop EU scheme; IOSS = import scheme for ≤€150 parcels.

**EPR — Extended Producer Responsibility**
- RU: Расширенная ответственность производителя (упаковка, WEEE, батарейки) — обязательна в DE/FR.
- EN: Extended producer responsibility (packaging, WEEE, batteries) — mandatory in DE/FR.
