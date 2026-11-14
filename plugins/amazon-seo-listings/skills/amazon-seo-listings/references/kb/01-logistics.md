---
id: 10-logistics
title: { ru: "Логистика: FBA, FBM, LTL, SPD, AWD, SFP", en: "Logistics: FBA, FBM, LTL, SPD, AWD, SFP" }
block: 10-logistics
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [logistics, fba, fbm, sfp, ltl, spd, awd, ipi, stranded-inventory, removal, inbound-placement]
updated: 2026-11-14
---

# Логистика: FBA, FBM, LTL, SPD, AWD, SFP / Logistics

Способы выполнения заказов и доставки товара на склады Amazon, с ключевыми комиссиями и метриками.

Fulfillment methods and inbound shipping, with key fees and metrics.

---

## 1. FBA vs FBM / FBA vs FBM

| | **FBA** (Fulfillment by Amazon) | **FBM / MFN** (Fulfillment by Merchant) |
|---|---|---|
| Кто хранит/доставляет | Amazon | Продавец |
| Prime | ✅ (важно для Buy Box) | ❌ (кроме SFP) |
| Возвраты | Amazon обрабатывает | продавец |
| Комиссии | referral + fulfillment + storage | только referral (+ свои расходы) |
| Buy Box | приоритетнее | слабее при равной цене |

**Referral fee** — % от продажи по категории (обычно 8–15%, зависит от категории и рынка). **Fulfillment fee** — по размерной сетке (size tier + вес).

---

## 2. FBA-комиссии / FBA fees (сводка)

| Комиссия | Что это |
|---|---|
| Referral fee | % от цены (по категории) |
| Fulfillment fee | за хранение/упаковку/доставку (по размеру+весу) |
| Monthly storage | $ за куб. фут в месяц (растёт в Q4) |
| Aged inventory surcharge | за товар > 180 дней |
| Removal / disposal | за вывод/утилизацию |
| Inbound placement | за распределение по складам (новая схема) |

> Все ставки — `[unverified]`, сверять с актуальным прайсом (FBA fee calculator).

---

## 3. Доставка на склады Amazon (inbound) / Inbound to Amazon

| Способ | Что это |
|---|---|
| **SPD — Small Parcel Delivery** | Коробки (мелкие партии), курьерской службой |
| **LTL — Less Than Truckload** | Паллеты (груз «не полный фура»), перевозчиком |

- **Inbound placement** (новая схема): Amazon предлагает «минимальный split» или «оптимизированный split» складов — влияет на комиссию. `[unverified]`

---

## 4. AWD — Amazon Warehousing & Distribution

- **Оптовый склад Amazon**: хранишь крупные партии, Amazon сам **пополняет FBA-склады** по мере продаж.
- Выгода: ниже стоимость хранения больших объёмов, авто-пополнение, меньше stockout.
- Дополняет FBA для крупных товаров/больших объёмов.

---

## 5. SFP — Seller Fulfilled Prime

- Продавец **сам доставляет** с Prime-гарантией (свой склад + согласованный перевозчик).
- Требует прохождения программы (жёсткие метрики доставки).
- Даёт Prime-бейдж без FBA.

---

## 6. Здоровье запасов / Inventory health

- **IPI (Inventory Performance Index)** — метрика запасов; низкий IPI → лимиты хранения.
- **Stranded inventory** — товар на складе без активного листинга (не продаётся, копится плата). Фиксить листинг или выводить (removal).
- **Excess inventory** — избыток → aged surcharge.

---

## 7. Дельты по рынкам / Market deltas

| Рынок | Особенность |
|---|---|
| US | FBA крупнейший, full-фич |
| UK/EU | FBA работает; **VAT-регистрация** обязательна для хранения на складах (по стране) |
| MENA (AE/SA) | FBA доступен, но объём складов меньше; `[unverified]` проверять лимиты |

---

## 8. Выбор стратегии / Choosing a strategy

| Ситуация | Решение |
|---|---|
| Маленький/лёгкий товар, нужен Prime | FBA |
| Крупногабарит/низкая оборачиваемость | FBM или AWD→FBA |
| Большие объёмы, стабильные продажи | AWD + авто-пополнение FBA |
| Свой склад + Prime-стандарты | SFP |
