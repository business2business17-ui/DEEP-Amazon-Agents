import fs from "node:fs";
import path from "node:path";
import { writeDynamicCsv as writeDynamicCsvZh } from "./csv_zh.mjs";

const DEFAULT_PRODUCT = "bluetooth headphones";
const DEFAULT_KEYWORDS = [
  "bluetooth headphones",
  "noise cancelling headphones",
  "wireless headphones for working out",
  "travel headphones",
  "bluetooth headphones with microphone",
  "over ear wireless headphones",
];

const RELATIONS = [
  {
    key: "is_a",
    fieldZh: "这是什么类型的产品",
    group: "product_side",
    definitionZh: "该产品属于什么大类、小类、形态。",
    askFocusZh: "识别产品的大类、小类、形态和 Amazon 买家会使用的品类词。",
    theme: "category_identity",
    role: "taxonomy_probe",
    priority: "P0",
    prompts: [
      "What type of product is {product}? Describe its broad category, subcategory, and product form in Amazon shopper language.",
      "Which Amazon categories, product forms, and shopper terms best describe {product}?",
    ],
  },
  {
    key: "used_as",
    fieldZh: "它可以替代什么、具有什么功能等效性",
    group: "product_side",
    definitionZh: "用户会用它代替哪些产品，或者它能执行哪些传统品类的功能。",
    askFocusZh: "识别替代品、功能等效品、可替代的传统品类和买家心中的等价用途。",
    theme: "use_case_identity",
    role: "substitution_probe",
    priority: "P0",
    prompts: [
      "What products can {product} replace or function like for Amazon shoppers, and what traditional category functions can it perform?",
      "When shoppers buy {product}, what other products or conventional solutions might they be using it instead of?",
    ],
  },
  {
    key: "used_on",
    fieldZh: "它适用于身体的哪一部分或对象",
    group: "product_side",
    definitionZh: "该产品是用在身体哪里、哪个部位、或作用于什么对象。",
    askFocusZh: "识别产品作用的身体部位、物体、表面、对象或目标载体。",
    theme: "placement_surface",
    role: "target_object_probe",
    priority: "P1",
    prompts: [
      "What body part, object, surface, or target is {product} used on, attached to, applied to, or meant to affect?",
      "For Amazon shoppers, what exactly is {product} used on or used with as its direct target object?",
    ],
  },
  {
    key: "used_in_location",
    fieldZh: "通常在什么场所使用",
    group: "product_side",
    definitionZh: "用户会在什么地点、什么空间、什么环境下使用它。",
    askFocusZh: "识别使用地点、空间、房间、户外/室内环境和典型场所。",
    theme: "location_scene",
    role: "scene_probe",
    priority: "P0",
    prompts: [
      "Where do Amazon shoppers usually use {product}, such as home, office, travel, gym, commute, or outdoor environments?",
      "Which everyday locations or lifestyle environments make {product} most useful?",
    ],
  },
  {
    key: "used_for_func",
    fieldZh: "该产品具体执行什么功能",
    group: "product_side",
    definitionZh: "产品的核心功能、任务型功能、支持性功能。",
    askFocusZh: "识别核心功能、任务型功能、辅助功能和实际解决的问题。",
    theme: "functional_job",
    role: "function_probe",
    priority: "P0",
    prompts: [
      "What practical functions does {product} serve for shoppers?",
      "What shopper problems or needs does {product} help solve?",
    ],
  },
  {
    key: "capable_of",
    fieldZh: "它具备哪些能力或用途",
    group: "product_side",
    definitionZh: "产品可以做到哪些扩展性用途、情境用途、可适配能力。",
    askFocusZh: "识别扩展用途、适配能力、情境能力和能力边界。",
    theme: "capability_limit",
    role: "capability_probe",
    priority: "P0",
    prompts: [
      "What is {product} capable of doing, and what limits should shoppers know before buying?",
      "Which product capabilities matter most when shoppers evaluate {product}?",
    ],
  },
  {
    key: "used_for_event",
    fieldZh: "适用于哪些场景、节日或特殊情境",
    group: "product_side",
    definitionZh: "日常场景、季节场景、节庆场景、送礼/户外/特殊需求。",
    askFocusZh: "识别日常/季节/节庆/送礼/特殊需求场景。",
    theme: "event_occasion",
    role: "occasion_probe",
    priority: "P0",
    prompts: [
      "What events, seasons, travel moments, work situations, or lifestyle occasions is {product} commonly used for?",
      "Which occasions or shopping moments make shoppers search for {product}?",
    ],
  },
  {
    key: "used_to",
    fieldZh: "它用于实现什么目标或完成什么任务",
    group: "product_side",
    definitionZh: "用户买它希望达成的最终目的（如睡得更好、保暖等）。",
    askFocusZh: "识别最终目标、完成的任务、想达成的结果和购买后的期待。",
    theme: "job_to_be_done",
    role: "intent_probe",
    priority: "P0",
    prompts: [
      "What do shoppers use {product} to do, express, remember, decorate, or personalize?",
      "What outcome is a shopper trying to create when buying {product}?",
    ],
  },
  {
    key: "used_with",
    fieldZh: "它通常与哪些产品一起使用",
    group: "product_side",
    definitionZh: "常见的搭配品、组合使用的产品、使用链路中出现的其他品类。",
    askFocusZh: "识别搭配品、组合购买、使用链路和相关品类。",
    theme: "complement_bundle",
    role: "bundle_probe",
    priority: "P1",
    prompts: [
      "What products, accessories, devices, apps, or related categories are commonly used with {product}?",
      "What items would shoppers naturally buy together with {product}?",
    ],
  },
  {
    key: "used_by",
    fieldZh: "通常由谁使用",
    group: "user_side",
    definitionZh: "具体用户群（年龄、性别、身份）、直接使用者 vs 购买者。",
    askFocusZh: "识别直接使用者、购买者、年龄/性别/身份/关系角色。",
    theme: "buyer_user",
    role: "audience_probe",
    priority: "P0",
    prompts: [
      "Who directly uses {product}, and who usually buys it? Include age, gender, identity, or relationship roles when relevant.",
      "Which user groups and buyer groups are most likely to choose {product}, and why?",
    ],
  },
  {
    key: "xInterest_in",
    fieldZh: "目标用户的兴趣爱好",
    group: "user_side",
    definitionZh: "从搜索词推导用户关注点，如材质、季节、功能偏好。",
    askFocusZh: "识别目标用户兴趣、关注点、材质/季节/功能偏好和相关搜索兴趣。",
    theme: "interest_graph",
    role: "interest_probe",
    priority: "P1",
    prompts: [
      "If someone is interested in {product}, what related interests, styles, hobbies, or shopping needs do they usually have?",
      "What related Amazon search interests suggest that a shopper may want {product}?",
    ],
  },
  {
    key: "xIs_a",
    fieldZh: "用户的身份或角色",
    group: "user_side",
    definitionZh: "如新手妈妈、送礼人群、户外用户等角色身份。",
    askFocusZh: "识别用户身份、角色、人群标签和购买语境。",
    theme: "buyer_persona",
    role: "persona_probe",
    priority: "P0",
    prompts: [
      "What kind of shopper persona is most likely to want {product}?",
      "How would Amazon shopper language describe the person who is looking for {product}?",
    ],
  },
  {
    key: "xWant",
    fieldZh: "用户期望通过产品达成什么愿望/目标",
    group: "user_side",
    definitionZh: "用户的动机、隐含需求、具体预期结果。",
    askFocusZh: "识别动机、隐含需求、愿望、情绪目标和具体预期结果。",
    theme: "buyer_desire",
    role: "desire_probe",
    priority: "P0",
    prompts: [
      "What outcome, feeling, or problem does a shopper want when buying {product}?",
      "What emotional or practical result is the buyer hoping to get from {product}?",
    ],
  },
  {
    key: "used_for_audience",
    fieldZh: "产品面向的主要人群或受众",
    group: "user_side",
    definitionZh: "产品针对哪类人群（如 newborn / toddler / adult / pet 等）。",
    askFocusZh: "识别产品服务对象、礼物接收者、目标受众和适合/不适合人群。",
    theme: "recipient_audience",
    role: "gift_audience_probe",
    priority: "P0",
    prompts: [
      "Who is {product} usually intended for as a user, recipient, or target audience?",
      "Which user or recipient groups make {product} a relevant purchase or gift?",
    ],
  },
  {
    key: "used_in_body",
    fieldZh: "产品作用于身体的哪些部位",
    group: "user_side",
    definitionZh: "覆盖身体区域、包裹范围、支持的身体动作等。",
    askFocusZh: "识别身体区域、覆盖范围、身体动作；若不适用则明确排除。",
    theme: "body_use_relevance",
    role: "body_area_probe",
    priority: "P2",
    prompts: [
      "Which body areas, coverage zones, or body movements does {product} support? If this is not body-use relevant, explain the actual use target.",
      "Is {product} worn, held, attached, placed, or used with another object? Explain the body-use relevance clearly.",
    ],
  },
];

