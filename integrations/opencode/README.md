# OpenCode: свои агенты в терминал

Четыре агента из `plugins/*/agents/*.md` (формат Claude-плагина) переведены в нативный формат OpenCode и лежат рядом в `agents/`.

Все четыре названы с префиксом **`deep-`** — в списке агентов они идут одним блоком и не смешиваются с `build` / `plan` / `codebase-memory-*` и чужими агентами.

| ID | Что делает | Скилл, который он грузит |
|---|---|---|
| `deep-creative` | карусель, видео, A+ Basic/Premium, Brand Story, Brand Store, креативы для рекламы | `amazon-creative-studio` |
| `deep-seo` | онбординг товара, GTIN, атрибуты, SEO-контент, цены, handoff в фиды | `amazon-seo-listings` |
| `deep-ppc` | кампании SP/SB/SD, search terms, negatives, биды, ACOS/TACOS, диагностика | `amazon-ppc` |
| `deep-feeds` | заполнение шаблонов `.xlsm`, разбор Processing Report, правки | `amazon-feeds` + `amazon-feed-compiler` + `amazon-feed-error-agent` |

Цвета в UI: `deep-creative` — красный `#ff6b6b`, `deep-seo` — фиолетовый `#a78bfa`, `deep-ppc` — янтарный `#fbbf24`, `deep-feeds` — голубой `#38bdf8`.

## Установка

1. Скопировать `agents/*.md` в `~/.config/opencode/agents/` (Windows: `C:\Users\<user>\.config\opencode\agents\`).
2. Подключить скиллы, которые эти агенты грузят:

```powershell
pwsh -NoProfile -File tools/skillhub.ps1 add amazon-creative-studio amazon-seo-listings amazon-ppc amazon-feeds amazon-feed-compiler amazon-feed-error-agent
```

3. Проверить: `opencode api get /api/agent` — должны быть `deep-creative`, `deep-seo`, `deep-ppc`, `deep-feeds` со `"mode":"all"`.

## Как пользоваться

- **Переключение:** `Ctrl+X` → `A` (список агентов) или `Shift+Tab` (следующий).
- **Как основной агент:** выбрать `deep-ppc` и работать в нём.
- **Как субагент:** попросить текущего агента делегировать, например «через `deep-ppc` разбери search term report».

## Почему `mode: all`

`primary` — чтобы сидеть в агенте самому, `subagent` — чтобы делегировать из другой сессии. `all` даёт оба сценария одним файлом.

## Отличия от версии в `plugins/`

- `model: inherit` убран — OpenCode наследует модель сессии сам.
- Добавлен fallback: если скилл не зарегистрирован, агент сам выполнит `skillhub.ps1 add <id>` или прочитает протокол из `dist/<id>/system-prompt.md`.
- Добавлена секция «Границы» — чтобы агенты не лезли в чужие домены (реклама / листинги / фиды / креатив).
- ID переименованы в `deep-*`: поле `name` в OpenCode V2 не поддерживается, отображаемое имя = имя файла, поэтому различимость делается префиксом, цветом и описанием.

Исходники протоколов остаются в `plugins/<id>/skills/...`; эти файлы — только обёртка, дублировать логику в них не нужно.
