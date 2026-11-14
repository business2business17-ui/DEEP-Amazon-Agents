---
name: amazon-ai-shopping-cn
description: Ranskill 中文 Amazon Alexa for Shopping（原 Rufus）v0.2.30 调研 agent。用于多关键词、多邮编自然问题采集，自然位 Top ASIN 与广告位识别，指定 ASIN 自然问题去重，Alexa for Shopping 提问与回答采集，内容分析，Listing 诊断评分优化，以及按需生成指定 ASIN COSMO 15维分析报告；最终客户目录只保留五项标准交付和一项可选 COSMO 报告。
---

# Ranskill：Amazon Alexa for Shopping 中文 Agent v0.2.30

## 跨 Agent 运行约定

- 同一份 Skill 支持 Codex、Claude Code 和 Hermes Agent；不要依赖某个平台独有的工具名、安装目录或提示语法。
- 把当前 `SKILL.md` 所在目录视为 `SKILL_ROOT`，所有 `npm` 和 `node scripts/...` 命令都从该目录运行。
- 根据当前操作系统选择可用 shell。下面的单行命令可在 PowerShell、bash 和 zsh 中运行。
- 浏览器采集依赖本机 Chrome/Chromium 图形环境与已登录的 Amazon 会话；无桌面的 Hermes 服务器应连接到已有 Chrome CDP 会话，不要尝试无界面登录。

## v0.2.30 边界

这个 skill 的标准边界是：

- 主流程自动推进：初始化信息确认后，CDP 检查、自然问题采集、自然位 Top ASIN 采集、指定 ASIN 自然问题采集、去重/清洗、自然问题回答采集、manifest 生成等确定性步骤应连续执行，不要每一步都要求用户说“继续”。
- 指定 ASIN 在主流程里只表示“采集这个 ASIN 商品页上的自然建议问题”。这些问题进入自然问题去重和频次统计。
- `natural_question_cleaned.csv` 是主流程回答采集的首选输入；没有清洗文件时使用 `natural_question_deduped.csv`。
- 自然问题回答采集必须优先使用该问题行的 `asins` 打开关联 ASIN 商品页再提问；没有 ASIN 的问题才使用搜索/品类上下文。
- 同一自然问题行关联多个 ASIN 时，必须展开成“同一问题 x 每个 ASIN”的多条执行任务，不能只取第一个 ASIN。
- 没有 ASIN 的 fallback 问题必须使用英文 `promptProductContext` 或英文关键词/品类名，不能把中文产品名塞进提交给 Alexa for Shopping（Rufus）的英文问题里。
- 如果 Alexa for Shopping（Rufus）回答反问“你问的是哪个产品”、包含 feedback/Submit/Add to cart 等 UI 噪音，或明显回答了上一题，必须标记 failed，不得计入 successful。
- Q&A 不再作为 Listing 内容模块、评分模块或改写模块。如果检测到 Q&A / Looking for specific info / Ask Alexa 入口，只能作为内部页面状态备注。
- 15 个 Relation Probes 是指定 ASIN 的独立 COSMO 分析功能，不进入主流程，不参与自然问题去重，也不影响 Listing 评分。

## 启动前必须确认

正式运行前只确认必要输入：

- 产品是什么。
- 采集关键词是什么。
- 采集站点和邮编：支持单邮编或多邮编；未提供时使用浏览器当前配送位置。
- 输出位置：默认生成本地交付包；飞书或 Google Sheets 目标只能由用户在运行时提供。
- 是否有指定 ASIN 要采集商品页自然问题。
- 是否另外需要指定 ASIN COSMO 15维分析报告；未明确要求时不生成。
- Chrome CDP 是否可用，Amazon 是否已登录。

不要把竞品 ASIN 当作初始化必填项。竞品/样本 ASIN 默认从关键词搜索结果自然位发现。

## 公开包隐私规则

- 不得把飞书 Base/App Token、Table ID、View ID、应用凭据、Webhook、个人域名、客户链接或联系方式写入 Skill、脚本、示例、截图和交付 manifest。
- 飞书或 Google Sheets 的目标地址与认证信息只在当前运行中接收，不写入公开仓库；示例统一使用明显的占位符。
- 客户 CSV 不输出本地绝对路径、截图路径或认证字段。调试截图、JSON、manifest 和原始证据统一放入 `_evidence` 或 `_internal`。

