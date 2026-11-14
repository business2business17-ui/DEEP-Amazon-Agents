---
id: 03-seo
title: { ru: "SEO: A9, COSMO, Rufus, индексация", en: "SEO: A9, COSMO, Rufus, indexation" }
block: 03-seo
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [seo, a9, cosmo, rufus, indexation, keywords, title, bullets, backend, helium10, cerebro, ranking]
updated: 2026-11-14
sources:
  - { url: "https://developer-docs.amazon.com/sp-api/docs/product-type-definitions-api", kind: official, note: "атрибуты для индексации" }
---

# SEO: A9, COSMO, Rufus, индексация / SEO: A9, COSMO, Rufus, indexation

Как Amazon находит товар по поиску и что влиять, чтобы листинг ранжировался и индексировался.

How Amazon matches products to search, and what to influence for ranking and indexation.

---

## 1. Три слоя поиска / Three search layers

| Слой | Что делает | Что оптимизировать |
|---|---|---|
| **A9** | Классический алгоритм: релевантность + продажи | title/bullets/backend, CTR, конверсия, продажи |
| **COSMO** | Семантический слой: намерение покупателя, связи понятий | атрибуты, полнота данных, контекст |
| **Rufus** | Генеративный AI-ассистент (поиск/ответы) | атрибуты, Q&A, язык отзывов |

> A9 = classic relevance+performance. COSMO = semantic intent layer. Rufus = generative AI shopping assistant.

---

## 2. A9 — что реально влияет на ранг / What actually drives A9 rank

**Релевантность (индексация):**
- Ключ должен быть **проиндексирован** (присутствовать в title/bullets/backend/атрибутах).
- Порядок важности для индексации: **title > bullets > backend keywords > description/атрибуты**.

**Производительность (что двигает вверх по выдаче):**
- **CTR** (клики из выдачи) → главное фото + цена.
- **CVR** (конверсия) → качество листинга, отзывы, A+, цена.
- **Продажи** (velocity) — главный цикл обратной связи.
- Отзывы (кол-во и рейтинг), наличие (out of stock = падение ранга).

> Relevance = indexation (title > bullets > backend). Performance = CTR × CVR × sales velocity; reviews, stock, price.

---

## 3. COSMO — семантический слой / COSMO

- Понимает **намерение** и связи понятий («беспроводная зарядка» → «магнитная», «быстрая»).
- Лучше ранжирует товары с **полными атрибутами** и корректным `product_type`.
- `[forum-lifehack]` Заполняй ВСЕ релевантные атрибуты в фиде/PTD (не только обязательные) — COSMO «связывает» товар с большего числа запросов.

---

## 4. Rufus — AI-ассистент / Rufus

- Генеративный поиск: покупатель задаёт вопрос («чехол для iPhone 15 с подставкой»), Rufus выдаёт товары/ответы.
- Rufus читает: **атрибуты**, **bullet points**, **описание**, **Q&A**, **отзывы**.
- Оптимизация под Rufus = писать буллеты как **ответы на вопросы** + заполнять атрибуты + следить за языком отзывов.
- `[forum-lifehack]` Добавляй в bullets/description вопросно-ответные формулировки, которые повторяют реальные вопросы покупателей.

---

## 5. Ключи: стратегия / Keyword strategy

### 5.1 Источники ключей
- **Helium 10 Cerebro / Magnet** — поиск и объёмы ключей (свой MCP есть: `Keepa`, `Parser`).
- **Amazon Brand Analytics → Search Query Performance (SQP)** — реальные данные по бренду (официально, если есть Brand Registry).
- **Amazon autocomplete** — длинный хвост.

### 5.2 Распределение ключей / Keyword placement
- **Title** — 2–3 главных ключа (наибольший вес).
- **Bullets** — вторичные ключи (в начале каждого).
- **Backend** — синонимы, опечатки, варианты, длинный хвост (250 байт).
- **Атрибуты** — для COSMO/Rufus и фильтров.

---

## 6. Индексация: как проверить / Checking indexation

- **Метод 1:** поиск `ASIN + ключ` в выдаче Amazon — если товара нет, ключ не проиндексирован.
- **Метод 2:** сервисы (Helium 10 Index Checker).
- `[forum-lifehack]` Неиндексированный ключ часто = его нет ни в одном текстовом поле. Добавь в title/bullets/backend и перепроверь через ~24–48 ч.

> Unindexed keyword usually means it's absent from all text fields. Add to title/bullets/backend, re-check in 24–48h.

---

## 7. Конверсия (влияет на ранг) / Conversion levers

1. Главное фото (белый фон, товар крупно) → CTR.
2. Галерея + инфографика → удержание.
3. A+ контент → доверие, CVR.
4. Отзывы (кол-во + рейтинг).
5. Цена vs конкуренты (Buy Box).
6. Наличие (out of stock = потеря ранга).
7. Видео.

---

## 8. Дельты по рынкам / Market deltas

| Рынок | Ключевые слова |
|---|---|
| US | английские (en_US), американизмы |
| UK | en_GB (напр. "colour", "mobile phone") |
| DE/FR/IT/ES | **переводи ключи на локальный язык** (не транслит) |
| NL/SE/PL/BE/TR | локальный язык |
| AE/SA | en + ar (арабские запросы) |

⚠️ Ключи не переводятся «слово в слово» — исследуй локальную выдачу (autocomplete/Helium 10 на нужном маркетплейсе).

---

## 9. Лайфхаки 2026 (forum-lifehack) / 2026 lifehacks

1. **Полные атрибуты** — главный фактор COSMO/Rufus. Заполняй всё в PTD, не только обязательное.
2. **Q&A-стиль буллетов** — буллеты как ответы на вопросы (под Rufus).
3. **Дублировать ключи из отзывов** — язык покупателей → в backend.
4. **Не спамить backend** — 250 байт, уникальные термины, без повторов title.
5. **Следи за индексацией после каждого обновления** — PATCH может «выбить» ключ из индекса.
6. **A+ и видео** — косвенно поднимают CVR → ранг.

> Все пункты §9 — `[forum-lifehack]`, проверять перед применением.
