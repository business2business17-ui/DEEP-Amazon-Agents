import fs from "node:fs";
import path from "node:path";

const ZH_LABELS = {
  recordType: "记录类型",
  sourceStage: "来源阶段",
  sourceFileName: "来源文件名",
  batchId: "批次ID",
  productName: "产品",
  platform: "采集平台",
  sourceType: "来源类型",
  postalCode: "邮编",
  keyword: "关键词",
  asin: "ASIN",
  asins: "ASIN列表",
  asinRank: "自然位排名",
  searchResultType: "搜索结果类型",
  searchPagePosition: "搜索页位置",
  sponsoredSkippedBefore: "前置广告位数量",
  rankEvidence: "自然位证据",
  productTitle: "商品标题",
  productUrl: "商品链接",
  question: "问题",
  askedQuestion: "实际提问",
  questionTheme: "问题主题",
  questionRole: "问题角色",
  totalOccurrenceCount: "总出现次数",
  keywordsWithQuestion: "出现关键词",
  sourceAsins: "来源ASIN",
  sourceTypes: "来源类型列表",
  sourceContextMode: "商品上下文模式",
  sourceContextAsin: "商品上下文ASIN",
  sourceContextUrl: "商品上下文链接",
  rufusAnswer: "Alexa for Shopping回答",
  recommendationEvidence: "推荐证据",
  purchaseCriteria: "购买决策点",
  userConcerns: "用户顾虑",
  buyerLanguage: "买家语言",
  sourceUrl: "来源链接",
  screenshotPath: "截图路径",
  collectedAt: "采集时间",
  answeredAt: "回答时间",
  status: "状态",
  error: "错误",
  priority: "优先级",
  module: "模块",
  titleText: "标题文本",
  bulletIndex: "五点序号",
  bulletText: "五点文本",
  imageIndex: "图片序号",
  moduleIndex: "模块序号",
  carouselSlideIndex: "轮播页序号",
  changeNeeded: "是否需要修改",
  coverage: "覆盖状态",
  coverageStrength: "覆盖强度",
  coveredSignals: "已覆盖信号",
  missingSignals: "缺失信号",
  signalName: "信号名称",
  actionId: "行动ID",
  capabilityFit: "产品能力匹配",
  productFactEvidence: "产品事实证据",
  actionBucket: "行动分类",
  targetAssetId: "目标资产",
  score: "得分",
  maxScore: "满分",
  scoreImpact: "分数影响",
  evidence: "证据",
  sourceEvidence: "来源证据",
  recommendedFix: "优化建议",
  implementationDetail: "执行细节",
  proofNeeded: "需要证据",
};

const COLLECTION_FILES = [
  "question_sources.csv",
  "keyword_asins.csv",
  "keyword_collection_summary.csv",
  "specified_asin_questions.csv",
];
const SYNTHESIS_FILES = [
  "natural_question_cleaned.csv",
  "natural_question_deduped.csv",
];
const ANSWER_FILES = [
  "rufus_deep_answers.csv",
  "answer_collection_table.csv",
];
const ANALYSIS_FILES = [
  "analysis_table.csv",
  "listing_scorecard.csv",
  "listing_module_scorecard.csv",
  "title_asset_audit.csv",
  "bullet_asset_audit.csv",
  "image_asset_audit.csv",
  "aplus_asset_audit.csv",
  "signal_action_matrix.csv",
  "coverage_signal_matrix.csv",
  "missing_signal_matrix.csv",
  "listing_rewrite_plan.csv",
  "listing_analysis_table.csv",
  "insight_analysis.csv",
];
const REPORT_FILES = [
  "listing_audit_report.html",
  "listing_visual_report.html",
  "index.html",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(value);
      value = "";
    } else if (ch === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += ch;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((cells) => cells.some((cell) => cell !== ""));
  if (!header) return [];
  const keys = header.map((key) => String(key).replace(/^\uFEFF/, ""));
  return body.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] ?? ""])));
}