## 自然位排名规则

自然位 Top ASIN 只能由 `scripts/amazon_search_rank_resolver.mjs` 判断。禁止用搜索页视觉顺序、图片位置或临时选择器替代 resolver。

每个被选中的自然位 ASIN 必须保留：

- `asinRank` / `keywordRank`
- `searchResultType=organic`
- `searchPagePosition`
- `sponsoredSkippedBefore`
- `rankEvidence`
- `search_rank_audit.json`

如果没有 `rankEvidence`，不能把该 ASIN 当作自然位 Top 3 样本进入后续分析或 Listing 打分。

## 主流程命令

首次真实浏览器采集前：

```shell
npm install
npm run check
```

检查 CDP：

```shell
node scripts/rufus_cdp_preflight.mjs
```

如未启动 CDP，启动专用 Chrome profile，并让操作者登录 Amazon：

```shell
node scripts/rufus_cdp_preflight.mjs --launch-dedicated-profile
```

采集关键词搜索页自然问题、自然位 Top ASIN，以及自然位 ASIN 商品页自然问题：

```shell
node scripts/rufus_collect_pipeline_cn.mjs --product "PRODUCT_NAME" --keywords "keyword one|keyword two" --postal-codes "94142|10001" --top-asins 3 --out-dir "output/PROJECT_NAME"
```

用去重/清洗后的自然问题队列逐条向 Alexa for Shopping（Rufus）提问并采集完整回答：

```shell
npm run answers:collect -- --product "PRODUCT_NAME" --cleaned-questions "output/PROJECT_natural_cleaned/natural_question_cleaned.csv" --out-dir "output/PROJECT_natural_answers" --output-language zh-CN
```

只有自然问题回答采集完成后，才能进入答案洞察、Listing 打分和改写建议。

## 指定 ASIN COSMO 15维分析报告

只有用户明确要求“对某个确切 ASIN 做 COSMO/15维产品认知、使用场景、人群、搭配或身体部位分析”时运行：

必须先读取 `references/relation-report-language-policy.md`，并按目标交付语言完成语义归一化、渲染和语言校验。

```shell
node scripts/asin_relation_probe_report.mjs --product "PRODUCT_NAME" --asins "B0EXAMPLE01" --out-dir "output/PROJECT_asin_relation_probe_report"
```

固定覆盖 15 个字段：

`is_a`, `used_as`, `used_on`, `used_in_location`, `used_for_func`, `capable_of`, `used_for_event`, `used_to`, `used_with`, `used_by`, `xInterest_in`, `xIs_a`, `xWant`, `used_for_audience`, `used_in_body`

每条问题和答案必须保留 `relationField`。

同一任务必须自动完成“采集原文 → 事实抽取 → 目标语言归一化 → 渲染 → 校验”，不等待用户再说“分析”或“继续”。采集脚本会在 `_evidence/relation_probe_semantic_analysis.json` 生成待归一化任务；当前 Agent 必须填写 `displayProductTitle`、所有有效维度的 `displayTags` 和 `displayFacts`，并把 `status` 改为 `ready` 后再渲染正式 HTML。

输出目录根部只保留：

- `asin_relation_probe_answers.csv`：15维原始问题、完整回答、有效性与状态。
- `asin_relation_product_report.html`：一个 ASIN 一页的 COSMO 15维可视化分析报告。

HTML 必须展示全部15个维度，并包含有效回答数、证据完整度、产品定位、主要场景、核心人群、购买目标和常见搭配。每个维度先从完整回答中提炼可信短标签，再直接列出该维度完整的产品事实；禁止显示回答开头截断段落，禁止用通用二元词凑标签。原问题和完整回答只放在可展开证据区；失败维度明确显示缺失原因，不允许补写推测答案。截图、调试 JSON 和 manifest 统一放入 `_evidence`，不占用客户报告根目录。

完成语义 JSON 后生成正式报告：

```shell
npm run relation:visualize -- --csv "OUTPUT_DIR/asin_relation_probe_answers.csv" --analysis-json "OUTPUT_DIR/_evidence/relation_probe_semantic_analysis.json" --language zh-CN --out "OUTPUT_DIR/asin_relation_product_report.html"
```

