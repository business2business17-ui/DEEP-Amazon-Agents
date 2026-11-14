# Listing AI-ready 审计与优化交付 v0.2.27

## 核心判断

Listing 审计不是把 Alexa for Shopping（Rufus）自然问题里出现过的每个需求都塞进 Listing 改写。审计必须先看产品事实，再决定这个信号属于 Listing 表达问题、视觉证明问题、属性/后台词问题，还是产品开发机会。

客户主交付必须是 `listing_audit_report.html`。Markdown 只能作为内部草稿或调试材料，不能作为客户主报告。

## 先做产品能力边界

每个信号进入优化前，必须先做 `capabilityFit` 判断：

- `supported`：当前产品真实支持，可以进入 Listing 文案/图片/A+/属性优化。
- `weak`：当前产品部分支持，Listing 只能按真实能力弱化表达，不能扩大 claim。
- `unsupported`：当前产品不支持，只能进入产品开发机会，不能写成 Listing 改写。
- `unknown`：当前证据不足，需要补产品事实或人工确认。
- `not_applicable`：对当前产品不适用，不进入 Listing 动作。

同时必须记录 `productFactEvidence`。没有产品事实证据，不允许把市场需求直接改写成 Listing claim。

例子是通用原则，不是只针对手机壳：如果市场问题问的是“完整镜头盖/镜头保护盖”，但当前产品事实只有 raised camera edge / raised lip / raised bezel，那么不能写 `Full camera/lens protection proof` 作为 Listing 缺口。应改成：

- Listing 可优化信号：`raised camera edge protection proof`
- `capabilityFit=weak` 或 `supported`
- `actionBucket=listing_content_fix` 或 `visual_proof_fix`

如果需求确实是物理镜头盖、镜头保护片、全包镜头结构，而产品没有这个结构，则：

- `capabilityFit=unsupported`
- `actionBucket=product_development_opportunity`
- 不分配到 `bullet:N`、`image:N`、`aplus:N`
- 不写进 Listing 改写文案

## 页面模块范围

- `title`：标题必须单独审计，判断是否表达品类、核心规格、兼容性、差异化和高频购买信号。
- `bullets`：五点必须按页面顺序逐条审计，判断每一条回答了哪些买家问题、哪些信号强/弱/缺失。
- `images`：图片必须按 Amazon 图片栈顺序逐张审计。每张都要说明图里是什么、覆盖了什么、缺了什么、怎么改。
- `a_plus`：A+ 必须审计文本和图片。不能只抓 A+ 文本；有轮播/滑动卡片/多 slide 时，必须按 slide 展开。
- `attributes` / `backend_keywords`：属性、规格、后台词用于补齐材质、尺寸、型号、数量、兼容性、同义词、场景词、搭配词等可检索信号。

Q&A 不再作为 Listing 内容模块、打分模块或改写模块。页面出现 Q&A / Looking for specific info / Ask Alexa，只能作为内部页面状态备注。

## 客户报告结构

HTML 主报告最多保留 5 个主章节：

1. 总览：总分、证据等级、P0 数量、最大风险。
2. 已覆盖信号地图：标题、五点、图片、A+ 各自覆盖了哪些信号，并标记强/弱覆盖。
3. 信号分流板：支持当前产品的 Listing 缺口、弱覆盖信号、产品开发机会分开列。
4. 修改建议总表 / Action Plan：一个表解决“分配到哪里”和“具体怎么改”，不要再拆成 Fix Allocation Plan + Rewrite Action Plan 两张重复表。
5. 逐项审计索引：标题、五点、图片、A+ 逐项审计只显示状态和 `actionRef`，不重复长建议。

客户报告里不要同时出现两张大表：`Fix Allocation Plan` 和 `Rewrite Action Plan`。如果需要保留英文标题，只用一个 `Action Plan`。

## 信号强度

所有审计都必须区分 `coverageStrength`：

- `strong`：当前 Listing 已经清楚表达，并且有文字/图片/A+证据支撑。
- `weak`：当前 Listing 已经出现同义或间接表达，但不够直给、不够证明化、不够视觉化，应该在原位置加强。
- `missing`：当前 Listing 没有可识别的同义表达。
- `not_applicable`：该信号对当前产品不适用。

不要只做关键词精确匹配，要按语义族识别信号。例如 raised edge / raised lip / camera edge / camera area / lens scratches / guards against direct damage 都属于 camera/lens raised-edge protection 语义族。当前文案已有这类表达时，不能判成完全缺失；最多判为 `weak`，然后建议在原资产上加强。

## 动作分类

每条动作必须有 `actionBucket`：

- `listing_content_fix`：标题/五点/A+ 文案可真实表达。
- `visual_proof_fix`：图片或 A+ 视觉证明可真实表达。
- `attribute_backend_fix`：属性、规格、后台词补充。
- `product_development_opportunity`：买家需求存在，但当前产品不支持，不能改 Listing claim。
- `not_applicable`：不适用，无需动作。

