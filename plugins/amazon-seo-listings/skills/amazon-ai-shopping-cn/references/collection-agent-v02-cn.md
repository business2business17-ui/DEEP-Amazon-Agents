# Amazon AI Shopping Collection Agent 运行边界 v0.2

## 1. 自动推进规则

Agent 不应该每完成一步都等待用户说“继续”。

用户确认以下初始化信息后，Agent 应自动连续执行可确定步骤：

- 产品 / 品类。
- 采集关键词。
- 输出位置。
- 邮编策略：默认浏览器地址、单邮编或多邮编。
- 是否有指定 ASIN。
- CDP / Chrome / Amazon 登录可用。

允许暂停的情况只有：

- 输出位置未确认。
- 需要用户登录 Amazon、处理 CAPTCHA、切换账号或确认权限。
- 运行时提供的 Google / 飞书 / 本地写入目标缺失或失败。
- Amazon 页面结构变化导致采集失败。
- 用户明确要求先停下来审查结果。
- 采集质量不满足继续条件，例如 Top ASIN 没有 `rankEvidence`。

除此之外，采集完成后应自动进入去重、频次统计、交付表生成和可视化/报告准备。

## 2. 主流程中的“指定 ASIN”定义

主流程里的指定 ASIN 只表示：

> 采集这些 ASIN 商品页中自然出现的 Alexa for Shopping（Rufus）建议问题。

这些 ASIN 页面自然问题属于自然采集问题，必须参与后续去重和频次统计。

当前脚本：

```shell
node ./rufus_collect_specific_asin_questions.mjs --product "bluetooth headphones" --asins "B0EXAMPLE01|B0EXAMPLE02" --out-dir "output/bluetooth_headphones_specified_asin_questions"
```

## 3. 指定 ASIN COSMO 15维分析边界

15 维度 Relation Probe 不是自然问题。

它不进入主 Alexa for Shopping 采集流程，不参与自然问题去重，不参与自然问题频次统计。

它是独立的 ASIN-level COSMO 产品认知功能：

1. 搜索指定 ASIN。
2. 进入对应商品页。
3. 在商品页上下文里向 Amazon Alexa for Shopping（Rufus）主动提问 15 个 relation fields。
4. 生成独立 ASIN 报告。

当前脚本：

```shell
node ./asin_relation_probe_report.mjs --product "bluetooth headphones" --asins "B0EXAMPLE01" --out-dir "output/bluetooth_headphones_asin_relation_probe_report"
```

输出：

- `asin_relation_probe_answers.csv`
- `asin_relation_product_report.html`（客户可视化 COSMO 15维分析报告）
- `_evidence/`（截图、调试 JSON 与 manifest，不作为客户主文件）

## 4. 旧 Relation Probe 问题生成器

`rufus_build_relation_probe_questions.mjs` 只允许生成独立 probe 问题表。

禁止使用 `--merge-with` 把它合并进自然问题队列。脚本现在会直接拒绝该参数。

## 5. 去重规则

参与自然问题去重的数据包括：

- 搜索页自然出现的问题。
- Top organic ASIN 商品页自然出现的问题。
- 用户指定 ASIN 商品页自然出现的问题。

不参与自然问题去重的数据包括：

- 15 维度主动提问。
- ASIN relation probe answers。
- 人工补写的问题。

## 6. 交付口径

对客户解释时使用这句话：

> 主流程回答“买家和 Amazon 页面自然暴露了哪些问题”；指定 ASIN COSMO 15维报告回答“Amazon AI 如何理解这个具体产品的类型、用途、场景、人群和动机”。两者证据不同，所以分开交付。

公开包和客户文件不得保存飞书 Base/App Token、Table/View ID、应用密钥、Webhook、客户链接、本地绝对路径或截图路径；这些信息只在运行时使用。
