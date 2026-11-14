# 中文 Amazon AI Shopping Agent v0.2.30 工作流参考

## 1. 输入确认

正式运行前必须确认：

- 产品名称：具体产品或品类。
- 关键词列表：用 `|`、逗号或换行分隔。
- 站点和邮编：支持一个或多个邮编；未提供时使用浏览器当前配送位置。
- 输出位置：默认本地交付包；飞书或 Google Sheets 目标只在运行时接收，不得写入公开包。
- 采集数量：默认每个关键词自然位 Top 3。
- 是否采集自然位 Top ASIN 商品页自然问题：默认采集。
- 是否有指定 ASIN 商品页自然问题要额外采集。
- 是否需要指定 ASIN COSMO 15维分析报告；默认不生成。

不要把“竞品 ASIN”作为初始化必填项。竞品/样本 ASIN 默认从关键词搜索结果自然位发现。

## 2. 自动推进规则

初始化确认后，agent 应自动连续执行确定性步骤：

1. CDP preflight。
2. Amazon 页面打开和登录状态检查。
3. 关键词自然问题采集。
4. 自然位 Top ASIN 解析和广告位跳过审计。
5. 自然位 ASIN 商品页自然问题采集。
6. 指定 ASIN 商品页自然问题采集，如果用户提供。
7. 自然问题去重/清洗和 manifest 输出。
8. 使用 `natural_question_cleaned.csv` 或 `natural_question_deduped.csv` 逐条向 Alexa for Shopping（Rufus）提问，采集完整回答和推荐商品证据。
9. 内容分析、Listing 诊断评分和优化建议。
10. 运行校验并生成五项标准客户交付；只有用户明确要求时增加指定 ASIN COSMO 报告。

不要在每一步后问“是否继续”。只有遇到登录、验证码、授权、输出目标不明确、页面识别失败、自然位证据不足或用户主动暂停时才停下来。

## 3. CDP 命令

```shell
node scripts/rufus_cdp_preflight.mjs
```

如果 CDP 未启动：

```shell
node scripts/rufus_cdp_preflight.mjs --launch-dedicated-profile
```

## 4. 自然采集命令

```shell
node scripts/rufus_collect_pipeline_cn.mjs --product "PRODUCT_NAME" --keywords "keyword one|keyword two" --postal-codes "94142|10001" --top-asins 3 --out-dir "output/PROJECT_NAME"
```

自然位 Top ASIN 必须来自 `amazon_search_rank_resolver.mjs`，并保留：

- `searchResultType=organic`
- `keywordRank` / `asinRank`
- `searchPagePosition`
- `sponsoredSkippedBefore`
- `rankEvidence`
- `search_rank_audit.json`

缺少 `rankEvidence` 的 ASIN 不能当作自然位 Top 3 样本进入分析或 Listing 打分。

## 5. 指定 ASIN 自然问题采集

指定 ASIN 在主流程里表示“采集这个 ASIN 商品页自然建议问题”，不是 15 维 relation probe。

```shell
node scripts/rufus_collect_specific_asin_questions.mjs --product "PRODUCT_NAME" --asins "B0EXAMPLE01|B0EXAMPLE02" --out-dir "output/PROJECT_specified_asin_questions"
```

这些问题要并入自然问题去重和频次统计。

## 6. 自然问题去重

```shell
node scripts/rufus_dedupe_natural_questions.mjs --product "PRODUCT_NAME" --question-sources "output/PROJECT_NAME/question_sources.csv" --specified-asin-questions "output/PROJECT_specified_asin_questions/specified_asin_questions.csv" --out-dir "output/PROJECT_natural_dedupe"
```

Relation Probes 不得进入自然问题队列。

## 7. 自然问题回答采集

```shell
npm run answers:collect -- --product "PRODUCT_NAME" --cleaned-questions "output/PROJECT_natural_cleaned/natural_question_cleaned.csv" --out-dir "output/PROJECT_natural_answers" --output-language zh-CN
```

规则：

- 有 ASIN 的问题必须打开对应 ASIN 商品页再问。
- 多 ASIN 问题必须展开成每个 ASIN 一条任务。
- 无 ASIN fallback 问题必须使用英文品类/关键词上下文，不把中文产品名塞进英文 Alexa for Shopping 问题。
- 缺产品上下文反问、UI 噪音、串题答案都必须 failed。

## 8. 指定 ASIN COSMO 15维分析报告

只有用户明确要求对确切 ASIN 做 COSMO/15维分析时运行：

