import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseCsv, writeCsv } from "./csv_zh.mjs";

const SCRIPT_VERSION = "0.2.19";

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

function slugify(value) {
  return String(value ?? "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function splitList(value) {
  return String(value ?? "")
    .split(/[|,\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitAsins(value) {
  return [...new Set(String(value ?? "")
    .split(/[|,\s]+/)
    .map((item) => item.trim().toUpperCase())
    .filter((item) => /^[A-Z0-9]{10}$/.test(item)))];
}

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value ?? ""));
}

function polishPromptContext(value) {
  return String(value ?? "")
    .replace(/\biphone\b/gi, "iPhone")
    .replace(/\bpro\s*max\b/gi, "Pro Max")
    .replace(/\bmagsafe\b/gi, "MagSafe")
    .replace(/\s+/g, " ")
    .trim();
}

function englishPromptContext(value) {
  const raw = splitList(value)[0] || String(value ?? "").trim();
  if (!raw) return "";
  if (!hasCjk(raw) && /[a-z]/i.test(raw)) return polishPromptContext(raw.replace(/\s+/g, " ").trim().slice(0, 120));
  const compact = raw.replace(/\s+/g, "").toLowerCase();
  const parts = [];
  if (/\u82f9\u679c|iphone/i.test(raw)) {
    const model = compact.match(/(\d{1,2})(?:pro)?max/);
    if (model) parts.push(`iPhone ${model[1]} Pro Max`);
    else parts.push("iPhone");
  }
  if (/\u624b\u673a\u58f3|\u624b\u673a\u5957|\u4fdd\u62a4\u58f3|\u58f3/.test(raw)) parts.push("case");
  if (/\u652f\u67b6/.test(raw)) parts.push("with stand");
  if (/\u78c1\u5438|magsafe/i.test(raw)) parts.push("MagSafe compatible");
  if (/\u84dd\u7259\u8033\u673a/.test(raw)) parts.push("Bluetooth earbuds");
  else if (/\u8033\u673a/.test(raw)) parts.push("earbuds");
  return polishPromptContext(parts.join(" "));
}

function inferPromptProductContext(productName, keywordValue, explicitValue) {
  for (const value of [explicitValue, keywordValue, productName]) {
    const clean = englishPromptContext(value);
    if (clean && !hasCjk(clean)) return clean;
  }
  return "this product category";
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (String(value ?? "").trim()) return String(value).trim();
  }
  return "";
}

function questionKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim();
}

function isRelationProbeRow(row) {
  const relationField = pick(row, ["relationField", "\u5173\u7cfb\u5b57\u6bb5"]);
  const source = pick(row, ["questionSource", "\u95ee\u9898\u6765\u6e90", "sourceType", "sourceTypes", "\u6765\u6e90\u7c7b\u578b\u5217\u8868"]);
  return Boolean(relationField) || /relation[_ -]?probe/i.test(source);
}

