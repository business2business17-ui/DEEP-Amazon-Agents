export const ZH_COLUMN_LABELS = {
  batchId: "批次ID",
  productName: "产品",
  platform: "采集平台",
  sourceType: "来源类型",
  postalCode: "邮编",
  locationSetStatus: "邮编设置状态",
  locationEvidence: "邮编证据",
  keyword: "关键词",
  keywords: "关键词列表",
  asinRank: "自然位排名",
  keywordRank: "自然位排名",
  searchResultType: "搜索结果类型",
  searchPagePosition: "搜索页卡片位置",
  sponsoredSkippedBefore: "前置广告位数量",
  rankEvidence: "排名证据",
  asin: "ASIN",
  asins: "ASIN列表",
  productTitle: "商品标题",
  productUrl: "商品链接",
  question: "问题",
  questions: "问题列表",
  questionIntentKey: "问题意图键",
  questionTheme: "问题主题",
  questionRole: "问题角色",
  questionSource: "问题来源",
  relatedOriginalQuestions: "关联原始问题",
  specialSignal: "特殊信号",
  sourceUrl: "来源链接",
  screenshotPath: "截图路径",
  collectedAt: "采集时间",
  createdAt: "创建时间",
  status: "状态",
  searchQuestionCount: "搜索页问题数",
  topAsinCount: "自然位ASIN数量",
  topAsins: "自然位ASIN列表",
  relationField: "关系字段",
  relationKey: "关系键",
  relationFieldZh: "关系字段中文名",
  relationFieldGroup: "关系字段组",
  relationDefinitionZh: "关系定义",
  relationAskFocusZh: "提问关注点",
  relationQuestionType: "关系问题类型",
  relationPromptIndex: "关系问题序号",
  relationPriority: "关系优先级",
  relationScope: "关系适用范围",
  relationScopeConfidence: "范围置信度",
  probeType: "探针类型",
  asinSearchUrl: "ASIN搜索链接",
  asinResolvedUrl: "ASIN解析链接",
  amazonAiAnswer: "Amazon AI回答",
  answerStatus: "回答状态",
  answerExtractionStatus: "回答抽取状态",
  answerContainerSelector: "回答容器选择器",
  answerTextSource: "回答文本来源",
  isValidAnswer: "是否有效回答",
  failureReason: "失败原因",
  answerQualityStatus: "答案质量状态",
  answerQualityReason: "答案质量原因",
  answerCompletionStatus: "生成完成状态",
  answerStablePolls: "稳定轮询次数",
  answerPollCount: "总轮询次数",
  answerLength: "回答长度",
  answeredAt: "回答时间",
  fullQuestion: "完整问题",
  answerShortSummary: "答案简短摘要",
  extractedTags: "提取标签",
  evidenceExcerpt: "证据摘录",
  specifiedAsinSourceCount: "指定ASIN来源数",
  postalCodes: "邮编列表",
  sourceTypes: "来源类型列表",
  sampleSpecifiedAsinQuestions: "指定ASIN样例问题",
  sourceFile: "来源文件",
  sourceFiles: "来源文件列表",
  totalOccurrenceCount: "总出现次数",
  searchSourceCount: "搜索页来源数",
  asinSourceCount: "ASIN页来源数",
  keywordCoverageCount: "关键词覆盖数",
  asinCoverageCount: "ASIN覆盖数",
  sampleSearchQuestions: "搜索页样例问题",
  sampleAsinQuestions: "ASIN页样例问题",
};

const ZH_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(ZH_COLUMN_LABELS).map(([key, label]) => [label, key]),
);

function normalizeColumns(columns) {
  return columns.map((column) => {
    if (typeof column === "string") {
      return { key: column, label: ZH_COLUMN_LABELS[column] ?? column };
    }
    return {
      key: column.key,
      label: column.label ?? ZH_COLUMN_LABELS[column.key] ?? column.key,
    };
  });
}

export function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(value);
      value = "";
    } else if (ch === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((cells) => cells.some((cell) => cell !== ""));
  if (!header) return [];
  const keys = header.map((label) => {
    const cleanLabel = String(label).replace(/^\ufeff/, "");
    return ZH_LABEL_TO_KEY[cleanLabel] ?? cleanLabel;
  });
  return body.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] ?? ""])));
}

export function writeCsv(filePath, columns, rows, fsModule) {
  const normalized = normalizeColumns(columns);
  const content = [normalized.map((column) => csvEscape(column.label)).join(",")]
    .concat(rows.map((row) => normalized.map((column) => csvEscape(row[column.key])).join(",")))
    .join("\r\n");
  fsModule.writeFileSync(filePath, `\ufeff${content}\r\n`, "utf8");
}

export function appendCsv(filePath, columns, row, fsModule) {
  const normalized = normalizeColumns(columns);
  const expectedHeader = normalized.map((column) => csvEscape(column.label)).join(",");
  if (!fsModule.existsSync(filePath)) {
    fsModule.writeFileSync(filePath, `\ufeff${expectedHeader}\r\n`, "utf8");
  }
  fsModule.appendFileSync(filePath, `${normalized.map((column) => csvEscape(row[column.key])).join(",")}\r\n`, "utf8");
}

export function writeDynamicCsv(filePath, rows, preferredFields, fsModule) {
  const fields = [
    ...preferredFields,
    ...Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((field) => !preferredFields.includes(field)),
  ];
  writeCsv(filePath, fields, rows, fsModule);
}
