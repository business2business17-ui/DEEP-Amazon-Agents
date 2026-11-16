# Свои агенты в терминал: OpenCode и Claude Code

Четыре агента из `plugins/*/agents/*.md` (формат Claude-плагина) переведены в нативный формат обоих терминалов. Все названы с префиксом **`deep-`** — в списках идут одним блоком и не смешиваются с `build` / `plan` / `codebase-memory-*` и чужими агентами.

| ID | Что делает | Скилл, который он грузит | Цвет |
|---|---|---|---|
| `deep-creative` | карусель, видео, A+ Basic/Premium, Brand Story, Brand Store, рекламные креативы | `amazon-creative-studio` | red / `#ff6b6b` |
| `deep-seo` | онбординг товара, GTIN, атрибуты, SEO-контент, цены, handoff в фиды | `amazon-seo-listings` | purple / `#a78bfa` |
| `deep-ppc` | кампании SP/SB/SD, search terms, negatives, биды, ACOS/TACOS | `amazon-ppc` | yellow / `#fbbf24` |
| `deep-feeds` | шаблоны `.xlsm`, Processing Report, правки, повторная проверка | `amazon-feeds` + `amazon-feed-compiler` + `amazon-feed-error-agent` | cyan / `#38bdf8` |

## Установка

### OpenCode

```powershell
copy integrations\opencode\agents\*.md  C:\Users\<user>\.config\opencode\agents\
```

### Claude Code

```powershell
copy integrations\claude\agents\*.md   C:\Users\<user>\.claude\agents\
copy integrations\claude\commands\*.md C:\Users\<user>\.claude\commands\
```

Команды дают короткий вход: `/deep-ppc разбери отчёт` вместо `claude --agent deep-ppc`. Внутри — `context: fork` + `agent: deep-ppc`, то есть задача уходит субагенту и результат возвращается в текущую сессию.

Разница в формате: Claude требует `name` + `description` и понимает только именованные цвета (`red`, `purple`, `yellow`, `cyan`); OpenCode берёт имя из файла и понимает hex. Поэтому два набора файлов, тело одно и то же.

### Скиллы (нужны обоим)

```powershell
pwsh -NoProfile -File tools\skillhub.ps1 add amazon-creative-studio amazon-seo-listings amazon-ppc amazon-feeds amazon-feed-compiler amazon-feed-error-agent
```

`skillhub.ps1 add` линкует скилл сразу в оба хаба: `~/.config/opencode/skills` и `~/.claude/skills`. `remove` чистит оба. Исходники в `plugins/` не трогаются, junction живёт синхронно с репозиторием.

## Как запускать

### OpenCode

| Задача | Команда |
|---|---|
| Список агентов | `Ctrl+X`, затем `A` |
| Следующий агент | `Shift+Tab` |
| Один запуск из терминала | `opencode run --agent deep-ppc "разбери этот search term report"` |
| Продолжить прошлую сессию | `opencode run --continue --agent deep-seo "продолжай"` |
| Вывод для скрипта | `opencode run --agent deep-feeds --format json "проверь фид"` |

`--agent` принимает ID файла без `.md`.

### Claude Code

| Задача | Команда |
|---|---|
| Сессия сразу в агенте | `claude --agent deep-ppc` |
| Разовый запрос | `claude --agent deep-seo -p "проверь GTIN в этой папке"` |
| Слэш-команда из сессии | `/deep-ppc разбери search term report` |
| Проверка файлов | `claude plugin validate ~/.claude/agents` и `~/.claude/commands` |
| Делегирование из обычной сессии | попросить: «через `deep-creative` собери бриф на карусель» |
| Без установки, разово | `claude --agents '<json>'` (определение только на сессию) |

Claude определяет субагента по `name` из frontmatter, а не по имени файла. Свои агенты он подхватывает из `~/.claude/agents/` во всех проектах; для одного проекта — `.claude/agents/` в его корне.

## Почему `mode: all` (только OpenCode)

`primary` — сидеть в агенте самому, `subagent` — делегировать. `all` даёт оба сценария одним файлом. В Claude этого поля нет: агент всегда доступен и как сессия (`--agent`), и как субагент (Agent tool).

## Отличия от версии в `plugins/`

- `model: inherit` убран: OpenCode наследует модель сессии, Claude берёт свою по умолчанию.
- Добавлен fallback: если скилл не зарегистрирован, агент сам выполнит `skillhub.ps1 add <id>` или прочитает протокол из `dist/<id>/system-prompt.md`.
- Добавлена секция «Границы», чтобы агенты не лезли в чужие домены (реклама / листинги / фиды / креатив).
- ID с префиксом `deep-`: в OpenCode поле `name` не поддерживается (имя = имя файла), поэтому различимость сделана префиксом, цветом и описанием.

Протоколы остаются в `plugins/<id>/skills/...`; эти файлы — только обёртка.
