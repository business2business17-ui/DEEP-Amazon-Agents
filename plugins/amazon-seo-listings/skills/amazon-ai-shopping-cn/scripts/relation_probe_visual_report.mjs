#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPORT_VERSION = "0.2.30";

const RELATIONS = [
  ["is_a", "产品类型", "Product type", "identity"],
  ["used_as", "替代与功能等效", "Replacement and equivalence", "identity"],
  ["used_on", "作用对象", "Use target", "usage"],
  ["used_in_location", "使用地点", "Use locations", "usage"],
  ["used_for_func", "具体功能", "Core functions", "usage"],
  ["capable_of", "能力与边界", "Capabilities and limits", "usage"],
  ["used_for_event", "场景与时机", "Occasions and moments", "usage"],
  ["used_to", "目标与任务", "Goals and tasks", "usage"],
  ["used_with", "搭配产品", "Companion products", "usage"],
  ["used_by", "直接使用者与购买者", "Users and buyers", "audience"],
  ["xInterest_in", "用户兴趣", "Audience interests", "audience"],
  ["xIs_a", "用户角色", "Shopper personas", "audience"],
  ["xWant", "用户愿望", "Desired outcomes", "audience"],
  ["used_for_audience", "目标受众", "Target audience", "audience"],
  ["used_in_body", "身体部位或实际作用目标", "Body area or actual target", "audience"],
];

const GROUPS = {
  identity: { zh: "产品定位", en: "Product identity" },
  usage: { zh: "使用方式与场景", en: "Usage and context" },
  audience: { zh: "用户与目标", en: "Audience and goals" },
};

const COPY = {
  zh: {
    lang: "zh-CN",
    title: "指定 ASIN COSMO 15维分析报告",
    subtitle: "基于 Amazon Alexa for Shopping（原 Rufus）商品页问答证据",
    valid: "有效维度",
    missing: "待补证据",
    coverage: "证据完整度",
    fields: "关系维度",
    snapshot: "产品画像速览",
    positioning: "产品定位",
    scenes: "主要场景",
    audience: "核心人群",
    goals: "购买目标",
    companions: "常见搭配",
    noEvidence: "未取得有效证据",
    noTags: "暂无可靠短标签",
    tagLabel: "关键信息标签（由下方完整事实提炼）",
    completeInfo: "该维度的产品完整信息",
    evidence: "查看原问题与完整回答",
    question: "向 Amazon 提交的英文问题",
    answer: "Amazon AI 原始英文证据",
    failure: "失败原因",
    generated: "生成时间",
    standalone: "本报告是指定 ASIN 的独立 COSMO 分析报告，不进入自然问题去重或 Listing 评分。",
    validLabel: "有效",
    invalidLabel: "无效",
    unknownProduct: "未识别产品标题",
    unknownAsin: "未知 ASIN",
  },
  en: {
    lang: "en",
    title: "ASIN 15-Dimension Product Intelligence Report",
    subtitle: "Evidence from Amazon Alexa for Shopping (formerly Rufus) product-page answers",
    valid: "Valid dimensions",
    missing: "Evidence gaps",
    coverage: "Evidence coverage",
    fields: "Relation dimensions",
    snapshot: "Product snapshot",
    positioning: "Product positioning",
    scenes: "Primary contexts",
    audience: "Core audiences",
    goals: "Purchase goals",
    companions: "Common companions",
    noEvidence: "No valid evidence captured",
    noTags: "No reliable short tags",
    tagLabel: "Key tags derived from the facts below",
    completeInfo: "Complete product information for this dimension",
    evidence: "View original question and full answer",
    question: "Question asked on Amazon",
    answer: "Amazon AI answer",
    failure: "Failure reason",
    generated: "Generated",
    standalone: "This is a standalone ASIN product-intelligence report. It does not enter natural-question deduplication or Listing scoring.",
    validLabel: "Valid",
    invalidLabel: "Invalid",
    unknownProduct: "Product title unavailable",
    unknownAsin: "Unknown ASIN",
  },
};

