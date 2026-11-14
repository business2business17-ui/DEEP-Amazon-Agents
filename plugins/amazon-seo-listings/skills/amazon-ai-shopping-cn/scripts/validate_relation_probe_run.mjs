#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ZH = {
  relationField: "\u5173\u7cfb\u5b57\u6bb5",
  amazonAiAnswer: "Amazon AI\u56de\u7b54",
  isValidAnswer: "\u662f\u5426\u6709\u6548\u56de\u7b54",
  failureReason: "\u5931\u8d25\u539f\u56e0",
  answerStatus: "\u56de\u7b54\u72b6\u6001",
  answerExtractionStatus: "\u56de\u7b54\u62bd\u53d6\u72b6\u6001",
  answerCompletionStatus: "\u751f\u6210\u5b8c\u6210\u72b6\u6001",
  answerLength: "\u56de\u7b54\u957f\u5ea6",
  screenshotPath: "\u622a\u56fe\u8def\u5f84",
  status: "\u72b6\u6001",
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const value = String(text ?? "").replace(/^\uFEFF/, "");
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const next = value[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v !== ""));
}

function rowValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && String(row[key]).trim() !== "") return String(row[key]).trim();
  }
  return "";
}

function isYes(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "yes" || normalized === "y" || normalized === "\u662f" || normalized === "true";
}

function isNo(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "no" || normalized === "n" || normalized === "\u5426" || normalized === "false";
}

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function hasCjk(value) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(String(value ?? ""));
}

function isProtectedEnglishEntity(value) {
  const text = String(value ?? "").trim();
  return /\b(?:iPhone|iPad|MacBook|Android|MagSafe|Bluetooth|Wi-?Fi|USB(?:-C)?|TPU|ASIN|Alexa|Rufus|Amazon|N\d{2})\b/i.test(text)
    || /\b[A-Z0-9]{4,}\b/.test(text)
    || /\b[A-Za-z]+\s*[A-Z]?\d+[A-Za-z0-9-]*\b/.test(text);
}

function addFailure(failures, rowIndex, relationField, type, details = {}) {
  failures.push({ rowIndex, relationField: relationField || "unknown", type, ...details });
}

const args = parseArgs(process.argv.slice(2));
const input = args.csv || args.dir || args.outDir || args["out-dir"];
if (!input) {
  console.error("Usage: node scripts/validate_relation_probe_run.mjs --dir output/report_dir");
  process.exit(2);
}

const stat = fs.existsSync(input) ? fs.statSync(input) : null;
const csvPath = stat?.isDirectory()
  ? path.join(input, "asin_relation_probe_answers.csv")
  : input;
if (!fs.existsSync(csvPath)) {
  console.error(JSON.stringify({ ok: false, reason: "csv_missing", csvPath }, null, 2));
  process.exit(1);
}

const parsed = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = parsed[0] || [];
const rows = parsed.slice(1).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] || ""])));
const explicitExpectedRows = args["expected-rows"] || args["expected-relations"];
const asinCount = Math.max(1, new Set(rows.map((row) => rowValue(row, ["asin", "ASIN"])).filter(Boolean)).size);
const expectedRows = Math.max(0, Number(explicitExpectedRows || 15 * asinCount));
const minAnswerLength = Math.max(0, Number(args["min-answer-length"] || 20));
const baseDir = fs.statSync(csvPath).isFile() ? path.dirname(csvPath) : process.cwd();
const visualReportPath = path.join(baseDir, "asin_relation_product_report.html");
const failures = [];

if (!fs.existsSync(visualReportPath)) {
  failures.push({ type: "visual_report_missing", visualReportPath });
} else {
  const visualReport = fs.readFileSync(visualReportPath, "utf8");
  if (!visualReport.includes('data-report-type="asin-relation-product-report"')) {
    failures.push({ type: "visual_report_type_invalid", visualReportPath });
  }
  if (!visualReport.includes('data-report-summary-mode="dimension-facts"')) {
    failures.push({ type: "visual_report_uses_raw_answer_excerpt_instead_of_dimension_facts", visualReportPath });
  }
  if (!visualReport.includes('data-semantic-status="ready"')) {
    failures.push({ type: "visual_report_semantic_normalization_not_ready", visualReportPath });
  }
  const reportLanguage = visualReport.match(/data-report-language="([^"]+)"/)?.[1] || "";
  if (!/^(?:zh-CN|en)$/.test(reportLanguage)) {
    failures.push({ type: "visual_report_language_missing_or_invalid", reportLanguage });
  }
  const reportFields = [...visualReport.matchAll(/data-relation-field="([^"]+)"/g)].map((match) => match[1]);
  const expectedFields = ["is_a", "used_as", "used_on", "used_in_location", "used_for_func", "capable_of", "used_for_event", "used_to", "used_with", "used_by", "xInterest_in", "xIs_a", "xWant", "used_for_audience", "used_in_body"];
  const missingReportFields = expectedFields.filter((field) => !reportFields.includes(field));
  if (missingReportFields.length) {
    failures.push({ type: "visual_report_relation_fields_missing", missingReportFields });
  }
  if (reportFields.length !== expectedRows) {
    failures.push({ type: "visual_report_relation_count_mismatch", expectedRows, actualReportFields: reportFields.length });
  }
  const factListCount = (visualReport.match(/class="fact-list"/g) || []).length;
  if (factListCount !== expectedRows) {
    failures.push({ type: "visual_report_dimension_fact_lists_missing", expectedRows, factListCount });
  }
  const displayTags = [...visualReport.matchAll(/data-display-tag="true">([^<]*)</g)].map((match) => decodeHtml(match[1]).trim()).filter(Boolean);
  const displayFacts = [...visualReport.matchAll(/data-display-fact="true">([^<]*)</g)].map((match) => decodeHtml(match[1]).trim()).filter(Boolean);
  const displayTitles = [...visualReport.matchAll(/data-display-product-title="true">([^<]*)</g)].map((match) => decodeHtml(match[1]).trim()).filter(Boolean);
  if (displayFacts.length < expectedRows) failures.push({ type: "visual_report_display_facts_incomplete", expectedMinimum: expectedRows, actual: displayFacts.length });
  if (reportLanguage === "zh-CN") {
    const nonChineseFacts = displayFacts.filter((fact) => !hasCjk(fact));
    const invalidChineseTags = displayTags.filter((tag) => !hasCjk(tag) && !isProtectedEnglishEntity(tag));
    const unwrappedSourceTerms = displayTags.filter((tag) => hasCjk(tag) && /[A-Za-z]/.test(tag) && !/[（][^）]*[）]/.test(tag) && !isProtectedEnglishEntity(tag));
    const nonChineseTitles = displayTitles.filter((title) => !hasCjk(title));
    if (nonChineseFacts.length) failures.push({ type: "chinese_report_contains_unlocalized_display_facts", samples: nonChineseFacts.slice(0, 8) });
    if (invalidChineseTags.length) failures.push({ type: "chinese_report_contains_standalone_english_tags", samples: invalidChineseTags.slice(0, 8) });
    if (unwrappedSourceTerms.length) failures.push({ type: "chinese_report_source_terms_not_in_parentheses", samples: unwrappedSourceTerms.slice(0, 8) });
    if (nonChineseTitles.length) failures.push({ type: "chinese_report_product_title_not_localized", samples: nonChineseTitles.slice(0, 3) });
  }
  if (reportLanguage === "en" && hasCjk(visualReport)) {
    failures.push({ type: "english_report_contains_cjk_characters" });
  }
}