function normalizeQueueRows(rows, productName, defaultPromptProductContext) {
  const seen = new Set();
  const normalized = [];
  for (const row of rows) {
    if (isRelationProbeRow(row)) continue;
    const question = pick(row, [
      "question",
      "清洗后问题",
      "问题",
      "mergedQuestion",
      "cleanedQuestion",
      "fullQuestion",
      "Question",
    ]);
    const key = questionKey(question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const rawAsins = pick(row, ["asins", "ASIN列表", "asin"]);
    const asins = splitAsins(rawAsins);
    const baseRow = {
      question,
      questionSource: pick(row, ["questionSource", "问题来源", "来源类型列表", "sourceTypes", "sourceType"]) || "natural_question_cleaned",
      relatedOriginalQuestions: pick(row, ["relatedOriginalQuestions", "原始问题列表", "关联原始问题", "sampleSearchQuestions", "sampleAsinQuestions"]) || question,
      questionTheme: pick(row, ["questionTheme", "问题意图", "清洗归并键", "questionIntentKey"]),
      totalOccurrenceCount: pick(row, ["totalOccurrenceCount", "总出现次数", "occurrenceCount"]) || "1",
      keywords: pick(row, ["keywords", "关键词列表", "keywordsWithQuestion", "keyword"]),
      asins: asins.join(" | ") || rawAsins,
      sourceAsins: asins.join(" | "),
      asinContextIndex: asins.length ? "1" : "",
      asinContextCount: asins.length ? String(asins.length) : "",
      promptProductContext: pick(row, ["promptProductContext", "productContext"]) || defaultPromptProductContext,
      productName: pick(row, ["productName", "产品"]) || productName,
    };
    if (asins.length > 1) {
      asins.forEach((asin, index) => normalized.push({
        ...baseRow,
        asins: asin,
        asinContextIndex: String(index + 1),
      }));
    } else {
      normalized.push(baseRow);
    }
  }
  return normalized;
}

function booleanArg(args, key, fallback) {
  if (args[key] === undefined) return fallback;
  return String(args[key]).toLowerCase() === "true" ? "true" : "false";
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  console.log(`Usage:
node scripts/rufus_collect_natural_question_answers.mjs --product "PRODUCT_NAME" --cleaned-questions "output/project/natural_question_cleaned.csv" --out-dir "output/project_natural_answers"

Also accepts --question-summary, --questions-file, --input, or --queue.
This script normalizes natural question CSV headers, then runs scripts/rufus_research.mjs to ask Alexa for Shopping (formerly Rufus) for complete answers.
Relation Probe questions must not be passed into this script.`);
  process.exit(0);
}

const productName = String(args.product || args["product-name"] || "").trim();
const inputPath = path.resolve(String(
  args["cleaned-questions"]
  || args["question-summary"]
  || args["questions-file"]
  || args.input
  || args.queue
  || ""
));

if (!productName) throw new Error("Missing --product.");
if (!inputPath || !fs.existsSync(inputPath)) throw new Error(`Missing question input CSV: ${inputPath || "(empty)"}`);

const outDir = path.resolve(String(args["out-dir"] || args.out || path.join(path.dirname(inputPath), "natural_question_answers")));
fs.mkdirSync(outDir, { recursive: true });
const evidenceDir = path.join(outDir, "_evidence");
fs.mkdirSync(evidenceDir, { recursive: true });

const rawRows = parseCsv(fs.readFileSync(inputPath, "utf8"));
const firstKeyword = rawRows.map((row) => pick(row, ["keywords", "关键词列表", "keywordsWithQuestion", "keyword"])).filter(Boolean)[0] || String(args.keyword || args.keywords || "");
const promptProductContext = inferPromptProductContext(productName, firstKeyword, args["prompt-product-context"]);
const queueRows = normalizeQueueRows(rawRows, productName, promptProductContext);
const relationProbeRows = rawRows.filter((row) => isRelationProbeRow(row)).length;
if (!queueRows.length) {
  const probeNote = relationProbeRows ? ` ${relationProbeRows} relation-probe row(s) were excluded because 15-dimension probes are standalone ASIN reports.` : "";
  throw new Error(`No usable natural questions found. Expected a question or 清洗后问题 column.${probeNote}`);
}

const queuePath = path.join(evidenceDir, "natural_question_answer_queue.csv");
const queueColumns = ["question", "questionSource", "relatedOriginalQuestions", "questionTheme", "totalOccurrenceCount", "keywords", "asins", "sourceAsins", "asinContextIndex", "asinContextCount", "promptProductContext", "productName"]
  .map((key) => ({ key, label: key }));
writeCsv(queuePath, queueColumns, queueRows, fs);

const manifestPath = path.join(evidenceDir, "natural_question_answer_collection_manifest.json");
const batchId = String(args["batch-id"] || `${slugify(productName)}_natural_answers_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`);
const researchScript = path.resolve(String(args["research-script"] || path.join(path.dirname(fileURLToPath(import.meta.url)), "rufus_research.mjs")));
if (!fs.existsSync(researchScript)) throw new Error(`Missing bundled Alexa for Shopping research script: ${researchScript}`);

fs.writeFileSync(manifestPath, `${JSON.stringify({
  version: SCRIPT_VERSION,
  productName,
  batchId,
  inputPath,
  queuePath,
  outDir,
  questionCount: queueRows.length,
  promptProductContext,
  policy: {
    source: "natural_question_cleaned_or_deduped",
    relationProbes: "excluded_from_main_natural_answer_collection",
    answerCollection: "ask_each_question_with_rufus_research",
    multiAsinRows: "expanded_to_one_question_per_related_asin",
    noAsinFallbackPrompt: "uses English promptProductContext; never inserts Chinese productName into the Alexa for Shopping question",
  },
  createdAt: new Date().toISOString(),
}, null, 2)}\n`, "utf8");

const commandArgs = [
  researchScript,
  "--product", productName,
  "--keyword", String(args.keyword || args.keywords || queueRows.map((row) => row.keywords).filter(Boolean)[0] || productName),
  "--question-summary", queuePath,
  "--out-dir", outDir,
  "--batch-id", batchId,
  "--output-language", String(args["output-language"] || "zh-CN"),
  "--prompt-product-context", promptProductContext,
  "--retries", String(args.retries || 2),
  "--max-wait-ms", String(args["max-wait-ms"] || 180000),
  "--fresh-chat-per-question", booleanArg(args, "fresh-chat-per-question", "true"),
  "--enrich-recommended-asins", booleanArg(args, "enrich-recommended-asins", "true"),
];

for (const key of ["limit", "search-url", "cdp-base", "test-stage", "asin-page-wait-ms"]) {
  if (args[key] !== undefined) commandArgs.push(`--${key}`, String(args[key]));
}
if (args["refresh-asin-snapshots"]) commandArgs.push("--refresh-asin-snapshots");
if (args["dry-run"]) commandArgs.push("--dry-run");

console.log(JSON.stringify({ queuePath, manifestPath, questionCount: queueRows.length, promptProductContext, researchScript }, null, 2));
const result = spawnSync(process.execPath, commandArgs, { stdio: "inherit", cwd: process.cwd() });
process.exit(result.status ?? 1);