const CONCEPTS = [
  [/\bphone cases?\b|\bsmartphone cases?\b/i, "手机壳", "phone case"],
  [/\bprotective cases?\b/i, "保护壳", "protective case"],
  [/\bwireless charg(?:e|ing)\b/i, "无线充电", "wireless charging"],
  [/\bmagsafe\b/i, "MagSafe", "MagSafe"],
  [/\bmagnetic (?:car )?mounts?\b/i, "磁吸支架", "magnetic mounts"],
  [/\bscreen protectors?\b/i, "屏幕保护膜", "screen protectors"],
  [/\bcamera (?:lens )?protection\b/i, "相机保护", "camera protection"],
  [/\braised (?:camera |screen )?edges?\b/i, "加高边缘", "raised edges"],
  [/\banti[- ]yellow(?:ing)?\b|\bdiscolou?ration\b/i, "抗黄变", "anti-yellowing"],
  [/\bdrop protection\b|\bshock absorption\b/i, "防摔缓冲", "drop protection"],
  [/\bheat dissipation\b|\bcooling\b/i, "散热", "heat dissipation"],
  [/\bportrait (?:mode|viewing)?\b/i, "竖屏", "portrait viewing"],
  [/\blandscape (?:mode|viewing)?\b/i, "横屏", "landscape viewing"],
  [/\bhands[- ]free\b/i, "免手持", "hands-free"],
  [/\btravel(?:ing)?\b|\btrip\b/i, "旅行", "travel"],
  [/\bvacation\b/i, "度假", "vacation"],
  [/\bcommut(?:e|ing)\b/i, "通勤", "commuting"],
  [/\boffice\b|\bworkplace\b/i, "办公", "office"],
  [/\bhome\b|\bhousehold\b/i, "居家", "home"],
  [/\boutdoors?\b|\bhiking\b|\bcamping\b/i, "户外", "outdoors"],
  [/\bgift(?:ing)?\b|\bpresent\b/i, "送礼", "gifting"],
  [/\bholiday\b|\bchristmas\b/i, "节日", "holidays"],
  [/\bdaily (?:use|routine)\b|\beveryday\b/i, "日常使用", "everyday use"],
  [/\bstudents?\b/i, "学生", "students"],
  [/\bprofessionals?\b/i, "职场人", "professionals"],
  [/\bparents?\b|\bmothers?\b|\bfathers?\b/i, "父母", "parents"],
  [/\bchildren\b|\bkids?\b|\btoddlers?\b/i, "儿童", "children"],
  [/\badults?\b/i, "成人", "adults"],
  [/\bseniors?\b|\belderly\b/i, "老年人", "seniors"],
  [/\bpet owners?\b/i, "宠物主人", "pet owners"],
  [/\bcontent creators?\b|\bvloggers?\b/i, "内容创作者", "content creators"],
  [/\bdrivers?\b|\bdriving\b/i, "驾车", "driving"],
  [/\bfitness\b|\bworkouts?\b|\bexercise\b/i, "健身", "fitness"],
  [/\bgaming\b|\bgamers?\b/i, "游戏", "gaming"],
  [/\bmusic\b|\baudio\b/i, "音乐音频", "music and audio"],
  [/\bcomfort\b|\bcomfortable\b/i, "舒适", "comfort"],
  [/\bconvenien(?:ce|t)\b/i, "便利", "convenience"],
  [/\bprotection\b|\bprotective\b/i, "保护", "protection"],
  [/\borganization\b|\borganizing\b/i, "收纳整理", "organization"],
  [/\bportable\b|\bportability\b/i, "便携", "portability"],
  [/\bcompatible\b|\bcompatibility\b/i, "兼容性", "compatibility"],
  [/\bstand\b|\bkickstand\b/i, "支架", "stand"],
  [/\bcar mounts?\b/i, "车载支架", "car mounts"],
  [/\bphone\b|\bsmartphone\b/i, "手机", "smartphone"],
  [/\bearbuds?\b|\bheadphones?\b/i, "耳机", "headphones"],
];

