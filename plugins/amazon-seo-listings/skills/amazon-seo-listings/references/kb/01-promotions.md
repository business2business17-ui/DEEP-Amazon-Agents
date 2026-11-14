---
id: 06-promotions
title: { ru: "Промо: coupons, deals, vouchers, Vine, S&S", en: "Promotions: coupons, deals, vouchers, Vine, S&S" }
block: 06-promotions
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [promotions, coupon, deal, lightning-deal, best-deal, voucher, vine, subscribe-and-save, prime-exclusive, brand-tailored]
updated: 2026-11-14
---

# Промо: coupons, deals, vouchers, Vine, Subscribe & Save / Promotions

Все механики скидок и промо на Amazon: что это, требования, комиссии, где включается.

All Amazon discount mechanics: what they are, requirements, fees, where to enable.

---

## 1. Сводка / Overview

| Механика | Что делает | Кому видно | Платно? |
|---|---|---|---|
| **Coupon** | Зелёный бейдж скидки (%/сумма) | всем/Prime/студентам | $0.60 за погашение |
| **Lightning Deal** | Флеш-распродажа (часы) | всем | комиссия за показ |
| **Best Deal / 7-day Deal** | Скидка на неделю | всем | комиссия за показ |
| **Prime Exclusive Discount** | Скидка только Prime | Prime | бесплатно |
| **Voucher** | Промокод (%/сумма) | по коду | бесплатно |
| **Subscribe & Save** | Скидка за подписку | подписчики | скидка за счёт селлера |
| **Vine** | Ранние отзывы | — | платно по уровням |
| **Brand Tailored Promotion** | Целевая скидка сегментам | выбранные сегменты | бесплатно |

---

## 2. Coupon / Купон

- **Зелёный бейдж** на карточке/в выдаче — сильно поднимает CTR.
- Формат: **% скидка** или **$ скидка**.
- Настройки: минимальная сумма покупки, аудитория (все / Prime / студенты / мамы), расписание (даты).
- Комиссия Amazon: **$0.60 за каждое погашение** купона (в US; проверять по рынкам).
- Требует Professional-план и товар в Buy Box.

> Coupon = green badge, % or $ off, audience + schedule, $0.60/redemption (US). Requires Pro plan + Buy Box.

---

## 3. Deals (Lightning / Best / 7-day / DOTD)

| Тип | Длительность | Требование к скидке | Комиссия |
|---|---|---|---|
| **Lightning Deal** | часы (2–6) | мин. скидка + мин. объём | ~$150–300 за показ |
| **Best Deal** | до 1 недели | скидка от историч. цены | ~$300 |
| **7-day Deal** | 7 дней | как Best Deal | ~$300 |
| **Deal of the Day (DOTD)** | 1 день | максимальная скидка | по приглашению |

- Deals требуют: Professional-план, хорошая история продаж, рейтинг ≥3★, Prime-доставка.
- Показываются на странице **Deals** и в выдаче с бейджем.
- `[unverified]` Комиссии меняются (праздники дороже) — проверять в Seller Central → Deals.

> Lightning (hours) / Best / 7-day / DOTD. Require Pro plan, sales history, ≥3★, Prime. Fees vary (higher on holidays).

---

## 4. Prime Exclusive Discount / Prime-эксклюзивная скидка

- Скидка видна **только Prime**-подписчикам.
- Бесплатно; минимум скидки (обычно ≥10–20% от эталонной цены).
- Сильный инструмент для запуска — поднимает CVR без «дешёвой» видимости для всех.

---

## 5. Voucher / Ваучер (промокод)

- Промокод: **% off** или **$ off**.
- Ограничения: число погашений, одноразовость, срок действия.
- Используется для: инфлюенсеров, email-базы, оффлайн-промо.
- `[forum-lifehack]` Voucher не «режет» историю цены так, как Sale Price, — удобно для внешнего трафика.

---

## 6. Subscribe & Save (S&S) / Подписка

- Покупатель подписывается на регулярную доставку → скидка.
- **Финансируется селлером**: базово `discountPercentage` 0/5/10%.
- **Tiered**: Amazon даёт доп. скидку (5/10/15/20%), если у подписчика ≥5 активных подписок.
- В API: `replenishmentDiscount.discountPercentage` (0–100).
- Только для расходных/повторяемых товаров.

> S&S: seller funds 0/5/10%; Amazon adds tiered (5/10/15/20%) at 5+ subscriptions. API: `replenishmentDiscount`.

---

## 7. Vine / Vine-отзывы

- Программа ранних отзывов от доверенных ревьюеров (**Vine Voices**).
- Регистрация: зачислить **до 30 единиц** товара; Vine Voices забирают бесплатно и пишут отзывы.
- Отзывы Vine: пометка «Vine Customer Review of Free Product», считаются как обычные.
- Платно по **уровням (tiers)**:
  - `[unverified]` Tier 0 — 2 ед. (бесплатно/мало), Tier 1 — 10 ед. ($75), Tier 2 — 30 ед. ($200).
- Отзывы Vine **не гарантированы** положительными (честные), но ускоряют появление первых отзывов.

> Vine: enroll up to 30 units; Vine Voices review for free. Paid tiers. Reviews are honest (not guaranteed positive) but accelerate first reviews.

---

## 8. Brand Tailored Promotion / Целевые промо бренда

- Скидка **выбранным сегментам аудитории бренда** (Brand Registry):
  - Повторные покупатели, недавние покупатели, подписчики бренда, бросившие корзину, high-spend.
- Формат: % off (10–50%).
- Видно только выбранным сегментам — не «дешевит» публичную цену.

---

## 9. Дельты по рынкам / Market deltas

| Рынок | Особенность |
|---|---|
| US | все механики доступны |
| UK/EU | Vine/deals/coupons есть; следи за локальными требованиями (напр. немецкие правила акций) |
| MENA (AE/SA) | часть механик ограничена; `[unverified]` проверять доступность в Seller Central |

---

## 10. Стратегия выбора / Choosing a mechanic

| Цель | Механика |
|---|---|
| Запуск, первые продажи | Coupon + Vine + Prime Exclusive |
| Поднять CTR | Coupon (зелёный бейдж) |
| Распродажа запасов | Lightning/Best Deal, Voucher |
| Retention (расходники) | Subscribe & Save |
| Вернуть сегмент | Brand Tailored Promotion |
| Внешний трафик | Voucher (промокод) |

> Все комиссии/пороги в этом блоке — `[unverified]` (меняются), проверять в Seller Central перед запуском.
