import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { writeCsv as writeCsvZh } from "./csv_zh.mjs";

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

function normalizeAsin(value) {
  return String(value ?? "").trim().toUpperCase();
}

function slugify(value) {
  return String(value ?? "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function extractQuestions(text) {
  const generic = [/^have questions\?$/i, /^what do customers say\?$/i, /^how can i help\?$/i, /^search this page$/i];
  const seen = new Set();
  const questions = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 12 || line.length > 220) continue;
    if (generic.some((pattern) => pattern.test(line))) continue;
    const looksLikeQuestion = /[?？]$/.test(line) || /^(what|how|is|are|can|does|do|which|where|when|why)\b/i.test(line);
    if (!looksLikeQuestion) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(line);
  }
  return questions.slice(0, 30);
}

async function clickAssistant(page) {
  const selectors = [
    'text=/Ask Alexa/i',
    '[aria-label*="Alexa" i]',
    '[aria-label*="Rufus" i]',
    '[data-testid*="alexa" i]',
    '[data-testid*="rufus" i]',
    '[class*="alexa" i]',
    '[class*="rufus" i]',
    'button:has-text("Ask")',
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      if ((await locator.count()) === 0) continue;
      await locator.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});
      await locator.click({ timeout: 3500, force: true });
      await page.waitForTimeout(6500);
      return selector;
    } catch {
      // Try the next assistant entry.
    }
  }
  return "";
}

async function resolveAsinUrl(page, asin) {
  const asinSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(asin)}`;
  await page.goto(asinSearchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4500);
  const found = await page.evaluate((targetAsin) => {
    const link = Array.from(document.querySelectorAll("a[href]")).find((a) => new RegExp(`/dp/${targetAsin}|/gp/product/${targetAsin}`, "i").test(a.href));
    return link?.href || "";
  }, asin).catch(() => "");
  return {
    asinSearchUrl,
    productUrl: found || `https://www.amazon.com/dp/${asin}`,
    resolutionStatus: found ? "search_result_clicked_candidate" : "direct_dp_fallback",
  };
}

const args = parseArgs(process.argv.slice(2));
const productName = String(args.product ?? "bluetooth headphones").trim();
const asins = splitList(args.asins ?? args["target-asin"]).map(normalizeAsin);
if (!asins.length) throw new Error("Missing --asins or --target-asin for specified ASIN natural-question collection.");

const keywordContext = String(args.keyword ?? args.keywords ?? "specified_asin").trim() || "specified_asin";
const outDir = path.resolve(args["out-dir"] ?? path.join("output", `${slugify(productName)}_specified_asin_questions`));
fs.mkdirSync(outDir, { recursive: true });
const evidenceDir = path.join(outDir, "_evidence");
fs.mkdirSync(evidenceDir, { recursive: true });

const csvPath = path.join(outDir, "specified_asin_questions.csv");
const manifestPath = path.join(evidenceDir, "specified_asin_questions_manifest.json");
const header = [
  "productName",
  "postalCode",
  "locationSetStatus",
  "locationEvidence",
  "sourceType",
  "keyword",
  "asin",
  "keywordRank",
  "productTitle",
  "productUrl",
  "asinSearchUrl",
  "asinResolvedUrl",
  "assistantEntry",
  "assistantVisible",
  "questions",
  "questionCount",
  "screenshotPath",
  "collectedAt",
  "status",
];

const browser = await chromium.connectOverCDP(args["cdp-base"] ?? "http://127.0.0.1:9222").catch((error) => {
  console.error("Cannot connect to Chrome. Run npm run cdp:launch first, then log in to Amazon.");
  console.error(error.message);
  process.exit(1);
});

const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();
page.setDefaultTimeout(12000);

const rows = [];
for (const asin of asins) {
  const collectedAt = new Date().toISOString();
  let productUrl = "";
  let asinSearchUrl = "";
  let asinResolvedUrl = "";
  let productTitle = "";
  let assistantEntry = "";
  let assistantVisible = false;
  let questions = [];
  let status = "ok";
  const screenshotPath = path.join(evidenceDir, `${asin}_specified_asin.png`);

  try {
    const resolved = await resolveAsinUrl(page, asin);
    asinSearchUrl = resolved.asinSearchUrl;
    productUrl = resolved.productUrl;
    asinResolvedUrl = resolved.productUrl;
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6500);
    productTitle = (await page.locator("#productTitle").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    assistantEntry = await clickAssistant(page);
    const bodyText = await page.locator("body").innerText({ timeout: 9000 });
    assistantVisible = /rufus|ask alexa|alexa/i.test(bodyText) || Boolean(assistantEntry);
    questions = extractQuestions(bodyText);
    await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 15000 });
  } catch (error) {
    status = `error: ${error.message}`;
    await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 15000 }).catch(() => {});
  }

  rows.push({
    productName,
    postalCode: "",
    locationSetStatus: "not_requested",
    locationEvidence: "",
    sourceType: "asin_page",
    keyword: keywordContext,
    asin,
    keywordRank: "specified_asin",
    productTitle,
    productUrl,
    asinSearchUrl,
    asinResolvedUrl,
    assistantEntry,
    assistantVisible,
    questions: questions.join(" | "),
    questionCount: questions.length,
    screenshotPath,
    collectedAt,
    status,
  });
}

await page.close().catch(() => {});
await browser.close().catch(() => {});

writeCsvZh(csvPath, header, rows, fs);
fs.writeFileSync(manifestPath, `${JSON.stringify({ productName, asins, keywordContext, rowCount: rows.length, output: csvPath, createdAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
console.log(csvPath);
console.log(manifestPath);