const FIELD_CONCEPTS = {
  is_a: ["phone case", "protective case", "stand", "smartphone", "headphones"],
  used_as: ["stand", "magnetic mounts", "car mounts", "screen protectors", "headphones", "hands-free"],
  used_on: ["smartphone", "camera protection", "screen protectors", "raised edges", "headphones"],
  used_in_location: ["travel", "vacation", "commuting", "office", "home", "outdoors", "driving", "fitness"],
  used_for_func: ["wireless charging", "MagSafe", "camera protection", "raised edges", "anti-yellowing", "drop protection", "heat dissipation", "portrait viewing", "landscape viewing", "hands-free", "protection", "organization"],
  capable_of: ["wireless charging", "MagSafe", "magnetic mounts", "screen protectors", "camera protection", "raised edges", "anti-yellowing", "drop protection", "heat dissipation", "portrait viewing", "landscape viewing", "hands-free", "portability", "compatibility", "stand"],
  used_for_event: ["travel", "vacation", "commuting", "office", "home", "outdoors", "gifting", "holidays", "everyday use", "driving", "fitness", "gaming"],
  used_to: ["hands-free", "travel", "commuting", "office", "gifting", "everyday use", "driving", "fitness", "gaming", "music and audio", "comfort", "convenience", "protection", "organization", "portability"],
  used_with: ["wireless charging", "MagSafe", "magnetic mounts", "screen protectors", "car mounts", "smartphone", "headphones", "stand"],
  used_by: ["students", "professionals", "parents", "children", "adults", "seniors", "pet owners", "content creators", "drivers"],
  xInterest_in: ["travel", "vacation", "outdoors", "gifting", "fitness", "gaming", "music and audio", "organization", "content creators"],
  xIs_a: ["students", "professionals", "parents", "children", "adults", "seniors", "pet owners", "content creators", "drivers"],
  xWant: ["hands-free", "comfort", "convenience", "protection", "organization", "portability", "compatibility"],
  used_for_audience: ["students", "professionals", "parents", "children", "adults", "seniors", "pet owners", "content creators", "drivers"],
  used_in_body: ["comfort", "fitness", "headphones"],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isValid(row) {
  const flag = clean(row.isValidAnswer).toLowerCase();
  return ["yes", "y", "true", "是"].includes(flag) && clean(row.amazonAiAnswer).length >= 20;
}

function summarize(answer, max = 280) {
  const value = clean(answer)
    .replace(/^here(?:'s| is) (?:a |the )?(?:full |complete )?(?:breakdown|overview)[^:]*:\s*/i, "")
    .replace(/^based on (?:the )?(?:available )?(?:product )?information[:,]?\s*/i, "");
  if (!value) return "";
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  let result = "";
  for (const sentence of sentences) {
    if (result && result.length + sentence.length + 1 > max) break;
    result = `${result} ${sentence}`.trim();
    if (result.length >= 130) break;
  }
  if (!result) result = value.slice(0, max);
  return result.length > max ? `${result.slice(0, max - 1).trim()}…` : result;
}

function uniqueFacts(values, limit = 12) {
  const seen = new Set();
  const facts = [];
  for (const value of values) {
    const fact = clean(value).replace(/\s*•\s*/g, "; ").replace(/:\s*;\s*/g, ": ")
      .replace(/^[•·\-–—\s]+/, "")
      .replace(/^\d{1,2}[.)]\s*/, "")
      .replace(/^GOAL\s*#\s*\d+\s*:\s*/i, "")
      .replace(/[•·\s]+$/, "")
      .trim();
    if (fact.length < 4 || fact.length > 260) continue;
    const key = fact.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    facts.push(fact);
    if (facts.length >= limit) break;
  }
  return facts;
}

function extractNumberedHeadings(answer) {
  const values = [];
  for (const match of answer.matchAll(/(?:^|\s)GOAL\s*#\s*\d+\s*:\s*([^•]{4,180}?)(?=\s*•)/gi)) values.push(match[1]);
  for (const match of answer.matchAll(/(?:^|\s)\d{1,2}[.)]\s+(["“]?[A-Za-z][^•]{3,180}?)(?=\s*(?:•|Profile:|Who they are:|The feeling:|Interest:|Primary function:|Replaces:|$))/g)) values.push(match[1]);
  return uniqueFacts(values, 12);
}

function extractBulletFacts(answer) {
  const skip = /^(?:customer evidence|review confirmation|evidence from|price range|bundle purchase pattern|peak timing|duration|achievement measure|why it matters)\s*:/i;
  const values = answer.split(/\s*•\s*/).slice(1).map((chunk) => clean(chunk)
    .split(/(?=\s(?:GOAL\s*#\s*\d+\s*:|\d{1,2}[.)]\s+[A-Z]))/)[0]
    .replace(/\s+(?:Customer evidence|Review confirmation|Evidence from reviews)\s*:.*$/i, "")
    .replace(/\s+(?:Installation Process|[A-Z][A-Za-z /&-]{2,50} Capabilities)\s*:.*$/i, "")
    .trim()).filter((value) => value && !skip.test(value));
  return uniqueFacts(values, 10);
}

function labeledFacts(relationField, answer, language) {
  const patterns = relationField === "is_a" ? [
    ["主要类目", "Primary category", /Primary Category:\s*(.+?)(?=\s+Product Type Code:)/i],
    ["产品类型代码", "Product type code", /Product Type Code:\s*(.+?)(?=\s+GL Product Group:)/i],
    ["商品组", "Product group", /GL Product Group:\s*(.+?)(?=\s+Form Factor:)/i],
    ["产品形态", "Form factor", /Form Factor:\s*(.+?)(?=\s+Subcategory Breakdown|\s+Product Form Details)/i],
    ["具体类型", "Specific type", /Case Type\s*:?\s*(.+?)(?=\s+Product Form Details|\s+Material Composition:)/i],
    ["材质结构", "Material structure", /Material Composition:\s*(.+?)(?=\s+Physical Specifications:|\s+Special Features Classification:)/i],
  ] : relationField === "used_on" ? [
    ["作用对象", "Use target", /Target:\s*(.+?)(?=\s+The\s+)/i],
  ] : relationField === "used_in_body" ? [
    ["实际作用目标", "Actual use target", /The Actual Use Target:\s*(.+?)(?=\s+Primary Use Target:|\s+This case)/i],
    ["主要交互目标", "Primary interaction target", /Primary Use Target:\s*(.+?)(?=\s+\d{1,2}[.)]|\s+Hand-Based Interactions)/i],
  ] : [];
  return uniqueFacts(patterns.map(([zh, en, pattern]) => {
    const value = answer.match(pattern)?.[1];
    return value ? `${language === "zh" ? zh : en}: ${value}` : "";
  }).filter(Boolean), 8);
}

function openingFacts(answer, limit = 3) {
  return uniqueFacts(clean(answer).split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length >= 20 && !/^(?:Target|The Actual Use Target|Primary Use Target)\s*:/i.test(sentence) && !/^(?:Would|Could|Do) you\b/i.test(sentence) && !sentence.endsWith("?")), limit);
}

function extractDimensionFacts(relationField, answer, language) {
  if (!answer) return [];
  const labeled = labeledFacts(relationField, answer, language);
  const numbered = extractNumberedHeadings(answer);
  const bullets = extractBulletFacts(answer);
  if (relationField === "is_a") return uniqueFacts([...labeled, ...numbered.slice(0, 3)], 10);
  if (relationField === "used_on") {
    const descriptiveBullets = bullets.filter((fact) => !/^(?:Slide|Press|Insert|Remove|Place|Open|Close)\b/i.test(fact));
    return uniqueFacts([...labeled, ...openingFacts(answer, 2), ...descriptiveBullets.slice(0, 6)], 8);
  }
  if (relationField === "capable_of") return uniqueFacts([...bullets, ...numbered], 12);
  if (relationField === "used_in_body") return uniqueFacts([...openingFacts(answer, 3), ...labeled, ...bullets.slice(0, 5)], 9);
  if (numbered.length >= 2) return numbered;
  if (bullets.length >= 2) return bullets;
  return uniqueFacts([...numbered, ...bullets, ...openingFacts(answer, 3), summarize(answer, 420)], 8);
}

function factToTag(fact) {
  let value = clean(fact).replace(/^[^:：]{1,30}[:：]\s*/, "");
  if (value.includes("→")) value = value.split("→").at(-1).trim();
  value = value.replace(/\s*\([^)]{2,80}\)\s*/g, " ").trim();
  if (value.includes(" — ")) value = value.split(" — ")[0].trim();
  value = value.replace(/^["“]+|["”]+$/g, "").trim();
  const words = value.split(/\s+/);
  if (words.length > 6 || value.length > 42 || /[.!?]/.test(value)) return "";
  if (words.length > 4 && /\b(?:is|are|does|can|supports|provides|includes|covers|slides|aligns|wraps|without|with)\b/i.test(value)) return "";
  return value.length >= 2 ? value : "";
}

function extractTags(answer, language, limit = 6, relationField = "", facts = []) {
  if (!answer) return [];
  const tags = [];
  const allowed = FIELD_CONCEPTS[relationField] || [];
  const factEvidence = facts.join(" ") || answer;
  for (const [pattern, zh, en] of CONCEPTS) {
    if (allowed.length && !allowed.includes(en)) continue;
    if (pattern.test(factEvidence)) {
      const tag = language === "zh" ? zh : en;
      if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase() || (existing.length > tag.length && existing.toLowerCase().includes(tag.toLowerCase())))) tags.push(tag);
    }
  }
  for (const fact of facts) {
    const tag = factToTag(fact);
    if (!tag || tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) continue;
    tags.push(tag);
    if (tags.length >= limit) break;
  }
  return tags.slice(0, limit);
}

function tagsForFields(rowMap, fields, language, limit = 8, analysis = null, asin = "", semanticReady = false) {
  const tags = [];
  for (const field of fields) {
    const row = rowMap.get(field);
    if (!row || !isValid(row)) continue;
    const dimension = semanticReady ? semanticDimension(analysis, asin, field) : null;
    const facts = semanticReady ? displayValues(dimension?.displayFacts) : extractDimensionFacts(field, row.amazonAiAnswer, language);
    const fieldTags = semanticReady ? displayValues(dimension?.displayTags) : extractTags(row.amazonAiAnswer, language, 5, field, facts);
    for (const tag of fieldTags) {
      if (!tags.includes(tag)) tags.push(tag);
      if (tags.length >= limit) return tags;
    }
  }
  return tags;
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/, "")); records.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); records.push(row); }
  const header = records.shift() || [];
  return records.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] || ""])));
}

