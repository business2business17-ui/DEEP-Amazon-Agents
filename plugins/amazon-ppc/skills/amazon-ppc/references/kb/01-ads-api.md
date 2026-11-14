---
id: 07-advertising
title: { ru: "Реклама: ADS API (углублённо)", en: "Advertising: ADS API (deep dive)" }
block: 07-advertising
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [ads-api, profiles, campaigns, adgroups, keywords, reporting, endpoints, bids, sponsored-products, sponsored-brands, sponsored-display]
updated: 2026-11-14
---

# Реклама: ADS API (углублённо) / Advertising: ADS API (deep dive)

Программное управление рекламой через **Amazon Ads API** (отдельный доступ от SP-API). Обзор ресурсов, эндпоинтов, отчётности.

Programmatic advertising via **Amazon Ads API** (separate access from SP-API). Resources, endpoints, reporting.

---

## 1. Доступ / Access

- **Отдельный** доступ от SP-API (отдельная регистрация приложения в Ads Console).
- Credentials: `ADS_CLIENT_ID`, `ADS_CLIENT_SECRET`, `ADS_REFRESH_TOKEN` + **`ADS_PROFILE_ID`** (профиль рекламного аккаунта).
- Тот же механизм LWA (refresh token → access token).
- Базовые URL (по региону): `advertising-api.amazon.com` (NA), `advertising-api-eu.amazon.com` (EU), `advertising-api-fe.amazon.com` (FE).

---

## 2. Модель ресурсов / Resource model

```
profiles (рекламный аккаунт, напр. seller или vendor)
 ├─ portfolios (портфели с общим бюджетом)
 └─ campaigns (кампания: тип SP/SB/SD, бюджет, стратегия ставок)
     └─ adGroups (группы)
         ├─ keywords / negativeKeywords (SP/SB)
         ├─ productAds (SP/SB)
         └─ targets (product/audience — SP/SD)
```

---

## 3. Кампании и эндпоинты / Campaigns & endpoints

| Тип | Путь (паттерн) | Модель оплаты |
|---|---|---|
| Sponsored Products | `/sp/campaigns`, `/sp/adGroups`, `/sp/keywords`, `/sp/productAds`, `/sp/negativeKeywords`, `/sp/targets` | CPC |
| Sponsored Brands | `/sb/campaigns`, `/sb/adGroups`, `/sb/keywords` (+ `/sb/media` для креативов) | CPC |
| Sponsored Display | `/sd/campaigns`, `/sd/adGroups`, `/sd/targets` | CPC или CPM/vCPM |

> Версия API мигрирует (v2 → v3). Проверяй актуальный мажор в Ads API docs перед продакшеном.

---

## 4. Ставки (биды) / Bids

- Поле `bid` на keyword/target.
- Стратегия на уровне кампании: `bidding.strategy`:
  - `LEGACY_FOR_SALES` (fixed)
  - `AUTO_FOR_SALES` (dynamic)
- Плейсменты (`placement`): `PLACEMENT_TOP` (top of search), `PLACEMENT_PRODUCT_PAGE` — с `percentage`-мультипликатором (0–900%).

---

## 5. Отчётность / Reporting

- **Асинхронно**: создать отчёт (`POST /reporting/reports`) → опросить статус → скачать результат.
- Типы отчётов: campaign / adGroup / keyword / searchTerm / productAds / targets, для SP/SB/SD.
- **Search Term Report** — главный источник для harvest и минус-слов.

Метрики (колонки): `impressions`, `clicks`, `ctr`, `spend`, `sales`, `acos`, `roas`, `orders`, `cpc`, `cvr`, `cvr14d`, `attributedSales14d`.

---

## 6. Типичный воркфлоу / Typical workflow

1. `GET /profiles` → `profileId`.
2. `POST /sp/campaigns` → создать кампанию.
3. `POST /sp/adGroups` → группа.
4. `POST /sp/keywords` → ключи (matchType, bid).
5. `POST /sp/negativeKeywords` → минус-слова.
6. `POST /reporting/reports` (searchTerm) → выгрузить запросы → harvest.

---

## 7. Лимиты / Limits

- Throttling по каждому ресурсу (см. заголовки `X-Amz-RateLimit-Limit`). Обычно ~1–10 req/s на ресурс.
- Отчёты — очередь; не чаще определённого интервала на создание.

---

## 8. Дельты по рынкам / Market deltas

| Рынок | Базовый URL | Валюта отчётов |
|---|---|---|
| US | advertising-api.amazon.com | USD |
| UK/EU/MENA | advertising-api-eu.amazon.com | GBP/EUR/местн. |
| (FE, если понадобится) | advertising-api-fe.amazon.com | — |

---

## 9. Связь с твоим стеком / Link to your stack

- Твой `Keepa` MCP — для аналитики рынка/конкурентов (не Ads API).
- `amazon-ppc` агент (в репо `Agents`) — стратегия и структура кампаний.
- Для продакшена: проверь доступ к Ads API (отдельная регистрация) — в `S:\US AMAZON API\CLAUDE.md` помечено «будет позже».
