# OpenCode: своих агентов в терминал

Четыре агента из `plugins/*/agents/*.md` (формат Claude-плагина) переведены в нативный формат OpenCode и лежат рядом в `agents/`.

| Агент | Что делает | Скилл, который он грузит |
|---|---|---|
| `amazon-creative-studio` | карусель, видео, A+ Basic/Premium, Brand Story, Brand Store, креативы для рекламы | `amazon-creative-studio` |
| `amazon-seo-listings` | онбординг товара, GTIN, атрибуты, SEO-контент, цены, handoff в фиды | `amazon-seo-listings` |
| `amazon-ppc` | кампании SP/SB/SD, search terms, negatives, биды, ACOS/TACOS, диагностика | `amazon-ppc` |
| `amazon-feeds` | заполнение шаблонов `.xlsm`, разбор Processing Report, правки | `amazon-feeds` + `amazon-feed-compiler` + `amazon-feed-error-agent` |

## Установка

1. Скопировать `agents/*.md` в `~/.config/opencode/agents/` (Windows: `C:\Users\<user>\.config\opencode\agents\`).
2. Подключить скиллы, которые эти агенты грузят:

```powershell
pwsh -NoProfile -File tools/skillhub.ps1 add amazon-creative-studio amazon-seo-listings amazon-ppc amazon-feeds amazon-feed-compiler amazon-feed-error-agent
```

3. Проверить: `opencode api get /api/agent` — агенты должны быть со `"mode":"all"`.

## Как пользоваться

- **Как основной агент:** в TUI переключение агентом (Tab / список агентов) → выбрать `amazon-creative-studio` и работать в нём.
- **Как субагент:** попросить текущего агента запустить нужного, например «через `amazon-ppc` разбери search term report». Режим `all` разрешает оба варианта.

## Почему `mode: all`

`primary` — чтобы сидеть в агенте самому, `subagent` — чтобы делегировать из другой сессии. `all` даёт и то, и другое: один файл, оба сценария.

## Отличия от версии в `plugins/`

- `model: inherit` убран — OpenCode наследует модель сессии сам.
- Добавлен fallback: если скилл не зарегистрирован, агент сам выполнит `skillhub.ps1 add <id>` или прочитает протокол из `dist/<id>/system-prompt.md`.
- Добавлена секция «Границы» — чтобы агенты не лезли в чужие домены (реклама / листинги / фиды / креатив).

Исходники протоколов остаются в `plugins/<id>/skills/...`; эти файлы — только обёртка, дублировать логику в них не нужно.