const ALIASES = {
  batchId: ["batchId", "批次ID"],
  productName: ["productName", "产品名称", "产品"],
  asin: ["asin", "ASIN"],
  productTitle: ["productTitle", "商品标题"],
  relationField: ["relationField", "关系字段"],
  relationFieldName: ["relationFieldName", "relationFieldZh", "关系字段解释", "关系字段中文名"],
  fullQuestion: ["fullQuestion", "完整问题", "Question"],
  amazonAiAnswer: ["amazonAiAnswer", "Amazon AI回答", "Amazon AI answer"],
  isValidAnswer: ["isValidAnswer", "是否有效回答", "Valid answer"],
  failureReason: ["failureReason", "失败原因", "Failure reason"],
  answerStatus: ["answerStatus", "回答状态", "Answer status"],
  answeredAt: ["answeredAt", "回答时间", "Answered at"],
};

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => [key, aliases.map((alias) => row[alias]).find((value) => value !== undefined && value !== "") || ""]));
}

function reportLanguage(value) {
  return String(value).toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function displayValues(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => typeof value === "string" ? value : value?.display)
    .map(clean)
    .filter(Boolean);
}

export function buildRelationProbeSemanticInput({ rows, language = "en", metadata = {} }) {
  const normalizedRows = rows.map(normalizeRow);
  const locale = reportLanguage(language);
  const englishReady = locale === "en";
  const asins = [...new Set(normalizedRows.map((row) => clean(row.asin)).filter(Boolean))];
  return {
    schemaVersion: "1.0",
    reportVersion: REPORT_VERSION,
    reportLanguage: locale,
    status: englishReady ? "ready" : "pending_semantic_normalization",
    languagePolicy: locale === "zh-CN"
      ? "Chinese-first display; preserve source English only in Chinese parentheses, protected brands/models/standards, and expandable raw evidence."
      : "English-only display and evidence; no CJK characters anywhere in the rendered report.",
    products: asins.map((asin) => {
      const asinRows = normalizedRows.filter((row) => clean(row.asin) === asin);
      const rowMap = new Map(asinRows.map((row) => [row.relationField, row]));
      return {
        asin,
        sourceProductTitle: clean(asinRows.find((row) => row.productTitle)?.productTitle || asinRows.find((row) => row.productName)?.productName),
        displayProductTitle: englishReady ? clean(asinRows.find((row) => row.productTitle)?.productTitle || asinRows.find((row) => row.productName)?.productName) : "",
        dimensions: RELATIONS.map(([relationField, relationFieldZh, relationFieldEn]) => {
          const row = rowMap.get(relationField);
          const valid = Boolean(row && isValid(row));
          const sourceFacts = valid ? extractDimensionFacts(relationField, row.amazonAiAnswer, "en") : [];
          const sourceTags = valid ? extractTags(row.amazonAiAnswer, "en", 8, relationField, sourceFacts) : [];
          return {
            relationField,
            relationFieldName: locale === "zh-CN" ? relationFieldZh : relationFieldEn,
            validAnswer: valid,
            sourceTags,
            sourceFacts,
            displayTags: englishReady ? sourceTags : [],
            displayFacts: englishReady ? sourceFacts : [],
          };
        }),
      };
    }),
    instructions: locale === "zh-CN" ? {
      displayProductTitle: "改写成中文产品名，保留品牌、型号和必要标准名，例如：SPIDERCASE iPhone 17 Pro Max 磁吸支架保护壳。",
      displayTags: "中文在前，原始英文词放全角括号，例如：办公（office）。品牌、型号、ASIN、MagSafe、USB-C、TPU 等专名可直接保留。禁止出现单独英文场景词或英文人格标签。",
      displayFacts: "逐条改写成自然中文完整事实；保留产品型号和必要专名，不复制英文整句，不添加原始证据没有的信息。",
    } : {
      displayProductTitle: "Write a concise English product name. Preserve brand, model, and relevant standards.",
      displayTags: "Use concise English shopper language only. Do not include any Chinese text.",
      displayFacts: "Rewrite each source fact as clear, complete English product information without adding unsupported claims.",
    },
    metadata,
  };
}