if (expectedRows > 0 && rows.length !== expectedRows) {
  failures.push({
    type: "row_count_mismatch",
    expectedRows,
    actualRows: rows.length,
  });
}

for (const [index, row] of rows.entries()) {
  const rowIndex = index + 2;
  const relationField = rowValue(row, ["relationField", ZH.relationField]);
  const answer = rowValue(row, ["amazonAiAnswer", ZH.amazonAiAnswer, "Amazon AI answer"]);
  const valid = rowValue(row, ["isValidAnswer", ZH.isValidAnswer, "Valid answer"]);
  const failureReason = rowValue(row, ["failureReason", ZH.failureReason, "Failure reason"]);
  const answerStatus = rowValue(row, ["answerStatus", ZH.answerStatus, "Answer status"]);
  const extractionStatus = rowValue(row, ["answerExtractionStatus", ZH.answerExtractionStatus, "Answer extraction status"]);
  const completionStatus = rowValue(row, ["answerCompletionStatus", ZH.answerCompletionStatus, "Answer completion status"]);
  const status = rowValue(row, ["status", ZH.status, "Status"]);
  const screenshotPath = rowValue(row, ["screenshotPath", ZH.screenshotPath, "Screenshot path"]);
  const answerLength = Number(rowValue(row, ["answerLength", ZH.answerLength, "Answer length"]) || answer.length || 0);
  const statusText = `${answerStatus} ${extractionStatus} ${completionStatus} ${status}`.toLowerCase();

  if (!relationField) {
    addFailure(failures, rowIndex, relationField, "missing_relation_field");
  }
  if (!answer || answerLength < minAnswerLength) {
    addFailure(failures, rowIndex, relationField, "answer_too_short", { answerLength, minAnswerLength, extractionStatus });
  }
  if (/empty_panel_answer|empty_assistant_panel/.test(statusText)) {
    addFailure(failures, rowIndex, relationField, "empty_panel_answer", { extractionStatus, completionStatus });
  }
  if (/generation_timeout|still_generating|currently_generating|answer_generation_timeout|incomplete/.test(statusText)) {
    addFailure(failures, rowIndex, relationField, "generation_not_complete", { extractionStatus, completionStatus });
  }
  if (/page_goto_failed|asin_resolution_failed|prepare_product_page_failed|script_error|failed/.test(statusText)) {
    addFailure(failures, rowIndex, relationField, "runtime_failure", { answerStatus, extractionStatus, status });
  }
  if (valid && !isYes(valid)) {
    addFailure(failures, rowIndex, relationField, "invalid_business_answer", { isValidAnswer: valid, failureReason });
  }
  if (!valid || isNo(valid)) {
    addFailure(failures, rowIndex, relationField, "valid_answer_flag_not_yes", { isValidAnswer: valid || "blank", failureReason });
  }
  if (failureReason && !/^none$|^\u65e0$/i.test(failureReason)) {
    addFailure(failures, rowIndex, relationField, "failure_reason_present", { failureReason });
  }
  if (screenshotPath) {
    const resolvedScreenshot = path.isAbsolute(screenshotPath) ? screenshotPath : path.resolve(baseDir, screenshotPath);
    if (!fs.existsSync(resolvedScreenshot)) {
      addFailure(failures, rowIndex, relationField, "screenshot_missing", { screenshotPath });
    }
  }
}

const statusCounts = rows.reduce((acc, row) => {
  const key = rowValue(row, ["answerExtractionStatus", ZH.answerExtractionStatus, "Answer extraction status"]) || "unknown";
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const summary = {
  ok: failures.length === 0,
  csvPath,
  visualReportPath,
  rowCount: rows.length,
  asinCount,
  expectedRows,
  minAnswerLength,
  statusCounts,
  failures,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