const RELATION_ZH_OVERRIDES = {
  is_a: {
    fieldZh: "这是什么类型的产品",
    definitionZh: "该产品属于什么大类、小类、形态。",
    askFocusZh: "识别产品的大类、小类、形态和 Amazon 买家会使用的品类词。",
  },
  used_as: {
    fieldZh: "它可以替代什么、具有什么功能等效性",
    definitionZh: "用户会用它代替哪些产品，或者它能执行哪些传统品类的功能。",
    askFocusZh: "识别替代品、功能等效品、可替代的传统品类和买家心中的等价用途。",
  },
  used_on: {
    fieldZh: "它适用于身体的哪一部分或对象",
    definitionZh: "该产品是用在身体哪里、哪个部位，或作用于什么对象。",
    askFocusZh: "识别产品作用的身体部位、物体、表面、对象或目标载体。",
  },
  used_in_location: {
    fieldZh: "通常在什么场所使用",
    definitionZh: "用户会在什么地点、什么空间、什么环境下使用它。",
    askFocusZh: "识别使用地点、空间、房间、户外或室内环境和典型场所。",
  },
  used_for_func: {
    fieldZh: "该产品具体执行什么功能",
    definitionZh: "产品的核心功能、任务型功能、支持性功能。",
    askFocusZh: "识别核心功能、任务型功能、辅助功能和实际解决的问题。",
  },
  capable_of: {
    fieldZh: "它具备哪些能力或用途",
    definitionZh: "产品可以做到哪些扩展性用途、情境用途、可适配能力。",
    askFocusZh: "识别扩展用途、适配能力、情境能力和能力边界。",
  },
  used_for_event: {
    fieldZh: "适用于哪些场景、节日或特殊情境",
    definitionZh: "日常场景、季节场景、节庆场景、送礼、户外或特殊需求。",
    askFocusZh: "识别日常、季节、节庆、送礼、户外和特殊需求场景。",
  },
  used_to: {
    fieldZh: "它用于实现什么目标或完成什么任务",
    definitionZh: "用户买它希望达成的最终目的，例如睡得更好、保暖、降噪、通勤更方便等。",
    askFocusZh: "识别最终目标、完成的任务、想达成的结果和购买后的期待。",
  },
  used_with: {
    fieldZh: "它通常与哪些产品一起使用",
    definitionZh: "常见的搭配品、组合使用的产品、使用链路中出现的其他品类。",
    askFocusZh: "识别搭配品、组合购买、使用链路和相关品类。",
  },
  used_by: {
    fieldZh: "通常由谁使用",
    definitionZh: "具体用户群，包括年龄、性别、身份，以及直接使用者和购买者的区别。",
    askFocusZh: "识别直接使用者、购买者、年龄、性别、身份和关系角色。",
  },
  xInterest_in: {
    fieldZh: "目标用户的兴趣爱好",
    definitionZh: "从搜索词推导用户关注点，例如材质、季节、功能偏好、生活方式偏好。",
    askFocusZh: "识别目标用户兴趣、关注点、材质、季节、功能偏好和相关搜索兴趣。",
  },
  xIs_a: {
    fieldZh: "用户的身份或角色",
    definitionZh: "如新手妈妈、送礼人群、户外用户、通勤人群、办公人群等角色身份。",
    askFocusZh: "识别用户身份、角色、人群标签和购买语境。",
  },
  xWant: {
    fieldZh: "用户期望通过产品达成什么愿望或目标",
    definitionZh: "用户的动机、隐含需求、具体预期结果。",
    askFocusZh: "识别动机、隐含需求、愿望、情绪目标和具体预期结果。",
  },
  used_for_audience: {
    fieldZh: "产品面向的主要人群或受众",
    definitionZh: "产品针对哪类人群，例如 newborn、toddler、adult、pet、commuter、traveler 等。",
    askFocusZh: "识别产品服务对象、礼物接收者、目标受众和适合或不适合人群。",
  },
  used_in_body: {
    fieldZh: "产品作用于身体的哪些部位",
    definitionZh: "覆盖身体区域、包裹范围、支持的身体动作等。",
    askFocusZh: "识别身体区域、覆盖范围、身体动作；若不适用则明确排除。",
  },
};