export function writeRelationProbeSemanticInput({ rows, outPath, language = "en", metadata = {} }) {
  const payload = buildRelationProbeSemanticInput({ rows, language, metadata });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { outPath, status: payload.status, productCount: payload.products.length };
}

function semanticProduct(analysis, asin) {
  return analysis?.products?.find((product) => clean(product.asin) === clean(asin));
}

function semanticDimension(analysis, asin, relationField) {
  return semanticProduct(analysis, asin)?.dimensions?.find((dimension) => dimension.relationField === relationField);
}

function assertSemanticAnalysisReady(analysis, normalizedRows, language) {
  const locale = reportLanguage(language);
  if (!analysis || analysis.status !== "ready") throw new Error("Semantic analysis is not ready. Fill displayProductTitle/displayTags/displayFacts and set status=ready before rendering a customer report.");
  if (reportLanguage(analysis.reportLanguage) !== locale) throw new Error(`Semantic analysis language mismatch: expected ${locale}, received ${analysis.reportLanguage || "blank"}.`);
  const errors = [];
  for (const asin of [...new Set(normalizedRows.map((row) => clean(row.asin)).filter(Boolean))]) {
    const product = semanticProduct(analysis, asin);
    if (!clean(product?.displayProductTitle)) errors.push(`${asin}:displayProductTitle`);
    for (const row of normalizedRows.filter((candidate) => clean(candidate.asin) === asin && isValid(candidate))) {
      const dimension = semanticDimension(analysis, asin, row.relationField);
      if (!displayValues(dimension?.displayTags).length) errors.push(`${asin}:${row.relationField}:displayTags`);
      if (!displayValues(dimension?.displayFacts).length) errors.push(`${asin}:${row.relationField}:displayFacts`);
    }
  }
  if (errors.length) throw new Error(`Semantic analysis is incomplete: ${errors.join("|")}`);
}

