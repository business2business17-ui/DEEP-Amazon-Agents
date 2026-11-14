# 15维报告语言归一化规则

## 强制流程

运行 `asin:relation-report` 后，采集脚本只完成原始回答 CSV，并在 `_evidence/relation_probe_semantic_analysis.json` 生成待处理任务。不要停下来询问用户是否继续。

1. 读取语义 JSON 中每个维度的 `sourceTags` 和 `sourceFacts`。
2. 填写 `displayProductTitle`、全部有效维度的 `displayTags` 和 `displayFacts`。
3. 把根级 `status` 改为 `ready`。
4. 运行：

```shell
npm run relation:visualize -- --csv "OUTPUT_DIR/asin_relation_probe_answers.csv" --analysis-json "OUTPUT_DIR/_evidence/relation_probe_semantic_analysis.json" --language zh-CN --out "OUTPUT_DIR/asin_relation_product_report.html"
```

5. 运行 `npm run relation:validate -- --dir "OUTPUT_DIR"`。只有 `ok:true` 才能交付。

## 中文报告

- 默认可见内容以自然中文表达，不复制英文整句。
- 标签格式优先使用 `中文（source English）`，例如 `办公（office）`、`居家（home）`、`度假（vacation）`。
- 品牌、型号、ASIN、标准和缩写可以保留，例如 `iPhone 17 Pro Max`、`MagSafe`、`USB-C`、`TPU`。
- 产品标题必须是中文产品名，品牌和型号可以保留。
- `displayFacts` 每条都必须是完整中文事实，同时保留必要型号和专名。
- 原始英文问题与回答只出现在折叠的“原始英文证据”区。
- 不得把 standalone English 场景词、英文人格名称或整句英文放在默认可见区。

## 英文报告

- `displayProductTitle`、`displayTags`、`displayFacts`、原问题和原回答全部使用英文。
- 最终 HTML 中不得出现任何中文字符。

## 证据边界

- 只重写表达，不增加 `sourceFacts` 没有支持的能力、场景、人群或结论。
- 不确定内容标记为证据不足，不猜测。
- 标签必须来自同维度的完整事实，不能使用通用 n-gram 补位。
