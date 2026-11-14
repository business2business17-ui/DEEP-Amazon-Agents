---
id: 08-variations
title: { ru: "Вариации: parent/child, темы, атрибуты", en: "Variations: parent/child, themes, attributes" }
block: 08-variations
status: done
markets: [US, UK, DE, FR, IT, ES, NL, SE, PL, BE, TR, AE, SA]
tags: [variations, parent, child, parentage, variation-theme, swatch, relationship, 8032]
updated: 2026-11-14
sources:
  - { url: "file:///S:/US AMAZON API/VARIATIONS_PHONE_CASES.md", kind: own, note: "правила вариаций чехлов MOBILIUS (эталон B0HRL123ST)" }
---

# Вариации: parent/child, темы, атрибуты / Variations: parent/child, themes, attributes

Как устроены вариативные семейства товаров (одна карточка с выбором цвета/размера), как их собирать и частые ошибки.

How variation families work (one page with color/size picker), how to build them, and common errors.

---

## 1. Модель parent/child / Parent/child model

- **Parent** (`parentage_level=parent`) — общая карточка: заголовок, фото, bullets, описание. **Без цены и остатков.**
- **Child** (`parentage_level=child`) — конкретный вариант: своя цена, остатки, swatch-фото.
- Покупатель видит **parent**, а выбирает конкретный **child** (цвет/размер).

> Parent = shared page (no price/stock). Child = actual variant (own price/stock/swatch).

---

## 2. Тема вариаций / Variation theme

Тема определяет, по каким атрибутам различаются child'ы:
- `COLOR/SIZE` — цвет + размер (порядок важен!).
- `SIZE/COLOR`, `COLOR`, `SIZE`, `FLAVOR`, `STYLE`, `COUNTRY` и др.

**Порядок атрибутов в теме имеет значение** — `COLOR/SIZE` ≠ `SIZE/COLOR`.

---

## 3. Атрибуты child / Child attributes

| Атрибут | Значение |
|---|---|
| `child_parent_sku_relationship` | связь child → parent |
| `parentage_level` | `child` |
| `variation_theme` | тема (напр. `COLOR/SIZE`) |
| `color`, `size`, … | атрибуты вариации |
| `swatch_product_image_locator` | swatch-фото (плитка выбора) |

---

## 4. Как собирать (порядок) / Build order

1. **Создать parent** (`putListingsItem`, `parentage_level=parent`, `variation_theme`).
2. **Привязать children** (`patchListingsItem`: `child_parent_sku_relationship` + `parentage_level=child` + атрибуты вариации).
3. **Проверить**: parent без ошибки `8032`, `childSkus` = все дети.

⚠️ **Ошибка `8032`** («unable to assign a child SKU to more than one parent») возникает, если child ещё привязан к старому parent.

**Правильный порядок при перестройке:**
1. Удалить старые parents (только parents, **не удалять child SKU**).
2. **Подождать ≥ 30 мин** (обработка удаления).
3. Создать новый parent.
4. Привязать children.
5. Проверить (`BUYABLE`/`DISCOVERABLE`).

> Every step: dry-run (`VALIDATION_PREVIEW`) → apply after explicit confirmation.

---

## 5. Swatch / Свотч

- У **каждого** child заполнен `swatch_product_image_locator` = его главное фото (`main_product_image_locator`).
- Без swatch Amazon может показать цвет простой подписью, без плиток выбора.

---

## 6. Правило уникальности / Uniqueness

- Пара `Color + Size` внутри parent обязана быть **уникальной**.
- Если в parent один принт/цвет — Amazon показывает цвет текстом, без плиток (лучше несколько вариантов в parent).

---

## 7. Регламент для чехлов MOBILIUS (свой проект) / MOBILIUS phone-case rules

Из `S:\US AMAZON API\VARIATIONS_PHONE_CASES.md` (эталон: **B0HRL123ST**):

- `product_type` = `CELLULAR_PHONE_CASE`; тема **`COLOR/SIZE`** (не `SIZE/COLOR`).
- **Color = название принта** (без слова «Design»); **Size = модель** (`iPhone 15 Pro Max`, `AirPods 4` и т.д.).
- **Один parent = несколько принтов одной темы × все модели.** Один принт в parent → нет swatch-плиток.
- SKU parent = `<пул>-<Тема>`; `item_name` = `MOBILIUS <style> Case for iPhone, Compatible with MagSafe, <Theme> Print Collection`.
- Child меняем только: `child_parent_sku_relationship`, `parentage_level=child`, `variation_theme`, `color`, `size`, `swatch_product_image_locator`. Цены/остатки/тексты/фото — не трогать.
- **ЗАПРЕЩЕНО удалять child SKU/ASIN** (даже если Amazon в ошибке 8032 советует) — удалять можно только parent.

---

## 8. Дельты по рынкам / Market deltas

- Вариации одинаковы на всех рынках, но **локальные атрибуты** (size в см/дюймах, языки) — на EU/MENA переводить значения (напр. `Color` → локальное название).
- Swatch-фото — одинаковое на всех рынках.

---

## 9. Частые ошибки / Common errors

| Ошибка | Причина | Решение |
|---|---|---|
| `8032` | child привязан к другому parent | удалить старый parent → подождать ≥30 мин → привязать заново |
| Parent «Missing offer» | parent без цены (норма) | это норм для parent, цена на child |
| Нет плиток/swatch | один принт в parent / нет `swatch_product_image_locator` | несколько вариантов + заполнить swatch |
| Дубли пары Color+Size | не уникальная пара | развести по разным parent |