for (const relation of RELATIONS) {
  Object.assign(relation, RELATION_ZH_OVERRIDES[relation.key] ?? {});
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node rufus_build_relation_probe_questions.mjs --product "bluetooth headphones" --asins "B0EXAMPLE01" --out-dir output/bluetooth_headphones_relation_probe

Options:
  --product                 Product name. Defaults to bluetooth headphones.
  --keywords                Keywords separated by |, comma, or newlines.
  --keywords-file           Text file with one keyword per line.
  --asins                   Exact product ASIN context separated by |, comma, or newlines.
  --relation-scope          auto, asin, category, or off. Defaults to auto.
                            auto requires ASIN for product-level probes.
  --relations               Optional relation keys to include, separated by | or comma.
  --questions-per-relation  1 or 2. Defaults to 1.
  --merge-with              Deprecated. Relation probes are standalone and must not be merged into natural-question dedupe.
  --out-dir                 Output directory.
  --batch-id                Batch id written to generated rows.

Outputs:
  relation_probe_questions.csv
  relation_probe_questions.txt
  relation probes are standalone; no dedupe or merged natural-question queue is produced
  relation_probe_manifest.json`);
}

function splitList(value) {
  return String(value ?? "")
    .split(/[|\n\r,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAsin(value) {
  return String(value ?? "").trim().toUpperCase();
}

function resolveRelationScope(args, asins) {
  const requested = String(args["relation-scope"] ?? "auto").trim().toLowerCase();
  const allowed = new Set(["auto", "asin", "category", "off", "none"]);
  if (!allowed.has(requested)) {
    throw new Error("--relation-scope must be auto, asin, category, or off.");
  }
  if (requested === "off" || requested === "none") {
    return {
      enabled: false,
      relationScope: "disabled",
      relationScopeConfidence: "not_applicable",
      relationProbePolicy: "disabled_by_user",
      warning: "",
    };
  }
  if (requested === "category") {
    return {
      enabled: true,
      relationScope: "category_level",
      relationScopeConfidence: "medium",
      relationProbePolicy: "explicit_category_level",
      warning: "Category-level relation probes were explicitly requested. Do not treat them as ASIN-level product findings.",
    };
  }
  if (asins.length) {
    return {
      enabled: true,
      relationScope: "asin_level",
      relationScopeConfidence: "high",
      relationProbePolicy: requested === "asin" ? "explicit_asin_level" : "auto_asin_level",
      warning: "",
    };
  }
  throw new Error("Relation probes are product-level by default. Provide --asins for ASIN-level probes, use --relation-scope category for explicit category-level probes, or use --relation-scope off.");
}

function readKeywords(args) {
  if (args["keywords-file"]) {
    return splitList(fs.readFileSync(path.resolve(args["keywords-file"]), "utf8"));
  }
  if (args.keywords) return splitList(args.keywords);
  return DEFAULT_KEYWORDS;
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
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
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
  return header ? body.map((cells) => Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""]))) : [];
}

function writeCsv(filePath, rows, preferredFields = []) {
  const fields = [
    ...preferredFields,
    ...Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((field) => !preferredFields.includes(field)),
  ];
  const content = [fields.join(","), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","))].join("\r\n");
  fs.writeFileSync(filePath, `${content}\r\n`, "utf8");
}

function slugify(value) {
  return String(value)
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function questionKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatTemplate(template, product) {
  return template.replaceAll("{product}", product);
}

function selectedRelations(args) {
  const requested = args.relations ? new Set(splitList(args.relations)) : null;
  const relations = requested ? RELATIONS.filter((relation) => requested.has(relation.key)) : RELATIONS;
  if (!relations.length) {
    throw new Error(`No matching relations. Available: ${RELATIONS.map((relation) => relation.key).join(", ")}`);
  }
  return relations;
}

function buildProbeRows({ product, keywords, asins, relations, questionsPerRelation, batchId, relationScope, relationScopeConfidence }) {
  const createdAt = new Date().toISOString();
  const keywordText = keywords.join(" | ");
  const asinText = asins.join(" | ");
  const rows = [];

  for (const relation of relations) {
    const prompts = relation.prompts.slice(0, questionsPerRelation);
    prompts.forEach((template, index) => {
      const question = formatTemplate(template, product);
      rows.push({
        batchId,
        productName: product,
        question,
        questionSource: "relation_probe",
        relatedOriginalQuestions: relation.key,
        questionTheme: relation.theme,
        questionRole: relation.role,
        specialSignal: relation.key,
        totalOccurrenceCount: "0",
        searchSourceCount: "0",
        asinSourceCount: "0",
        keywordCoverageCount: keywords.length ? String(keywords.length) : "0",
        asinCoverageCount: asins.length ? String(asins.length) : "0",
        keywords: keywordText,
        asins: asinText,
        relationField: relation.key,
        relationKey: relation.key,
        relationFieldZh: relation.fieldZh,
        relationFieldGroup: relation.group,
        relationDefinitionZh: relation.definitionZh,
        relationAskFocusZh: relation.askFocusZh,
        relationQuestionType: "active_amazon_probe",
        relationPromptIndex: String(index + 1),
        relationPriority: relation.priority,
        relationScope,
        relationScopeConfidence,
        sourceType: "relation_probe",
        status: "probe_ready",
        createdAt,
      });
    });
  }

  return rows;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

if (args["merge-with"]) {
  throw new Error("Relation Probes are a standalone ASIN/category cognition function. They must not be merged into natural-question dedupe or the main Alexa for Shopping collection flow.");
}

const product = String(args.product || DEFAULT_PRODUCT).trim();
if (!product) throw new Error("Missing --product");

const keywords = readKeywords(args);
const asins = splitList(args.asins).map(normalizeAsin);
const relationScopeSettings = resolveRelationScope(args, asins);
const relations = selectedRelations(args);
const questionsPerRelation = Math.max(1, Math.min(Number(args["questions-per-relation"] || 1), 2));
const batchId = String(args["batch-id"] || `${slugify(product)}_relation_probe_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`);
const outDir = path.resolve(args["out-dir"] || path.join("output", `${slugify(product)}_relation_probe`));

fs.mkdirSync(outDir, { recursive: true });

const preferredFields = [
  "batchId",
  "productName",
  "question",
  "questionSource",
  "relatedOriginalQuestions",
  "questionTheme",
  "questionRole",
  "specialSignal",
  "totalOccurrenceCount",
  "searchSourceCount",
  "asinSourceCount",
  "keywordCoverageCount",
  "asinCoverageCount",
  "keywords",
  "asins",
  "relationField",
  "relationKey",
  "relationFieldZh",
  "relationFieldGroup",
  "relationDefinitionZh",
  "relationAskFocusZh",
  "relationQuestionType",
  "relationPromptIndex",
  "relationPriority",
  "relationScope",
  "relationScopeConfidence",
  "sourceType",
  "status",
  "createdAt",
];

const probeRows = relationScopeSettings.enabled
  ? buildProbeRows({
      product,
      keywords,
      asins,
      relations,
      questionsPerRelation,
      batchId,
      relationScope: relationScopeSettings.relationScope,
      relationScopeConfidence: relationScopeSettings.relationScopeConfidence,
    })
  : [];
const probeCsvPath = path.join(outDir, "relation_probe_questions.csv");
const probeTxtPath = path.join(outDir, "relation_probe_questions.txt");
writeDynamicCsvZh(probeCsvPath, probeRows, preferredFields, fs);
fs.writeFileSync(probeTxtPath, `${probeRows.map((row) => row.question).join("\r\n")}\r\n`, "utf8");

const manifest = {
  product,
  batchId,
  keywordCount: keywords.length,
  asins,
  relationScope: relationScopeSettings.relationScope,
  relationScopeConfidence: relationScopeSettings.relationScopeConfidence,
  relationProbePolicy: relationScopeSettings.relationProbePolicy,
  relationProbeWarning: relationScopeSettings.warning,
  relationCount: relations.length,
  questionsPerRelation,
  probeQuestionCount: probeRows.length,
  outputs: {
    probeCsvPath,
    probeTxtPath,
  },
  relationKeys: relations.map((relation) => relation.key),
  relationDefinitions: relations.map((relation) => ({
    relationField: relation.key,
    relationFieldZh: relation.fieldZh,
    relationFieldGroup: relation.group,
    relationDefinitionZh: relation.definitionZh,
    relationAskFocusZh: relation.askFocusZh,
  })),
  standalone: true,
  dedupePolicy: "not_deduped_not_merged_with_natural_questions",
  flowPolicy: "not_part_of_main_rufus_collection_flow",
  createdAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(outDir, "relation_probe_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));