function renderTags(tags, copy) {
  if (!tags.length) return `<span class="empty-tags">${escapeHtml(copy.noTags)}</span>`;
  return tags.map((tag) => `<span class="tag" data-display-tag="true">${escapeHtml(tag)}</span>`).join("");
}

function renderSnapshotItem(label, tags, copy) {
  return `<div class="snapshot-item"><h3>${escapeHtml(label)}</h3><div class="tags">${renderTags(tags, copy)}</div></div>`;
}

function renderCard(relation, row, language, copy, asin, analysis, semanticReady) {
  const [field, zh, en] = relation;
  const valid = row && isValid(row);
  const answer = valid ? clean(row.amazonAiAnswer) : "";
  const title = language === "zh" ? zh : en;
  const dimension = semanticReady ? semanticDimension(analysis, asin, field) : null;
  const facts = valid ? (semanticReady ? displayValues(dimension?.displayFacts) : extractDimensionFacts(field, answer, language)) : [];
  const tags = valid ? (semanticReady ? displayValues(dimension?.displayTags) : extractTags(answer, language, 6, field, facts)) : [];
  const failure = clean(row?.failureReason || row?.answerStatus || copy.noEvidence);
  const relationIndex = RELATIONS.findIndex(([candidate]) => candidate === field) + 1;
  return `<article class="relation-card ${valid ? "valid" : "invalid"}" data-relation-field="${field}">
    <div class="relation-head">
      <div>${language === "zh" ? `<span class="relation-index">维度 ${relationIndex}</span>` : `<code>${field}</code>`}<h3>${escapeHtml(title)}</h3></div>
      <span class="status ${valid ? "ok" : "bad"}">${escapeHtml(valid ? copy.validLabel : copy.invalidLabel)}</span>
    </div>
    <div class="tag-label">${escapeHtml(copy.tagLabel)}</div>
    <div class="tags">${renderTags(tags, copy)}</div>
    ${valid ? `<div class="fact-block"><h4>${escapeHtml(copy.completeInfo)}</h4><ul class="fact-list">${facts.map((fact) => `<li data-display-fact="true">${escapeHtml(fact)}</li>`).join("")}</ul></div>` : `<p class="summary">${escapeHtml(copy.noEvidence)}</p>`}
    ${!valid ? `<p class="failure"><strong>${escapeHtml(copy.failure)}:</strong> ${escapeHtml(failure)}</p>` : ""}
    <details>
      <summary>${escapeHtml(copy.evidence)}</summary>
      <div class="evidence"><h4>${escapeHtml(copy.question)}</h4><p>${escapeHtml(row?.fullQuestion || "-")}</p><h4>${escapeHtml(copy.answer)}</h4><p>${escapeHtml(answer || copy.noEvidence)}</p></div>
    </details>
  </article>`;
}