```shell
node scripts/asin_relation_probe_report.mjs --product "PRODUCT_NAME" --asins "B0EXAMPLE01" --out-dir "output/PROJECT_asin_relation_probe_report"
```

Relation Probes 不进入主流程、不参与去重、不影响自然问题频次。

采集结束后继续自动处理 `_evidence/relation_probe_semantic_analysis.json`，不等待下一条“分析”指令。把全部有效维度的 `displayTags` 和 `displayFacts` 改写成目标语言并把 `status` 设为 `ready`，然后携带 `--analysis-json` 生成正式 HTML。中文使用 `办公（office）` 形式保留原始词，品牌、型号和标准名例外；英文报告不得出现中文。报告根部只保留 HTML 与 `asin_relation_probe_answers.csv`，截图、调试 JSON、语义 JSON 和 manifest 进入 `_evidence`。交付前必须运行 `npm run relation:validate -- --dir "OUTPUT_DIR"`。

## 9. Listing 审计 v0.2.27

Listing 审计必须覆盖：

- 标题
- 五点
- 图片：按当前 ASIN 页面实际图片数逐张审计。
- A+：文本和图片都审；轮播/滑动/多 slide 必须逐页展开。
- 属性/规格
- 后台词

Q&A 不作为 Listing 模块、打分模块或改写模块。

每个标题/五点/图片/A+ 审计行必须有：

- `coveredSignals`
- `missingSignals`
- `coverageStrength`
- `changeNeeded`
- `actionRef`
- `recommendedFix`

`coverageStrength` 取值：

- `strong`
- `weak`
- `missing`
- `not_applicable`

不要只做关键词精确匹配，要做语义族识别。当前文案已经出现等价表达时，不能判为完全缺失。例如 raised edge / camera area / lens scratches / guards against direct damage 属于 camera/lens protection 语义族，最多判 `weak`，然后在原资产上加强。

修改分配必须落到具体 `targetAssetId`：

- `title`
- `bullet:5`
- `image:3`
- `aplus:2`
- `aplus:2:slide:1`
- `attributes/backend`
- `product:development`

不要写 `bullets + images`、`A+ + images` 这种泛分配。一个信号需要文案和图片一起补时，拆成两条动作。

`recommendedFix` / `implementationDetail` 必须是可执行的人话：替换句、插入句、图片 brief、A+ 模块 brief。不要写内部流程词。

新增产品能力边界：

- 不是所有采集到的问题都能变成 Listing 修改。
- 每个信号必须先判断 `capabilityFit`：`supported` / `weak` / `unsupported` / `unknown` / `not_applicable`。
- 每个动作必须有 `actionBucket`：`listing_content_fix` / `visual_proof_fix` / `attribute_backend_fix` / `product_development_opportunity` / `not_applicable`。
- 当前产品不支持的需求不能写成 Listing claim，必须进入产品开发机会。
- 例如市场问“完整镜头盖/镜头保护盖”，但产品事实只有 raised camera edge，则不能把 `Full camera/lens protection proof` 当成 Listing 缺口；应改成真实支持的 `raised camera edge protection proof`，或归入产品开发机会。

报告结构只保留一个 `Action Plan / 修改建议总表`。不要同时输出 `Fix Allocation Plan` 和 `Rewrite Action Plan` 两张重复表。逐项审计行里用 `actionRef` 指向 Action Plan。

## 10. Listing 校验

生成 Listing 审计后必须运行：

```shell
npm run listing:validate -- --dir "OUTPUT_DIR"
```

`ok:false` 时不能作为正式交付。

## 11. 最终客户交付

客户目录只允许五项标准交付：

- `01_采集数据.csv`
- `02_去重问题.csv`
- `03_Alexa提问与回答.csv`
- `04_内容分析.csv`
- `05_诊断评分优化报告.html`

只有明确要求指定 ASIN COSMO 分析时，增加：

- `06_指定ASIN_COSMO分析报告.html`

生成：

```shell
npm run delivery:finalize -- --source-dir "PROJECT_OUTPUT_DIR" --out-dir "PROJECT_OUTPUT_DIR/客户交付" --language zh-CN
```

增加 COSMO 报告时显式传入 `--cosmo-report ".../asin_relation_product_report.html"`。不得自动搜索或夹带历史 COSMO 报告。

中间 manifest、debug JSON、截图、rank audit、failed/recommended 明细、原始 answer JSON、模块评分表、逐项审计表和 rewrite plan 只能放在工作目录、`_internal/` 或 `_evidence/`，不能散落在客户目录。客户 CSV 不得包含本地绝对路径、截图路径、飞书凭据、Base/App Token、Table/View ID 或客户链接。