只有 `listing_content_fix`、`visual_proof_fix`、`attribute_backend_fix` 可以落到 Listing 资产。`product_development_opportunity` 不得落到 `bullet:N`、`image:N`、`aplus:N`。

## 具体落点

Listing 可执行动作必须有 `targetAssetId`：

- `title`
- `bullet:5`
- `image:3`
- `aplus:2`
- `aplus:2:slide:1`
- `attributes/backend`

产品开发机会使用 `targetAssetId=product:development`，或只在产品开发机会板块展示。

如果一个信号需要文案和图片一起补，拆成两条动作：一条指向 `bullet:5`，一条指向 `image:3`。不要写 `bullets + images`、`A+ + images` 这种泛位置。

## 单一 Action Plan

`signal_action_matrix.csv` 和 `listing_rewrite_plan.csv` 必须用同一个 `actionId` 串起来。客户报告只展示一个 Action Plan，字段建议：

- `actionId`
- `signalName`
- `coverageStrength`
- `capabilityFit`
- `productFactEvidence`
- `actionBucket`
- `targetAssetId`
- `actionType`
- `implementationDetail`
- `proofNeeded`
- `priority`
- `scoreImpact`

`implementationDetail` 必须说人话，直接写替换句、插入句、图片 brief 或 A+ 模块 brief。不要写“buyer question -> direct answer -> proof”这类内部流程词，也不要只写“加强证明”“补视觉”“优化表达”。

## 逐项审计表

`title_asset_audit.csv`、`bullet_asset_audit.csv`、`image_asset_audit.csv`、`aplus_asset_audit.csv` 都必须保留逐项行。不需要修改的行也要出现。

逐项审计表必须包含：

- 当前文本或图片/A+描述
- `coveredSignals`
- `missingSignals`
- `coverageStrength`
- `changeNeeded`
- `actionRef`
- `recommendedFix`

这里的 `recommendedFix` 只能写短说明，例如“无需修改/保持”或“见 Action A-03”。详细改法放到 Action Plan，不要在每个 bullet/image/A+ 行重复一大段建议。

## 图片逐张审计

必须先打开当前 ASIN 商品页，读取该链接实际展示的图片栈数量 N，再输出 N 条图片审计行。N 来自当前页面，不来自用户口头假设。

每张图都必须有内容描述、覆盖信号、缺失信号、`coverageStrength`、`changeNeeded`、`actionRef`。不需要修改的图片也必须保留行。

## A+ 图文审计

Amazon 仍有 A+ Content，但不同 ASIN、品牌权限、类目和页面实验可能导致 A+ 不展示。审计器不能假设，也不能只抓文字。

如果某个 A+ 模块是轮播、横向滑动、多卡片或多 slide，必须点击/滚动/切换并输出 `carouselSlideIndex=1..carouselSlideCount`。未发现 A+ 时，也要输出一行 `aplusStatus=not_found`。

## 打分维度

总分固定为 100 分，必须在 `listing_scorecard.csv` 中逐维度展示：

| dimension | maxScore |
|---|---:|
| Use Case Coverage | 20 |
| Audience Fit | 15 |
| Buying Factor Coverage | 20 |
| Positioning Clarity | 15 |
| Shopper Language Fit | 15 |
| Answer Structure Clarity | 15 |

当前产品不支持的市场需求不能当作 Listing 文案缺失直接扣分。它可以进入产品开发机会；只有产品支持但 Listing 没表达、表达弱、缺视觉证明、缺属性/后台词时，才作为 Listing Fit 的扣分依据。若 Listing 明确承诺了产品不支持的能力，则按 claim contradiction 扣分。

## 输出结构

客户看到的顶层交付只允许五项标准结果：

```text
客户交付/
  01_采集数据.csv
  02_去重问题.csv
  03_Alexa提问与回答.csv
  04_内容分析.csv
  05_诊断评分优化报告.html
```

用户明确要求指定 ASIN COSMO 分析时，才允许增加 `06_指定ASIN_COSMO分析报告.html`。逐模块评分表、逐项审计 CSV、rewrite plan、Markdown、JSON、截图与 manifest 都是内部证据，不得散落在客户目录。

正式交付前必须运行：

```shell
npm run listing:validate -- --dir "OUTPUT_DIR"
npm run delivery:finalize -- --source-dir "PROJECT_OUTPUT_DIR" --out-dir "PROJECT_OUTPUT_DIR/客户交付" --language zh-CN
```

`ok:false` 时不能交付。常见失败包括：

- 缺 `listing_audit_report.html`
- 图片没有按当前链接实际图片数逐张审计
- A+ 只抓文本，没有图片证据
- 把 Q&A 当成 Listing 内容模块、评分模块或改写分配模块
- 没有产品能力边界 / 产品开发机会分流
- 把当前产品不支持的能力写成 Listing 改写
- 把已有语义证据的信号判成完全缺失
- 同时输出 Fix Allocation Plan 和 Rewrite Action Plan 两张重复表
- 逐项审计表没有 `actionRef`
