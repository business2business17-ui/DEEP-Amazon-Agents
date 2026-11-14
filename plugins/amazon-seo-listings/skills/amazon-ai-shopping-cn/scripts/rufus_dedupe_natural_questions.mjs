import fs from "node:fs";
import path from "node:path";
import { parseCsv, writeCsv } from "./csv_zh.mjs";

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

function splitList(value) {
  return String(value ?? "")
    .split(/[|,\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value ?? "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function normalizeQuestion(value) {
  return String(value ?? "")
    .replace(/[？]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function questionKey(value) {
  return normalizeQuestion(value).toLowerCase();
}

function isRelationProbe(row) {
  return String(row.sourceType ?? "").toLowerCase() === "relation_probe"
    || Boolean(String(row.relationField ?? "").trim())
    || /relation[_ -]?probe/i.test(String(row.questionSource ?? ""));
}

function readCsvRows(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input CSV not found: ${resolved}`);
  }
  return { filePath: resolved, rows: parseCsv(fs.readFileSync(resolved, "utf8")) };
}

function explodeRows(csvSource) {
  const occurrences = [];
  for (const row of csvSource.rows) {
    if (isRelationProbe(row)) continue;
    const questions = row.question ? [row.question] : splitList(row.questions);
    for (const rawQuestion of questions) {
      const question = normalizeQuestion(rawQuestion);
      const key = questionKey(question);
      if (!key) continue;
      const sourceType = String(row.sourceType || row.questionSource || "").trim() || "unknown";
      occurrences.push({
        batchId: row.batchId || "",
        productName: row.productName || "",
        sourceType,
        postalCode: row.postalCode || "",
        keyword: row.keyword || row.keywords || "",
        asin: row.asin || "",
        productTitle: row.productTitle || "",
        question,
        questionExactKey: key,
        questionIntentKey: row.questionIntentKey || "",
        questionTheme: row.questionTheme || "",
        questionRole: row.questionRole || "",
        specialSignal: row.specialSignal || "",
        sourceUrl: row.sourceUrl || row.productUrl || row.asinResolvedUrl || "",
        screenshotPath: row.screenshotPath || "",
        sourceFile: csvSource.filePath,
        collectedAt: row.collectedAt || row.createdAt || "",
        status: row.status || "",
      });
    }
  }
  return occurrences;
}

function uniqueJoin(values) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).join(" | ");
}

function sampleJoin(values, limit = 5) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).slice(0, limit).join(" | ");
}

function aggregateOccurrences(occurrences, productName, batchId) {
  const byQuestion = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.questionExactKey;
    if (!byQuestion.has(key)) byQuestion.set(key, []);
    byQuestion.get(key).push(occurrence);
  }

  return Array.from(byQuestion.entries())
    .map(([key, rows]) => {
      const sourceTypes = rows.map((row) => row.sourceType);
      const searchRows = rows.filter((row) => /search/i.test(row.sourceType));
      const asinRows = rows.filter((row) => /asin|product/i.test(row.sourceType));
      const specifiedAsinRows = rows.filter((row) => /specified/i.test(row.sourceType));
      return {
        batchId,
        productName,
        question: rows[0].question,
        questionExactKey: key,
        totalOccurrenceCount: rows.length,
        searchSourceCount: searchRows.length,
        asinSourceCount: asinRows.length,
        specifiedAsinSourceCount: specifiedAsinRows.length,
        keywordCoverageCount: new Set(rows.map((row) => row.keyword).filter(Boolean)).size,
        asinCoverageCount: new Set(rows.map((row) => row.asin).filter(Boolean)).size,
        postalCodes: uniqueJoin(rows.map((row) => row.postalCode)),
        keywordsWithQuestion: uniqueJoin(rows.map((row) => row.keyword)),
        asins: uniqueJoin(rows.map((row) => row.asin)),
        sourceTypes: uniqueJoin(sourceTypes),
        sampleSearchQuestions: sampleJoin(searchRows.map((row) => row.question)),
        sampleAsinQuestions: sampleJoin(asinRows.map((row) => row.question)),
        sampleSpecifiedAsinQuestions: sampleJoin(specifiedAsinRows.map((row) => row.question)),
        sourceFiles: uniqueJoin(rows.map((row) => row.sourceFile)),
        sourceType: "natural_question_deduped",
        status: "deduped_ok",
      };
    })
    .sort((a, b) => Number(b.totalOccurrenceCount) - Number(a.totalOccurrenceCount) || a.question.localeCompare(b.question));
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  console.log(`Usage:
node scripts/rufus_dedupe_natural_questions.mjs --product "PRODUCT_NAME" --question-sources "output/project/question_sources.csv" --specified-asin-questions "output/project_specified_asin_questions/specified_asin_questions.csv" --out-dir "output/project_dedupe"

Rules:
- Natural Amazon page questions are deduped.
- Specified-ASIN product page questions are included in dedupe.
- Relation Probe rows are excluded by design.`);
  process.exit(0);
}

const productName = String(args.product || args["product-name"] || "amazon_product").trim();
const batchId = String(args["batch-id"] || `${slugify(productName)}_natural_dedupe_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`);
const outDir = path.resolve(args["out-dir"] || path.join("output", `${slugify(productName)}_natural_dedupe`));
const sourcePaths = [
  ...splitList(args["question-sources"] || args.sources),
  ...splitList(args["specified-asin-questions"]),
  ...splitList(args["additional-sources"]),
];

if (!sourcePaths.length) {
  throw new Error("Missing input CSV. Provide --question-sources and optionally --specified-asin-questions.");
}

fs.mkdirSync(outDir, { recursive: true });
const evidenceDir = path.join(outDir, "_evidence");
fs.mkdirSync(evidenceDir, { recursive: true });
const csvSources = sourcePaths.map(readCsvRows);
const occurrences = csvSources.flatMap(explodeRows);
const deduped = aggregateOccurrences(occurrences, productName, batchId);

const occurrencePath = path.join(evidenceDir, "natural_question_occurrences.csv");
const dedupedPath = path.join(outDir, "natural_question_deduped.csv");
const manifestPath = path.join(evidenceDir, "natural_question_dedupe_manifest.json");

writeCsv(occurrencePath, ["batchId", "productName", "sourceType", "postalCode", "keyword", "asin", "productTitle", "question", "questionExactKey", "questionIntentKey", "questionTheme", "questionRole", "specialSignal", "sourceUrl", "screenshotPath", "sourceFile", "collectedAt", "status"], occurrences, fs);
writeCsv(dedupedPath, ["batchId", "productName", "question", "questionExactKey", "totalOccurrenceCount", "searchSourceCount", "asinSourceCount", "specifiedAsinSourceCount", "keywordCoverageCount", "asinCoverageCount", "postalCodes", "keywordsWithQuestion", "asins", "sourceTypes", "sampleSearchQuestions", "sampleAsinQuestions", "sampleSpecifiedAsinQuestions", "sourceFiles", "sourceType", "status"], deduped, fs);

fs.writeFileSync(manifestPath, `${JSON.stringify({
  version: "0.2.11",
  productName,
  batchId,
  inputCsvs: csvSources.map((source) => source.filePath),
  occurrenceCount: occurrences.length,
  dedupedQuestionCount: deduped.length,
  policy: {
    naturalQuestions: "deduped_by_normalized_exact_question",
    specifiedAsinQuestions: "included_in_natural_question_dedupe",
    relationProbes: "excluded_from_dedupe_and_main_flow",
  },
  outputs: { occurrencePath, dedupedPath },
  createdAt: new Date().toISOString(),
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ occurrencePath, dedupedPath, manifestPath, occurrenceCount: occurrences.length, dedupedQuestionCount: deduped.length }, null, 2));