function renderAsinSection(asin, asinRows, language, copy, analysis, semanticReady) {
  const rowMap = new Map(asinRows.map((row) => [row.relationField, row]));
  const validCount = RELATIONS.filter(([field]) => isValid(rowMap.get(field) || {})).length;
  const coverage = Math.round((validCount / RELATIONS.length) * 100);
  const sourceTitle = clean(asinRows.find((row) => row.productTitle)?.productTitle || asinRows.find((row) => row.productName)?.productName || copy.unknownProduct);
  const title = semanticReady ? clean(semanticProduct(analysis, asin)?.displayProductTitle) : sourceTitle;
  const positioningRow = rowMap.get("is_a");
  const positioningDimension = semanticReady ? semanticDimension(analysis, asin, "is_a") : null;
  const positioning = isValid(positioningRow || {}) ? (semanticReady ? displayValues(positioningDimension?.displayFacts) : extractDimensionFacts("is_a", positioningRow.amazonAiAnswer, language)).slice(0, 6).join(language === "zh" ? "；" : "; ") : copy.noEvidence;
  const snapshot = [
    [copy.scenes, tagsForFields(rowMap, ["used_in_location", "used_for_event", "used_to", "used_for_func"], language, 8, analysis, asin, semanticReady)],
    [copy.audience, tagsForFields(rowMap, ["used_by", "xIs_a", "used_for_audience", "xInterest_in"], language, 8, analysis, asin, semanticReady)],
    [copy.goals, tagsForFields(rowMap, ["xWant", "used_to", "capable_of"], language, 8, analysis, asin, semanticReady)],
    [copy.companions, tagsForFields(rowMap, ["used_with", "used_on", "used_in_body"], language, 8, analysis, asin, semanticReady)],
  ];
  const groups = Object.keys(GROUPS).map((group) => {
    const groupRelations = RELATIONS.filter((relation) => relation[3] === group);
    const groupTitle = language === "zh" ? GROUPS[group].zh : GROUPS[group].en;
    return `<section class="relation-group"><div class="section-title"><h2>${escapeHtml(groupTitle)}</h2><span>${groupRelations.length}</span></div><div class="relation-grid">${groupRelations.map((relation) => renderCard(relation, rowMap.get(relation[0]), language, copy, asin, analysis, semanticReady)).join("")}</div></section>`;
  }).join("");
  return `<main class="asin-report" data-asin="${escapeHtml(asin)}" data-valid-relations="${validCount}">
    <header class="report-header">
      <div class="eyebrow">${escapeHtml(asin)}</div>
      <h1>${escapeHtml(copy.title)}</h1>
      <p class="product-title" data-display-product-title="true">${escapeHtml(title)}</p>
      <p class="subtitle">${escapeHtml(copy.subtitle)}</p>
    </header>
    <section class="kpis" aria-label="Report completeness">
      <div class="kpi"><span>${validCount}/15</span><small>${escapeHtml(copy.valid)}</small></div>
      <div class="kpi"><span>${15 - validCount}</span><small>${escapeHtml(copy.missing)}</small></div>
      <div class="kpi"><span>${coverage}%</span><small>${escapeHtml(copy.coverage)}</small></div>
      <div class="kpi"><span>15</span><small>${escapeHtml(copy.fields)}</small></div>
    </section>
    <section class="snapshot"><div class="section-title"><h2>${escapeHtml(copy.snapshot)}</h2></div><div class="positioning"><h3>${escapeHtml(copy.positioning)}</h3><p>${escapeHtml(positioning)}</p></div><div class="snapshot-grid">${snapshot.map(([label, tags]) => renderSnapshotItem(label, tags, copy)).join("")}</div></section>
    ${groups}
  </main>`;
}