中文默认可见内容必须中文优先；原始英文词用 `办公（office）` 形式保留，品牌、型号、ASIN、MagSafe、USB-C、TPU 等专名例外。原始英文问题和回答只放在折叠证据区。交付前运行 `npm run relation:validate -- --dir "OUTPUT_DIR"`；语义状态未 ready、中文事实未本地化、出现独立英文标签、CSV 或15维 HTML 缺失时都不能交付。

## Listing 审计（沿用 v0.2.27 规则）

用户要求 Listing 审计、打分、优化、改写或 AI-ready Listing 总审计时，必须同时读取 `references/listing-auditor-cn.md`，并在交付前运行：

```shell
npm run listing:validate -- --dir "OUTPUT_DIR"
```

Listing 审计必须覆盖：

- 标题
- 五点
- 图片：按当前 ASIN 链接实际图片栈数量逐张审计。
- A+：同时审计文字和图片；有轮播/滑动卡片/多 slide 时逐页展开。
- 属性/规格/后台词。

不是所有采集到的问题都能变成 Listing 修改。每个信号必须先做产品事实判断：

- `capabilityFit=supported`：当前产品真实支持，可以进入 Listing 文案、图片、A+、属性优化。
- `capabilityFit=weak`：当前产品部分支持，只能按真实能力弱化表达。
- `capabilityFit=unsupported`：当前产品不支持，进入产品开发机会，不能写成 Listing claim。
- `capabilityFit=unknown`：证据不足，需要补产品事实。
- `capabilityFit=not_applicable`：不适用。

每条动作必须有 `actionBucket`：

- `listing_content_fix`
- `visual_proof_fix`
- `attribute_backend_fix`
- `product_development_opportunity`
- `not_applicable`

当前产品不支持的需求不能落到 `bullet:N`、`image:N`、`aplus:N`。例如市场问“完整镜头盖/镜头保护盖”，但产品事实只有 raised camera edge，则不能写 `Full camera/lens protection proof` 作为 Listing 缺口；应改成真实可支持的 `raised camera edge protection proof`，或放入产品开发机会。

客户报告只展示一个 `Action Plan / 修改建议总表`。不要同时输出 `Fix Allocation Plan` 和 `Rewrite Action Plan` 两张重复表。标题、五点、图片、A+ 逐项审计表里用 `actionRef` 指向 Action Plan，不要重复一大段建议。

所有标题、五点、图片、A+ 逐项审计行都必须有：

- `coveredSignals`
- `missingSignals`
- `coverageStrength`
- `changeNeeded`
- `actionRef`
- `recommendedFix`

`coverageStrength` 只能是：

- `strong`
- `weak`
- `missing`
- `not_applicable`

修改分配必须落到具体资产：

- `title`
- `bullet:5`
- `image:3`
- `aplus:2`
- `aplus:2:slide:1`
- `attributes/backend`
- `product:development`

`recommendedFix` / `implementationDetail` 必须说人话，直接写替换句、插入句、图片 brief 或 A+ 模块 brief。不要写“buyer question -> direct answer -> proof”这类内部流程词。

## 最终客户交付

客户可见目录只允许保留以下五项标准交付：

- `01_采集数据.csv`
- `02_去重问题.csv`
- `03_Alexa提问与回答.csv`
- `04_内容分析.csv`
- `05_诊断评分优化报告.html`

只有用户明确指定 ASIN 并要求 COSMO 分析时，才增加：

- `06_指定ASIN_COSMO分析报告.html`

生成标准五项交付：

```shell
npm run delivery:finalize -- --source-dir "PROJECT_OUTPUT_DIR" --out-dir "PROJECT_OUTPUT_DIR/客户交付" --language zh-CN
```

增加指定 ASIN COSMO 报告：

```shell
npm run delivery:finalize -- --source-dir "PROJECT_OUTPUT_DIR" --out-dir "PROJECT_OUTPUT_DIR/客户交付" --language zh-CN --cosmo-report "COSMO_OUTPUT_DIR/asin_relation_product_report.html"
```

禁止在客户目录中再放 Markdown、单独模块评分表、逐图片/A+审计表、rewrite plan、manifest、截图、JSON 或重复 HTML。它们只能作为内部证据放入 `_internal` / `_evidence`。中文客户可见表头必须使用中文，脚本内部 key 可以保留英文。

## 参考

需要更细流程时读取 `references/workflow-cn.md`。

当用户要求 Listing 审计、打分、优化、改写、AI-ready Listing 总审计时，必须同时读取 `references/listing-auditor-cn.md`。