function writeCsv(filePath, rows, preferredFields, language) {
  const fields = preferredFields;
  const labels = language.startsWith("zh") ? ZH_LABELS : {};
  const header = fields.map((field) => csvEscape(labels[field] ?? field)).join(",");
  const body = rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","));
  fs.writeFileSync(filePath, `\uFEFF${[header, ...body].join("\r\n")}\r\n`, "utf8");
}

function walkFiles(root) {
  const result = [];
  const skip = new Set(["node_modules", ".git", "客户交付", "client_delivery", "customer_delivery", "final_delivery"]);
  function visit(current) {
    const entries = fs.existsSync(current) ? fs.readdirSync(current, { withFileTypes: true }) : [];
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else result.push(fullPath);
    }
  }
  visit(root);
  return result;
}

function newest(paths) {
  return paths
    .filter(Boolean)
    .filter((item) => fs.existsSync(item))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? "";
}

function findFiles(root, names) {
  const all = walkFiles(root);
  return names.flatMap((name) => all.filter((filePath) => path.basename(filePath).toLowerCase() === name.toLowerCase()));
}

function newestPerFileName(root, names) {
  return names
    .map((name) => newest(findFiles(root, [name])))
    .filter(Boolean);
}

function explicitPath(args, key) {
  const value = args[key];
  return value ? path.resolve(String(value)) : "";
}

function readRowsFromFiles(files, stage) {
  return files.flatMap((filePath) => {
    const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
    return rows.map((row) => ({
      recordType: path.basename(filePath, ".csv"),
      sourceStage: stage,
      sourceFileName: path.basename(filePath),
      ...row,
    }));
  });
}

function safePrepareOutDir(outDir) {
  const leaf = path.basename(outDir).toLowerCase();
  const safeLeaves = new Set(["客户交付", "client_delivery", "customer_delivery", "final_delivery"]);
  if (fs.existsSync(outDir) && safeLeaves.has(leaf)) fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
}