export function generateRelationProbeVisualReport({ rows, outPath, language = "en", metadata = {}, analysis = null, draft = false }) {
  const locale = String(language).toLowerCase().startsWith("zh") ? "zh" : "en";
  const copy = COPY[locale];
  const normalizedRows = rows.map(normalizeRow);
  const semanticReady = analysis?.status === "ready";
  if (!draft) assertSemanticAnalysisReady(analysis, normalizedRows, locale);
  const asinValues = [...new Set(normalizedRows.map((row) => clean(row.asin)).filter(Boolean))];
  const asins = asinValues.length ? asinValues : [copy.unknownAsin];
  const generatedAt = metadata.createdAt || new Date().toISOString();
  const sections = asins.map((asin) => renderAsinSection(asin, normalizedRows.filter((row) => clean(row.asin) === asin || (asin === copy.unknownAsin && !clean(row.asin))), locale, copy, analysis, semanticReady)).join(`<div class="page-break"></div>`);
  const html = `<!doctype html>
<html lang="${copy.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.title)}</title>
<style>
:root{--ink:#17212b;--muted:#66727f;--line:#dbe2e8;--paper:#fff;--canvas:#f4f6f8;--blue:#1769aa;--green:#13795b;--red:#b5473a;--amber:#9a6500}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:Inter,"Segoe UI","Noto Sans SC",Arial,sans-serif;letter-spacing:0}.asin-report{max-width:1180px;margin:24px auto;background:var(--paper);border:1px solid var(--line);padding:32px}.report-header{border-bottom:3px solid var(--ink);padding-bottom:22px}.eyebrow{color:var(--blue);font-weight:700;font-size:14px}.report-header h1{font-size:30px;line-height:1.2;margin:8px 0}.product-title{font-size:18px;line-height:1.5;margin:0;max-width:920px}.subtitle{color:var(--muted);margin:8px 0 0}.kpis{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.kpi{padding:22px 14px;border-right:1px solid var(--line)}.kpi:last-child{border-right:0}.kpi span{display:block;font-size:28px;font-weight:750}.kpi small{color:var(--muted);font-size:13px}.snapshot,.relation-group{padding-top:28px}.section-title{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);margin-bottom:16px}.section-title h2{font-size:20px;margin:0 0 10px}.section-title span{background:#e9eef3;color:var(--muted);padding:3px 8px;border-radius:4px;font-size:12px}.positioning{border-left:4px solid var(--blue);padding:8px 16px;margin:0 0 16px;background:#f7fafc}.positioning h3,.snapshot-item h3{font-size:13px;margin:0 0 7px;color:var(--muted)}.positioning p{margin:0;line-height:1.65}.snapshot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.snapshot-item{border:1px solid var(--line);padding:14px;min-height:96px}.relation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.relation-card{border:1px solid var(--line);border-top:4px solid var(--green);padding:16px;min-width:0}.relation-card.invalid{border-top-color:var(--red);background:#fffafa}.relation-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.relation-head code,.relation-index{font-size:12px;color:var(--blue);font-weight:700}.relation-head h3{font-size:16px;margin:4px 0 10px}.status{font-size:12px;font-weight:700;padding:4px 7px;border-radius:4px;white-space:nowrap}.status.ok{background:#e5f4ee;color:var(--green)}.status.bad{background:#fbe9e7;color:var(--red)}.tag-label{font-size:11px;color:var(--muted);margin:0 0 6px}.tags{display:flex;flex-wrap:wrap;gap:6px;min-height:28px}.tag{background:#edf3f8;color:#29475f;border-radius:3px;padding:4px 7px;font-size:12px}.empty-tags{color:var(--muted);font-size:12px}.summary{font-size:14px;line-height:1.65;margin:12px 0}.fact-block{margin:12px 0}.fact-block h4{font-size:12px;color:var(--muted);margin:0 0 7px}.fact-list{margin:0;padding-left:19px}.fact-list li{font-size:14px;line-height:1.55;margin:0 0 6px;padding-left:2px}.failure{font-size:13px;color:var(--red)}details{border-top:1px solid var(--line);padding-top:10px;margin-top:12px}summary{cursor:pointer;color:var(--blue);font-size:13px;font-weight:650}.evidence{background:#f7f8fa;margin-top:10px;padding:12px}.evidence h4{font-size:12px;color:var(--muted);margin:0 0 5px}.evidence p{white-space:pre-wrap;font-size:13px;line-height:1.6;margin:0 0 14px}.report-footer{max-width:1180px;margin:0 auto 30px;color:var(--muted);font-size:12px;padding:0 8px}.page-break{height:1px}@media(max-width:760px){.asin-report{margin:0;border:0;padding:20px}.report-header h1{font-size:24px}.kpis{grid-template-columns:repeat(2,1fr)}.kpi:nth-child(2){border-right:0}.snapshot-grid,.relation-grid{grid-template-columns:1fr}}@media print{body{background:#fff}.asin-report{margin:0 auto;border:0}.relation-card{break-inside:avoid}.page-break{break-after:page}.report-footer{display:none}}
</style></head><body data-report-type="asin-relation-product-report" data-report-summary-mode="dimension-facts" data-report-language="${locale === "zh" ? "zh-CN" : "en"}" data-semantic-status="${semanticReady ? "ready" : "draft"}" data-relation-count="15">${sections}<footer class="report-footer"><p>${escapeHtml(copy.standalone)}</p><p>${escapeHtml(copy.generated)}: ${escapeHtml(generatedAt)} · v${escapeHtml(metadata.scriptVersion || REPORT_VERSION)}</p></footer></body></html>`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  return { outPath, reportVersion: REPORT_VERSION, semanticStatus: semanticReady ? "ready" : "draft", reportLanguage: locale === "zh" ? "zh-CN" : "en", asinCount: asins.length, rowCount: normalizedRows.length, relationCount: RELATIONS.length };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv) throw new Error("Missing --csv <asin_relation_probe_answers.csv>.");
  const csvPath = path.resolve(args.csv);
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (args["prepare-analysis"]) {
    const analysisOutPath = path.resolve(args["analysis-out"] || path.join(path.dirname(csvPath), "_evidence", "relation_probe_semantic_analysis.json"));
    const result = writeRelationProbeSemanticInput({ rows, outPath: analysisOutPath, language: args.language || "en" });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }
  const outPath = path.resolve(args.out || args["out-file"] || path.join(path.dirname(csvPath), "asin_relation_product_report.html"));
  const analysis = args["analysis-json"] ? JSON.parse(fs.readFileSync(path.resolve(args["analysis-json"]), "utf8")) : null;
  const draft = Boolean(args.draft);
  if (!analysis && !draft) throw new Error("Missing --analysis-json. Prepare and complete semantic analysis before rendering a customer report, or use --draft for an internal non-deliverable preview.");
  const result = generateRelationProbeVisualReport({ rows, outPath, language: args.language || "en", analysis, draft });
  console.log(JSON.stringify(result, null, 2));
}
