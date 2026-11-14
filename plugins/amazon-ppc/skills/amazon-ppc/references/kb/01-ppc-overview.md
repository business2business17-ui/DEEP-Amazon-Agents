---
id: 04-ppc
title: { ru: "PPC: типы рекламы, ставки, биды, метрики", en: "PPC: ad types, bids, metrics" }
block: 04-ppc
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [ppc, sponsored-products, sponsored-brands, sponsored-display, bid, acos, tacos, roas, match-type, negative-keywords, budget, placement]
updated: 2026-11-14
---

# PPC: типы рекламы, ставки, биды, метрики / PPC: ad types, bids, metrics

Полный обзор рекламы Amazon: кампании, таргетинг, ставки, бюджеты и метрики эффективности. (Углублённый разбор ADS API — в блоке `07-advertising`.)

Full Amazon advertising overview: campaigns, targeting, bids, budgets, and efficiency metrics. (Deep ADS-API dive in `07-advertising`.)

---

## 1. Типы кампаний / Campaign types

| Тип | RU | Формат | Таргетинг | Модель оплаты |
|---|---|---|---|---|
| **SP — Sponsored Products** | Реклама товаров | Карточка товара в выдаче/на страницах | ключи (broad/phrase/exact) + товары (ASIN/категория) | CPC |
| **SB — Sponsored Brands** | Реклама бренда | Баннер (логотип + товары) вверху выдачи | ключи | CPC |
| **SBV — Sponsored Brands Video** | Видео бренда | Видео в выдаче | ключи | CPC |
| **SD — Sponsored Display** | Медийная/ретаргетинг | Баннер на/вне Amazon | товары + аудитории (views/retarget) | CPC или CPM/vCPM |

> SD может быть на CPC (product targeting) или CPM/vCPM (audience targeting).

---

## 2. Ставки (биды) / Bids

### 2.1 Стратегии ставок / Bid strategies
| Стратегия | RU | Поведение |
|---|---|---|
| **Fixed bid** | Фиксированная | Amazon не меняет ставку |
| **Dynamic bids — down only** | Динамическая (только вниз) | снижает, если клик маловероятен |
| **Dynamic bids — up and down** | Динамическая (вверх/вниз) | +100% к ставке при высокой вероятности конверсии |

### 2.2 Корректировки размещения / Placement adjustments
- **Top of search** — надбавка за верх выдачи (мультипликатор, напр. +50%).
- **Product pages** — надбавка на страницах товаров.

Итоговая ставка = `базовая ставка × корректировка размещения × динамический множитель`.

> Effective bid = base bid × placement multiplier × dynamic multiplier.

---

## 3. Таргетинг / Targeting

### 3.1 Ключевые слова (match types)
| Тип | RU | Пример |
|---|---|---|
| `BROAD` | Широкое | «case» → phone case, case for iPhone… |
| `PHRASE` | Фразовое | «phone case» → blue phone case, phone case 15… |
| `EXACT` | Точное | только «phone case» |

### 3.2 Минус-слова / Negative keywords
- `negative exact` — исключить точное.
- `negative phrase` — исключить фразу.
- Цель: отсечь нерелевантный трафик и снизить ACoS (анализ через **Search Term Report**).

### 3.3 Авто vs ручное / Auto vs manual
- **Auto** — Amazon сам подбирает таргетинг (4 группы: close match, loose match, substitutes, complements). Источник новых ключей.
- **Manual** — ты задаёшь ключи/ASIN.

### 3.4 Товарный таргетинг (SD/SP) / Product targeting
- По **ASIN** конкурента (attack) или своему (defend).
- По **категории** с уточнениями (цена/рейтинг/бренд).

---

## 4. Структура аккаунта / Account structure

```
Portfolio (портфель, общий бюджет)
 └─ Campaign (кампания: тип, бюджет, таргетинг)
     └─ Ad Group (группа объявлений)
         └─ Ad / Keyword (объявления / ключи)
```

---

## 5. Бюджет / Budget

- **Daily budget** — дневной лимит кампании.
- Если бюджет заканчивается рано → кампания «выключается» до конца дня (потеря показов).
- `[forum-lifehack]` Не дели бюджет на слишком много ключей в одной кампании — топовые ключи «съедают» всё.

---

## 6. Метрики / Metrics

| Метрика | Формула | Смысл |
|---|---|---|
| **ACoS** | spend / sales × 100% | Доля рекламы в продажах кампании |
| **TACoS** | spend / total revenue × 100% | Доля рекламы в общем обороте |
| **ROAS** | sales / spend | Сколько продаж на 1$ рекламы |
| **CTR** | clicks / impressions | Кликабельность |
| **CVR** | orders / clicks | Конверсия |
| **CPC** | spend / clicks | Цена клика |

**Break-even ACoS** = маржа (%). Если ACoS < маржа → реклама прибыльна.

> Break-even ACoS = product margin. ACoS below margin = profitable ads.

---

## 7. Классическая структура запуска / Standard launch structure

1. **Auto** кампания (низкий бюджет) → сбор ключей из Search Term Report.
2. **Harvest**: рабочие ключи → Exact-кампании; мусор → минус-слова.
3. **Manual broad/phrase** → расширение.
4. **Defend** (SD/SP product targeting на свой ASIN) — защита Buy Box/бренда.
5. **Retargeting** (SD views) — вернуть тех, кто смотрел.

---

## 8. Дельты по рынкам / Market deltas

| Рынок | Особенность |
|---|---|
| US | эталон; USD |
| UK/EU | ключи на локальном языке; EUR/GBP |
| MENA (AE/SA) | en + ar ключи; AED/SAR; объём поиска ниже |
| SE/PL/TR | локальная валюта (SEK/PLN/TRY), конверсия и ставки ниже |

---

## 9. ADS API (кратко) / ADS API (brief)

- Отдельный доступ от SP-API (свои credentials: `ADS_CLIENT_ID`, `ADS_CLIENT_SECRET`, `ADS_REFRESH_TOKEN`, `ADS_PROFILE_ID`).
- Основные объекты: `profiles` → `campaigns` → `adGroups` → `ads`/`keywords`/`targets`.
- Отчёты: `reporting/v3` (sp/sb/sd), `searchTermReports`.
- Полный разбор эндпоинтов и полей — блок `07-advertising`.