function copyReport(source, target) {
  fs.copyFileSync(source, target);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const language = String(args.language || args["output-language"] || "zh-CN");
  const sourceDir = path.resolve(String(args["source-dir"] || args["project-dir"] || args.dir || "."));
  const outDir = path.resolve(String(args["out-dir"] || path.join(sourceDir, language.startsWith("zh") ? "客户交付" : "client_delivery")));
  const errors = [];

  const collectionFiles = Array.from(new Set([
    explicitPath(args, "collection-source"),
    ...newestPerFileName(sourceDir, COLLECTION_FILES),
  ].filter(Boolean)));
  const synthesisSource = newest([explicitPath(args, "synthesis-source"), ...findFiles(sourceDir, SYNTHESIS_FILES)]);
  const answerSource = newest([explicitPath(args, "answers-source"), ...findFiles(sourceDir, ANSWER_FILES)]);
  const analysisFiles = Array.from(new Set([
    explicitPath(args, "analysis-source"),
    ...newestPerFileName(sourceDir, ANALYSIS_FILES),
  ].filter(Boolean)));
  const reportSource = newest([explicitPath(args, "listing-report"), ...findFiles(sourceDir, REPORT_FILES)]);
  const cosmoReportSource = explicitPath(args, "cosmo-report") || explicitPath(args, "relation-report");

  if (!collectionFiles.length) errors.push("missing collection source table(s): question_sources.csv / keyword_asins.csv / specified_asin_questions.csv");
  if (!synthesisSource) errors.push("missing deduplicated question table: natural_question_cleaned.csv or natural_question_deduped.csv");
  if (!answerSource) errors.push("missing answer collection table: rufus_deep_answers.csv");
  if (!analysisFiles.length) errors.push("missing analysis table: analysis_table.csv, signal_action_matrix.csv, or listing audit asset tables");
  if (!reportSource) errors.push("missing Listing score optimization report: listing_audit_report.html");
  if (cosmoReportSource && (!fs.existsSync(cosmoReportSource) || path.extname(cosmoReportSource).toLowerCase() !== ".html")) {
    errors.push("invalid --cosmo-report: provide an existing COSMO analysis HTML report");
  }
  if (errors.length) {
    console.log(JSON.stringify({ ok: false, sourceDir, outDir, errors }, null, 2));
    process.exit(1);
  }

  safePrepareOutDir(outDir);
  const zh = language.startsWith("zh");
  const names = zh
    ? {
      collection: "01_采集数据.csv",
      synthesis: "02_去重问题.csv",
      answers: "03_Alexa提问与回答.csv",
      analysis: "04_内容分析.csv",
      report: "05_诊断评分优化报告.html",
      cosmoReport: "06_指定ASIN_COSMO分析报告.html",
    }
    : {
      collection: "01_collection_data.csv",
      synthesis: "02_deduplicated_questions.csv",
      answers: "03_alexa_questions_and_answers.csv",
      analysis: "04_content_analysis.csv",
      report: "05_diagnostic_score_optimization_report.html",
      cosmoReport: "06_target_asin_cosmo_analysis_report.html",
    };

  writeCsv(
    path.join(outDir, names.collection),
    readRowsFromFiles(collectionFiles, "collection"),
    ["recordType", "sourceStage", "sourceFileName", "productName", "platform", "sourceType", "postalCode", "keyword", "asin", "asinRank", "searchResultType", "searchPagePosition", "sponsoredSkippedBefore", "rankEvidence", "question", "productTitle", "sourceUrl", "collectedAt", "status"],
    language,
  );
  writeCsv(
    path.join(outDir, names.synthesis),
    readRowsFromFiles([synthesisSource], "dedupe"),
    ["recordType", "sourceStage", "productName", "question", "questionTheme", "questionRole", "totalOccurrenceCount", "keywordsWithQuestion", "asins", "sourceTypes", "status"],
    language,
  );
  writeCsv(
    path.join(outDir, names.answers),
    readRowsFromFiles([answerSource], "rufus_questions_and_answers"),
    ["recordType", "sourceStage", "productName", "question", "askedQuestion", "sourceContextMode", "sourceContextAsin", "rufusAnswer", "purchaseCriteria", "userConcerns", "buyerLanguage", "recommendationEvidence", "answeredAt", "status", "error"],
    language,
  );
  writeCsv(
    path.join(outDir, names.analysis),
    readRowsFromFiles(analysisFiles, "content_analysis"),
    ["recordType", "sourceStage", "sourceFileName", "productName", "module", "titleText", "bulletIndex", "bulletText", "imageIndex", "moduleIndex", "carouselSlideIndex", "questionTheme", "signalName", "actionId", "priority", "changeNeeded", "coverage", "coverageStrength", "capabilityFit", "productFactEvidence", "actionBucket", "targetAssetId", "score", "maxScore", "scoreImpact", "evidence", "sourceEvidence", "coveredSignals", "missingSignals", "recommendedFix", "implementationDetail", "proofNeeded", "status"],
    language,
  );
  copyReport(reportSource, path.join(outDir, names.report));
  if (cosmoReportSource) copyReport(cosmoReportSource, path.join(outDir, names.cosmoReport));

  const visibleFiles = fs.readdirSync(outDir).filter((name) => !name.startsWith("."));
  const expectedFiles = Object.values(names).filter((name) => name !== names.cosmoReport || cosmoReportSource);
  const internalDir = path.join(sourceDir, "_internal");
  fs.mkdirSync(internalDir, { recursive: true });
  fs.writeFileSync(path.join(internalDir, "customer_delivery_manifest.json"), `${JSON.stringify({
    ok: true,
    outputFolder: path.basename(outDir),
    files: visibleFiles,
    sources: {
      collectionFiles: collectionFiles.map((filePath) => path.basename(filePath)),
      synthesisSource: path.basename(synthesisSource),
      answerSource: path.basename(answerSource),
      analysisFiles: analysisFiles.map((filePath) => path.basename(filePath)),
      reportSource: path.basename(reportSource),
      cosmoReportSource: cosmoReportSource ? path.basename(cosmoReportSource) : "",
    },
    createdAt: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");

  const ok = visibleFiles.length === expectedFiles.length && expectedFiles.every((name) => visibleFiles.includes(name));
  console.log(JSON.stringify({ ok, outDir, files: visibleFiles }, null, 2));
  if (!ok) process.exit(1);
}

main();
