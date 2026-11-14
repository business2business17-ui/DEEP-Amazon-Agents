import fs from "node:fs";
import path from "node:path";

const DIMENSIONS = {
  use_case_coverage: ["use case", "scenario", "\u4f7f\u7528\u573a\u666f", "\u573a\u666f"],
  audience_fit: ["audience", "user fit", "\u4eba\u7fa4", "\u7528\u6237", "\u53d7\u4f17"],
  buying_factor_coverage: ["buying factor", "purchase factor", "decision factor", "\u8d2d\u4e70", "\u51b3\u7b56"],
  positioning_clarity: ["positioning", "position", "differentiation", "\u5b9a\u4f4d", "\u5dee\u5f02"],
  shopper_language_fit: ["shopper language", "buyer language", "search language", "\u4e70\u5bb6\u8bed\u8a00", "\u641c\u7d22\u8bed\u8a00"],
  answer_structure_clarity: ["answer structure", "answer clarity", "ai extraction", "\u56de\u7b54\u7ed3\u6784", "\u6e05\u6670", "\u0041\u0049\u63d0\u53d6"],
};

const MODULES = {
  title: ["title", "\u6807\u9898"],
  bullets: ["bullet", "bullets", "\u4e94\u70b9", "\u5356\u70b9"],
  images: ["image", "images", "image copy", "image_copy", "\u56fe\u7247", "\u4e3b\u56fe", "\u8f85\u56fe"],
  a_plus: ["a+", "a plus", "aplus", "a_plus", "\u0041+"],
  q_and_a: ["q&a", "qa", "q and a", "q_and_a", "\u95ee\u7b54", "\u0041\u006d\u0061\u007a\u006f\u006e \u0051\u0026\u0041"],
  attributes: ["attribute", "attributes", "backend", "backend keyword", "backend_keywords", "\u5c5e\u6027", "\u540e\u53f0"],
};

const DATA_DIRS = ["", "data", "tables", "appendix"];
const IMAGE_TOTAL_ALIASES = [
  "detectedImageCount",
  "pageImageCount",
  "listingImageCount",
  "totalImages",
  "expectedImageCount",
  "imageTotal",
  "totalImageCount",
  "\u9875\u9762\u5b9e\u9645\u56fe\u7247\u6570",
  "\u68c0\u6d4b\u56fe\u7247\u6570",
  "\u603b\u56fe\u7247\u6570",
  "\u56fe\u7247\u603b\u6570",
];
const IMAGE_COUNT_SOURCE_ALIASES = [
  "imageCountSource",
  "imageCountEvidence",
  "pageImageCountEvidence",
  "sourceEvidence",
  "sourceUrl",
  "listingUrl",
  "screenshotPath",
  "detectedFrom",
  "\u56fe\u7247\u6570\u6765\u6e90",
  "\u56fe\u7247\u6570\u8bc1\u636e",
  "\u8bc1\u636e",
];
const IMAGE_EVIDENCE_ALIASES = [
  "imageUrl",
  "imageUrls",
  "thumbnailUrl",
  "screenshotPath",
  "imageEvidence",
  "sourceEvidence",
  "\u56fe\u7247\u94fe\u63a5",
  "\u622a\u56fe",
  "\u56fe\u7247\u8bc1\u636e",
];
const CHANGE_NEEDED_ALIASES = [
  "changeNeeded",
  "needsChange",
  "actionStatus",
  "auditDecision",
  "rewriteNeeded",
  "\u662f\u5426\u9700\u8981\u4fee\u6539",
  "\u662f\u5426\u4fee\u6539",
  "\u4fee\u6539\u72b6\u6001",
  "\u5ba1\u8ba1\u7ed3\u8bba",
];
const SOURCE_EVIDENCE_ALIASES = [
  "sourceEvidence",
  "evidence",
  "sourceUrl",
  "screenshotPath",
  "selector",
  "\u8bc1\u636e",
  "\u6765\u6e90",
  "\u622a\u56fe",
];
const COVERAGE_STRENGTH_ALIASES = [
  "coverageStrength",
  "coverageLevel",
  "signalStrength",
  "strength",
  "\u8986\u76d6\u5f3a\u5ea6",
  "\u4fe1\u53f7\u5f3a\u5ea6",
];
const TARGET_ASSET_ALIASES = [
  "targetAssetId",
  "targetAsset",
  "targetLocation",
  "specificTarget",
  "assetId",
  "placement",
  "\u5177\u4f53\u4f4d\u7f6e",
  "\u4fee\u6539\u4f4d\u7f6e",
  "\u76ee\u6807\u8d44\u4ea7",
  "\u5206\u914d\u5230\u54ea\u4e00\u6761",
];
const ACTION_TYPE_ALIASES = [
  "actionType",
  "rewriteType",
  "action",
  "editType",
  "\u52a8\u4f5c\u7c7b\u578b",
  "\u4fee\u6539\u7c7b\u578b",
];
const IMPLEMENTATION_DETAIL_ALIASES = [
  "implementationDetail",
  "exactChange",
  "replacementCopy",
  "suggestedCopy",
  "rewriteCandidate",
  "visualBrief",
  "imageBrief",
  "recommendedFix",
  "\u5177\u4f53\u6539\u6cd5",
  "\u66ff\u6362\u6587\u6848",
  "\u753b\u9762\u5efa\u8bae",
  "\u5efa\u8bae",
];
const ACTION_ID_ALIASES = [
  "actionId",
  "fixId",
  "recommendationId",
  "\u52a8\u4f5cID",
  "\u5efa\u8baeID",
  "\u4fee\u6539ID",
];
const ACTION_REF_ALIASES = [
  "actionRef",
  "actionId",
  "fixRef",
  "recommendationRef",
  "\u52a8\u4f5c\u5f15\u7528",
  "\u5efa\u8bae\u5f15\u7528",
];
const CAPABILITY_FIT_ALIASES = [
  "capabilityFit",
  "productCapabilityFit",
  "productFactFit",
  "productSupportStatus",
  "\u4ea7\u54c1\u80fd\u529b\u5339\u914d",
  "\u4ea7\u54c1\u4e8b\u5b9e\u5339\u914d",
];
const ACTION_BUCKET_ALIASES = [
  "actionBucket",
  "actionCategory",
  "recommendationBucket",
  "fixBucket",
  "\u52a8\u4f5c\u5206\u7c7b",
  "\u5efa\u8bae\u5206\u7c7b",
];
const PRODUCT_FACT_EVIDENCE_ALIASES = [
  "productFactEvidence",
  "capabilityEvidence",
  "productEvidence",
  "factEvidence",
  "\u4ea7\u54c1\u4e8b\u5b9e\u8bc1\u636e",
  "\u80fd\u529b\u8bc1\u636e",
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
  const nonEmptyRows = rows.filter((item) => item.some((value) => value !== ""));
  const headers = nonEmptyRows.shift() ?? [];
  return nonEmptyRows.map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] ?? ""])));
}

function simplify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_\-+/&:()[\]{}|.,;]+/g, "")
    .trim();
}

function includesAny(value, aliases) {
  const raw = String(value ?? "").toLowerCase();
  const compact = simplify(value);
  return aliases.some((alias) => {
    const aliasRaw = String(alias ?? "").toLowerCase();
    const aliasCompact = simplify(alias);
    if (!aliasRaw && !aliasCompact) return false;
    if (raw === aliasRaw || raw.includes(aliasRaw)) return true;
    return aliasCompact.length >= 2 && compact.includes(aliasCompact);
  });
}

function findColumn(rows, aliases) {
  const columns = Object.keys(rows[0] ?? {});
  const normalizedAliases = aliases.map((alias) => simplify(alias));
  return columns.find((column) => normalizedAliases.includes(simplify(column)))
    ?? columns.find((column) => includesAny(column, aliases))
    ?? "";
}

function findDataFile(dir, names) {
  for (const subdir of DATA_DIRS) {
    for (const name of names) {
      const candidate = path.join(dir, subdir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return "";
}

function readCsv(dir, names, errors, label) {
  const filePath = findDataFile(dir, Array.isArray(names) ? names : [names]);
  if (!filePath) {
    errors.push(`missing ${label}: ${path.join(dir, Array.isArray(names) ? names[0] : names)}`);
    return [];
  }
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  if (!rows.length) errors.push(`empty ${label}: ${filePath}`);
  return rows;
}

function readOptionalCsv(dir, names) {
  const filePath = findDataFile(dir, Array.isArray(names) ? names : [names]);
  if (!filePath) return [];
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function numberValue(value) {
  const matched = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  return matched ? Number(matched[0]) : NaN;
}

function isNoChangeDecision(value) {
  return /^(no|false|0|keep|pass|ok|no[_ -]?change|unchanged|not[_ -]?needed|\u5426|\u65e0\u9700\u4fee\u6539|\u4e0d\u7528\u6539|\u4e0d\u9700\u8981\u4fee\u6539|\u4fdd\u6301|\u901a\u8fc7)$/i.test(String(value ?? "").trim());
}

function isChangeDecision(value) {
  return /^(yes|true|1|change|needs[_ -]?change|revise|rewrite|required|\u662f|\u9700\u8981\u4fee\u6539|\u9700\u6539|\u9700\u8981\u4f18\u5316)$/i.test(String(value ?? "").trim());
}

function requireChangeDecision(rows, fileLabel, errors) {
  const changeCol = findColumn(rows, CHANGE_NEEDED_ALIASES);
  const fixCol = findColumn(rows, ["recommendedFix", "recommendation", "action", "suggestedCopy", "\u5efa\u8bae", "\u4f18\u5316\u5efa\u8bae"]);
  if (!changeCol) errors.push(`${fileLabel} must include changeNeeded / auditDecision; unchanged items must be marked no-change.`);
  if (!fixCol) errors.push(`${fileLabel} must include recommendedFix / action; unchanged items must explicitly say no change.`);
  if (!changeCol) return { changeCol, fixCol };
  const unclear = rows.filter((row) => {
    const value = row[changeCol];
    return !isNoChangeDecision(value) && !isChangeDecision(value);
  }).length;
  if (unclear) errors.push(`${fileLabel} has ${unclear} rows without a clear change/no-change decision.`);
  if (fixCol) {
    const blankFixes = rows.filter((row) => String(row[fixCol] ?? "").trim().length < 2).length;
    if (blankFixes) errors.push(`${fileLabel} has ${blankFixes} rows without recommendedFix / no-change note.`);
  }
  return { changeCol, fixCol };
}

function normalizeCoverageStrength(value) {
  const text = String(value ?? "").toLowerCase();
  if (/not[_ -]?applicable|n\/a|na|\u4e0d\u9002\u7528|\u65e0\u5173/.test(text)) return "not_applicable";
  if (/missing|absent|gap|not[_ -]?covered|uncovered|\u7f3a\u5931|\u672a\u8986\u76d6|\u7f3a\u53e3/.test(text)) return "missing";
  if (/weak|partial|thin|implicit|incomplete|low|medium|\u5f31|\u90e8\u5206|\u95f4\u63a5|\u4e0d\u5145\u5206/.test(text)) return "weak";
  if (/strong|full|complete|covered|clear|yes|high|\u5f3a|\u5b8c\u6574|\u660e\u786e|\u5df2\u8986\u76d6|\u8986\u76d6/.test(text)) return "strong";
  return "";
}

function normalizeCapabilityFit(value) {
  const text = String(value ?? "").toLowerCase();
  if (/not[_ -]?applicable|n\/a|na|\u4e0d\u9002\u7528|\u65e0\u5173/.test(text)) return "not_applicable";
  if (/unsupported|not[_ -]?supported|not[_ -]?a[_ -]?current[_ -]?capability|product[_ -]?development|requires[_ -]?product[_ -]?change|\u4e0d\u652f\u6301|\u4e0d\u7b26\u5408|\u4ea7\u54c1\u5f00\u53d1|\u9700\u6539\u4ea7\u54c1/.test(text)) return "unsupported";
  if (/unknown|unverified|needs[_ -]?verification|verify|\u672a\u786e\u8ba4|\u9700\u786e\u8ba4|\u9700\u9a8c\u8bc1/.test(text)) return "unknown";
  if (/weak|partial|limited|indirect|\u90e8\u5206|\u5f31|\u6709\u9650/.test(text)) return "weak";
  if (/supported|support|current[_ -]?product|confirmed|yes|true|\u652f\u6301|\u5df2\u652f\u6301|\u4ea7\u54c1\u5df2\u5177\u5907|\u786e\u8ba4/.test(text)) return "supported";
  return "";
}

function normalizeActionBucket(value) {
  const text = String(value ?? "").toLowerCase();
  if (/not[_ -]?applicable|n\/a|na|no[_ -]?action|\u4e0d\u9002\u7528|\u65e0\u52a8\u4f5c|\u65e0\u9700/.test(text)) return "not_applicable";
  if (/product[_ -]?development|product[_ -]?opportunit|roadmap|new[_ -]?feature|requires[_ -]?product[_ -]?change|\u4ea7\u54c1\u5f00\u53d1|\u4ea7\u54c1\u673a\u4f1a|\u4ea7\u54c1\u6539\u8fdb/.test(text)) return "product_development_opportunity";
  if (/visual|image|photo|picture|\u56fe\u7247|\u89c6\u89c9|\u753b\u9762/.test(text)) return "visual_proof_fix";
  if (/attribute|backend|spec|search[_ -]?term|\u5c5e\u6027|\u540e\u53f0|\u89c4\u683c/.test(text)) return "attribute_backend_fix";
  if (/listing|copy|content|rewrite|bullet|title|a\+|aplus|\u6587\u6848|\u6539\u5199|\u6807\u9898|\u4e94\u70b9|\u5356\u70b9/.test(text)) return "listing_content_fix";
  return "";
}

function requireCoverageStrength(rows, fileLabel, errors) {
  const strengthCol = findColumn(rows, COVERAGE_STRENGTH_ALIASES);
  if (!strengthCol) {
    errors.push(`${fileLabel} must include coverageStrength / signalStrength with strong, weak, missing, or not_applicable.`);
    return "";
  }
  const unclear = rows.filter((row) => !normalizeCoverageStrength(row[strengthCol])).length;
  if (unclear) errors.push(`${fileLabel} has ${unclear} rows without a clear coverageStrength: strong / weak / missing / not_applicable.`);
  return strengthCol;
}

function requireActionIds(rows, fileLabel, errors) {
  const actionIdCol = findColumn(rows, ACTION_ID_ALIASES);
  if (!actionIdCol) {
    errors.push(`${fileLabel} must include actionId so asset audit rows can refer to the single action plan instead of repeating advice.`);
    return "";
  }
  const missing = rows.filter((row) => String(row[actionIdCol] ?? "").trim().length < 2).length;
  if (missing) errors.push(`${fileLabel} has ${missing} rows without actionId.`);
  return actionIdCol;
}

function requireCapabilityFit(rows, fileLabel, errors) {
  const capabilityCol = findColumn(rows, CAPABILITY_FIT_ALIASES);
  const actionBucketCol = findColumn(rows, ACTION_BUCKET_ALIASES);
  const productFactCol = findColumn(rows, PRODUCT_FACT_EVIDENCE_ALIASES);
  if (!capabilityCol) errors.push(`${fileLabel} must include capabilityFit / productFactFit so market demand is checked against real product capability.`);
  if (!actionBucketCol) errors.push(`${fileLabel} must include actionBucket: listing_content_fix / visual_proof_fix / attribute_backend_fix / product_development_opportunity / not_applicable.`);
  if (!productFactCol) errors.push(`${fileLabel} must include productFactEvidence / capabilityEvidence so unsupported claims are not rewritten into the Listing.`);
  if (capabilityCol) {
    const unclear = rows.filter((row) => !normalizeCapabilityFit(row[capabilityCol])).length;
    if (unclear) errors.push(`${fileLabel} has ${unclear} rows without clear capabilityFit: supported / weak / unsupported / unknown / not_applicable.`);
  }
  if (actionBucketCol) {
    const unclear = rows.filter((row) => !normalizeActionBucket(row[actionBucketCol])).length;
    if (unclear) errors.push(`${fileLabel} has ${unclear} rows without clear actionBucket.`);
  }
  return { capabilityCol, actionBucketCol, productFactCol };
}

function isProductDevelopmentBucket(row, actionBucketCol) {
  const bucket = normalizeActionBucket(actionBucketCol ? row[actionBucketCol] : "");
  return bucket === "product_development_opportunity" || bucket === "not_applicable";
}

function isSpecificTargetAsset(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (/^title$/i.test(text) || /^\u6807\u9898$/.test(text)) return true;
  if (/^product\s*:\s*development$/i.test(text) || /^\u4ea7\u54c1\s*:\s*\u5f00\u53d1$/.test(text)) return true;
  const patterns = [
    /\bbullet\s*[:#-]?\s*\d+\b/i,
    /\bimage\s*[:#-]?\s*\d+\b/i,
    /\b(?:a\+|aplus|a_plus)\s*[:#-]?\s*\d+\b/i,
    /\b(?:a\+|aplus|a_plus)\s*module\s*[:#-]?\s*\d+(?:\s*slide\s*[:#-]?\s*\d+)?\b/i,
    /\baplus:\d+(?::slide:\d+)?\b/i,
    /\b(?:title|bullet|image|aplus|a_plus):\d+(?::slide:\d+)?\b/i,
    /\u4e94\u70b9\s*\d+/,
    /\u7b2c\s*\d+\s*\u6761/,
    /\u56fe\u7247\s*\d+/,
    /\u7b2c\s*\d+\s*\u5f20/,
    /\u0041\+\s*\d+/,
    /\u0041\+\s*\u6a21\u5757\s*\d+(?:\s*\u8f6e\u64ad\s*\d+)?/,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function isVagueAllocation(value) {
  const text = String(value ?? "").toLowerCase();
  if (!text) return true;
  return /bullets?\s*\+\s*images?|images?\s*\+\s*bullets?|a\+\s*\+\s*images?|images?\s*\+\s*a\+|bullets?\s*\+\s*a\+|\u4e94\u70b9\s*\+\s*\u56fe\u7247|\u56fe\u7247\s*\+\s*\u4e94\u70b9|\u0041\+\s*\+\s*\u56fe\u7247/.test(text)
    && !/\d/.test(text);
}

function rowNeedsConcreteAction(row, coverageCol, changeCol) {
  const coverage = normalizeCoverageStrength(coverageCol ? row[coverageCol] : "");
  const change = changeCol ? row[changeCol] : "";
  if (isNoChangeDecision(change) || coverage === "strong" || coverage === "not_applicable") return false;
  return true;
}

function validateConcreteTargets(rows, fileLabel, errors, options = {}) {
  const targetCol = findColumn(rows, TARGET_ASSET_ALIASES);
  const coverageCol = options.coverageCol || findColumn(rows, COVERAGE_STRENGTH_ALIASES);
  const changeCol = findColumn(rows, CHANGE_NEEDED_ALIASES);
  const actionBucketCol = options.actionBucketCol || findColumn(rows, ACTION_BUCKET_ALIASES);
  if (!targetCol) {
    errors.push(`${fileLabel} must include targetAssetId / specific target, e.g. title, bullet:5, image:3, or aplus:2:slide:1.`);
    return "";
  }
  const invalidTargets = rows.filter((row) => rowNeedsConcreteAction(row, coverageCol, changeCol) && !isProductDevelopmentBucket(row, actionBucketCol) && !isSpecificTargetAsset(row[targetCol])).length;
  if (invalidTargets) {
    errors.push(`${fileLabel} has ${invalidTargets} actionable rows without a concrete targetAssetId such as bullet:5, image:3, or aplus:2:slide:1.`);
  }
  const vagueTargets = rows.filter((row) => rowNeedsConcreteAction(row, coverageCol, changeCol) && !isProductDevelopmentBucket(row, actionBucketCol) && isVagueAllocation(row[targetCol])).length;
  if (vagueTargets) {
    errors.push(`${fileLabel} has ${vagueTargets} vague allocation rows like bullets + images; split them or name the exact asset index.`);
  }
  return targetCol;
}

function validateImplementationDetail(rows, fileLabel, errors) {
  const detailCol = findColumn(rows, IMPLEMENTATION_DETAIL_ALIASES);
  if (!detailCol) {
    errors.push(`${fileLabel} must include implementationDetail / replacementCopy / visualBrief so recommendations say exactly what to change.`);
    return "";
  }
  const coverageCol = findColumn(rows, COVERAGE_STRENGTH_ALIASES);
  const changeCol = findColumn(rows, CHANGE_NEEDED_ALIASES);
  const emptyDetails = rows.filter((row) => rowNeedsConcreteAction(row, coverageCol, changeCol) && String(row[detailCol] ?? "").trim().length < 20).length;
  if (emptyDetails) errors.push(`${fileLabel} has ${emptyDetails} actionable rows without a specific replacement copy or visual brief.`);
  return detailCol;
}

function requireActionRefsForAssetRows(rows, fileLabel, errors) {
  const actionRefCol = findColumn(rows, ACTION_REF_ALIASES);
  const coverageCol = findColumn(rows, COVERAGE_STRENGTH_ALIASES);
  const changeCol = findColumn(rows, CHANGE_NEEDED_ALIASES);
  if (!actionRefCol) {
    errors.push(`${fileLabel} must include actionRef so itemized audit rows point to the single Action Plan instead of repeating long recommendations.`);
    return "";
  }
  const missingRefs = rows.filter((row) => rowNeedsConcreteAction(row, coverageCol, changeCol) && String(row[actionRefCol] ?? "").trim().length < 2).length;
  if (missingRefs) errors.push(`${fileLabel} has ${missingRefs} rows needing action but no actionRef.`);
  return actionRefCol;
}

function hasCameraLensProtectionEvidence(value) {
  const text = String(value ?? "").toLowerCase();
  const cameraLens = /(camera|lens|camera area|camera bump|camera ring|camera cutout|camera lip|camera edge|\u76f8\u673a|\u955c\u5934|\u6444\u50cf\u5934)/;
  const protection = /(protect|protection|guard|scratch|damage|raised edge|raised lip|raised bezel|edge around|shock|impact|\u4fdd\u62a4|\u9632\u522e|\u522e\u4f24|\u635f\u4f24|\u51f8\u8d77|\u9ad8\u51fa|\u8fb9\u7f18)/;
  return cameraLens.test(text) && protection.test(text);
}

function mentionsCameraLensGap(value) {
  const text = String(value ?? "").toLowerCase();
  return /(camera|lens|camera\/lens|lens protector|camera protection|lens protection|\u76f8\u673a|\u955c\u5934|\u6444\u50cf\u5934).*(missing|gap|proof|protection|protector|\u7f3a|\u8bc1\u636e|\u4fdd\u62a4)/
    .test(text);
}

function validateSemanticSignalGuard(rows, fileLabel, textCol, missingCol, strengthCol, errors) {
  if (!textCol || !missingCol || !strengthCol) return;
  const badRows = rows.filter((row) => {
    const text = row[textCol];
    const missing = row[missingCol];
    const strength = normalizeCoverageStrength(row[strengthCol]);
    return hasCameraLensProtectionEvidence(text) && mentionsCameraLensGap(missing) && strength === "missing";
  }).length;
  if (badRows) {
    errors.push(`${fileLabel} has ${badRows} rows that contain camera/lens protection evidence in the current copy but classify it as missing; mark weak/partial coverage and strengthen the same asset instead.`);
  }
}

function mentionsFullLensCoverDemand(value) {
  const text = String(value ?? "").toLowerCase();
  return /(full|complete|360|all[- ]around).{0,30}(camera|lens|camera\/lens)|(camera|lens|camera\/lens).{0,30}(cover|protector)|lens\s*(cover|protector)|camera\s*lens\s*(cover|protector)/i.test(text);
}

function productFactOnlyRaisedEdge(value) {
  const text = String(value ?? "").toLowerCase();
  const raisedEdge = /(raised edge|raised lip|raised bezel|camera edge|screen edge|edge around|2mm|1\.2mm|\u51f8\u8d77|\u9ad8\u51fa|\u8fb9\u7f18)/i.test(text);
  const physicalCover = /(lens cover|lens protector|camera cover|camera lens cover|built[- ]in lens|integrated lens cover|\u955c\u5934\u76d6|\u955c\u5934\u4fdd\u62a4\u76d6)/i.test(text);
  return raisedEdge && !physicalCover;
}

function validateCapabilityBoundaries(rows, fileLabel, errors, columns = {}) {
  const capabilityCol = columns.capabilityCol || findColumn(rows, CAPABILITY_FIT_ALIASES);
  const actionBucketCol = columns.actionBucketCol || findColumn(rows, ACTION_BUCKET_ALIASES);
  const productFactCol = columns.productFactCol || findColumn(rows, PRODUCT_FACT_EVIDENCE_ALIASES);
  const targetCol = findColumn(rows, TARGET_ASSET_ALIASES);
  const detailCol = findColumn(rows, IMPLEMENTATION_DETAIL_ALIASES);
  const textCols = [
    findColumn(rows, ["signalName", "signal", "sourceSignal", "\u4fe1\u53f7"]),
    findColumn(rows, ["missingSignals", "missing", "gap", "\u7f3a\u5931"]),
    findColumn(rows, ["recommendedFix", "implementationDetail", "suggestedCopy", "visualBrief", "\u5efa\u8bae"]),
    detailCol,
  ].filter(Boolean);
  if (!capabilityCol || !actionBucketCol) return;

  const unsupportedListingActions = rows.filter((row) => {
    const capability = normalizeCapabilityFit(row[capabilityCol]);
    const bucket = normalizeActionBucket(row[actionBucketCol]);
    return (capability === "unsupported" || capability === "not_applicable")
      && ["listing_content_fix", "visual_proof_fix", "attribute_backend_fix"].includes(bucket);
  }).length;
  if (unsupportedListingActions) {
    errors.push(`${fileLabel} has ${unsupportedListingActions} unsupported/not-applicable product capability rows assigned to Listing fixes; move them to product_development_opportunity or not_applicable.`);
  }

  if (targetCol) {
    const unsupportedListingTargets = rows.filter((row) => {
      const capability = normalizeCapabilityFit(row[capabilityCol]);
      const bucket = normalizeActionBucket(row[actionBucketCol]);
      return capability === "unsupported"
        && bucket === "product_development_opportunity"
        && /^(title|bullet|image|aplus|a_plus|a\+)/i.test(String(row[targetCol] ?? ""));
    }).length;
    if (unsupportedListingTargets) {
      errors.push(`${fileLabel} has ${unsupportedListingTargets} product-development rows still pointing to Listing assets; use product:development or leave targetAssetId out of the customer action table.`);
    }
  }

  if (productFactCol && textCols.length) {
    const badLensCoverRows = rows.filter((row) => {
      const combined = textCols.map((column) => row[column] ?? "").join(" | ");
      const bucket = normalizeActionBucket(row[actionBucketCol]);
      return mentionsFullLensCoverDemand(combined)
        && productFactOnlyRaisedEdge(row[productFactCol])
        && bucket !== "product_development_opportunity";
    }).length;
    if (badLensCoverRows) {
      errors.push(`${fileLabel} has ${badLensCoverRows} full lens-cover/protector demand rows treated as Listing fixes even though productFactEvidence only supports raised-edge protection. Reframe the Listing action to raised-edge protection or move the full lens-cover demand to product development.`);
    }
  }
}

function inferExpectedImageCount(dir, args) {
  const override = Number(args["expected-images"] || args.expectedImages || 0);
  if (override > 0) return override;
  const filePath = findDataFile(dir, ["image_asset_audit.csv", "listing_image_audit.csv"]);
  if (!filePath) return 0;
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  if (!rows.length) return 0;
  const totalCol = findColumn(rows, IMAGE_TOTAL_ALIASES);
  if (!totalCol) return 0;
  return Math.max(...rows.map((row) => numberValue(row[totalCol])).filter(Number.isFinite), 0);
}

function detectKey(value, dictionary) {
  for (const [key, aliases] of Object.entries(dictionary)) {
    if (includesAny(value, aliases)) return key;
  }
  return "";
}

function detectKeysInRows(rows, columns, dictionary) {
  const found = new Set();
  for (const row of rows) {
    const text = columns.map((column) => row[column] ?? "").join(" | ");
    const key = detectKey(text, dictionary);
    if (key) found.add(key);
  }
  return found;
}

function validateScorecard(dir, errors) {
  const rows = readCsv(dir, "listing_scorecard.csv", errors, "listing_scorecard.csv");
  if (!rows.length) return;

  const dimensionCol = findColumn(rows, ["dimension", "\u7ef4\u5ea6"]);
  const scoreCol = findColumn(rows, ["dimensionScore", "roundedScore", "score", "\u5f97\u5206"]);
  const maxCol = findColumn(rows, ["dimensionMaxScore", "maxScore", "\u6ee1\u5206"]);
  if (!dimensionCol) errors.push("listing_scorecard.csv must contain a dimension column.");
  if (!scoreCol) errors.push("listing_scorecard.csv must contain a dimension score column.");
  if (!maxCol) errors.push("listing_scorecard.csv must contain a max score column.");

  const found = new Set(rows.map((row) => detectKey(row[dimensionCol], DIMENSIONS)).filter(Boolean));
  const missing = Object.keys(DIMENSIONS).filter((key) => !found.has(key));
  if (missing.length) errors.push(`listing_scorecard.csv missing required score dimensions: ${missing.join(", ")}`);

  const maxSum = rows
    .map((row) => numberValue(row[maxCol]))
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);
  if (maxCol && Math.round(maxSum) !== 100) {
    errors.push(`listing_scorecard.csv dimension max scores must sum to 100; actual=${maxSum}`);
  }
  if (!findColumn(rows, ["totalScore", "fitScore", "\u603b\u5206"])) {
    errors.push("listing_scorecard.csv must expose totalScore / fitScore so the customer can see the overall score.");
  }
}

function validateModuleScorecard(dir, errors) {
  const rows = readCsv(dir, "listing_module_scorecard.csv", errors, "listing_module_scorecard.csv");
  if (!rows.length) return;
  const moduleCol = findColumn(rows, ["module", "listingModule", "\u6a21\u5757"]);
  const scoreCol = findColumn(rows, ["moduleScore", "score", "\u5f97\u5206"]);
  const maxCol = findColumn(rows, ["moduleMaxScore", "maxScore", "\u6ee1\u5206"]);
  if (!moduleCol) errors.push("listing_module_scorecard.csv must contain a module column.");
  if (!scoreCol || !maxCol) errors.push("listing_module_scorecard.csv must contain score and maxScore columns.");

  const found = new Set(rows.map((row) => detectKey(row[moduleCol], MODULES)).filter(Boolean));
  const required = ["title", "bullets", "images", "a_plus"];
  const missing = required.filter((key) => !found.has(key));
  if (missing.length) errors.push(`listing_module_scorecard.csv missing required page modules: ${missing.join(", ")}`);
  if (found.has("q_and_a")) {
    errors.push("listing_module_scorecard.csv must not score Q&A as a Listing content module; Amazon Q&A is not a stable editable Listing module.");
  }
}

function validateSignalMatrix(dir, errors) {
  const rows = readCsv(dir, "signal_action_matrix.csv", errors, "signal_action_matrix.csv");
  if (!rows.length) return;
  const requiredColumns = {
    actionId: ACTION_ID_ALIASES,
    sourceEvidence: ["sourceEvidence", "evidence", "\u8bc1\u636e"],
    coverageStatus: ["coverageStatus", "coverage", "\u8986\u76d6"],
    productFactEvidence: PRODUCT_FACT_EVIDENCE_ALIASES,
    capabilityFit: CAPABILITY_FIT_ALIASES,
    actionBucket: ACTION_BUCKET_ALIASES,
    listingLocation: ["listingLocation", "location", "\u4f4d\u7f6e"],
    targetAssetId: TARGET_ASSET_ALIASES,
    recommendedModule: ["recommendedModule", "module", "\u6a21\u5757"],
    recommendedFix: ["recommendedFix", "actionRecommended", "fix", "\u5efa\u8bae"],
    proofNeeded: ["proofNeeded", "evidenceRequired", "\u9700\u8981\u8bc1\u636e"],
    scoreImpact: ["scoreImpact", "impact", "\u5f71\u54cd"],
    priority: ["priority", "\u4f18\u5148"],
  };
  const foundCols = {};
  for (const [key, aliases] of Object.entries(requiredColumns)) {
    foundCols[key] = findColumn(rows, aliases);
    if (!foundCols[key]) errors.push(`signal_action_matrix.csv missing required column: ${key}`);
  }
  const strengthCol = requireCoverageStrength(rows, "signal_action_matrix.csv", errors);
  requireActionIds(rows, "signal_action_matrix.csv", errors);
  const capability = requireCapabilityFit(rows, "signal_action_matrix.csv", errors);
  validateConcreteTargets(rows, "signal_action_matrix.csv", errors, { coverageCol: strengthCol, actionBucketCol: capability.actionBucketCol });
  validateImplementationDetail(rows, "signal_action_matrix.csv", errors);
  validateCapabilityBoundaries(rows, "signal_action_matrix.csv", errors, capability);

  const moduleCols = [foundCols.listingLocation, foundCols.recommendedModule].filter(Boolean);
  const foundModules = detectKeysInRows(rows, moduleCols, MODULES);
  for (const required of ["images", "a_plus"]) {
    if (!foundModules.has(required)) {
      errors.push(`signal_action_matrix.csv must include ${required} rows; listing audit cannot be copy-only.`);
    }
  }
  if (foundModules.has("q_and_a")) {
    errors.push("signal_action_matrix.csv must not allocate missing signals to Q&A; allocate to title, bullets, images, or A+ instead.");
  }
}

function validateRewritePlan(dir, errors) {
  const rows = readCsv(dir, "listing_rewrite_plan.csv", errors, "listing_rewrite_plan.csv");
  if (!rows.length) return;
  const requiredColumns = {
    actionId: ACTION_ID_ALIASES,
    priority: ["priority", "\u4f18\u5148"],
    module: ["module", "\u6a21\u5757"],
    targetAssetId: TARGET_ASSET_ALIASES,
    productFactEvidence: PRODUCT_FACT_EVIDENCE_ALIASES,
    capabilityFit: CAPABILITY_FIT_ALIASES,
    actionBucket: ACTION_BUCKET_ALIASES,
    rewriteType: ["rewriteType", "type", "\u7c7b\u578b"],
    suggestedCopy: ["suggestedCopy", "rewriteCandidate", "copy", "\u6587\u6848"],
    proofNeeded: ["proofNeeded", "\u9700\u8981\u8bc1\u636e"],
    expectedScoreImpact: ["expectedScoreImpact", "scoreImpact", "\u9884\u671f\u63d0\u5206"],
  };
  const foundCols = {};
  for (const [key, aliases] of Object.entries(requiredColumns)) {
    foundCols[key] = findColumn(rows, aliases);
    if (!foundCols[key]) errors.push(`listing_rewrite_plan.csv missing required column: ${key}`);
  }
  const strengthCol = requireCoverageStrength(rows, "listing_rewrite_plan.csv", errors);
  requireActionIds(rows, "listing_rewrite_plan.csv", errors);
  const capability = requireCapabilityFit(rows, "listing_rewrite_plan.csv", errors);
  validateConcreteTargets(rows, "listing_rewrite_plan.csv", errors, { coverageCol: strengthCol, actionBucketCol: capability.actionBucketCol });
  validateImplementationDetail(rows, "listing_rewrite_plan.csv", errors);
  validateCapabilityBoundaries(rows, "listing_rewrite_plan.csv", errors, capability);

  const foundModules = detectKeysInRows(rows, [foundCols.module].filter(Boolean), MODULES);
  for (const required of ["title", "bullets", "images", "a_plus"]) {
    if (!foundModules.has(required)) errors.push(`listing_rewrite_plan.csv missing rewrite module: ${required}`);
  }
  if (foundModules.has("q_and_a")) {
    errors.push("listing_rewrite_plan.csv must not include Q&A rewrite rows; Q&A is not an editable Listing module.");
  }
  const changeCol = findColumn(rows, CHANGE_NEEDED_ALIASES);
  const rowsNeedingChange = changeCol ? rows.filter((row) => !isNoChangeDecision(row[changeCol])) : rows;
  const nonEmptyCopy = rowsNeedingChange.filter((row) => String(row[foundCols.suggestedCopy] ?? "").trim().length >= 20).length;
  if (foundCols.suggestedCopy && rowsNeedingChange.length && nonEmptyCopy < Math.min(3, rowsNeedingChange.length)) {
    errors.push("listing_rewrite_plan.csv must include substantive suggestedCopy / rewriteCandidate rows.");
  }
}

function validateTitleAssetAudit(dir, errors) {
  const rows = readCsv(dir, ["title_asset_audit.csv", "listing_title_audit.csv"], errors, "title_asset_audit.csv");
  if (!rows.length) return;
  const titleCol = findColumn(rows, ["titleText", "currentTitle", "title", "\u6807\u9898", "\u5f53\u524d\u6807\u9898"]);
  const evidenceCol = findColumn(rows, SOURCE_EVIDENCE_ALIASES);
  const coveredCol = findColumn(rows, ["coveredSignals", "covered", "coverage", "\u5df2\u8986\u76d6", "\u8986\u76d6"]);
  const missingCol = findColumn(rows, ["missingSignals", "missing", "gap", "\u7f3a\u5931", "\u7f3a\u53e3"]);
  if (!titleCol) errors.push("title_asset_audit.csv must include titleText/currentTitle.");
  if (!evidenceCol) errors.push("title_asset_audit.csv must include sourceEvidence / screenshotPath.");
  if (!coveredCol) errors.push("title_asset_audit.csv must state coveredSignals.");
  if (!missingCol) errors.push("title_asset_audit.csv must state missingSignals, even when there is no change.");
  requireCoverageStrength(rows, "title_asset_audit.csv", errors);
  requireChangeDecision(rows, "title_asset_audit.csv", errors);
  requireActionRefsForAssetRows(rows, "title_asset_audit.csv", errors);
  if (rows.length !== 1) errors.push(`title_asset_audit.csv should audit the title as one explicit row; actual rows=${rows.length}`);
}

function inferBulletCount(rows) {
  const totalCol = findColumn(rows, ["detectedBulletCount", "totalBullets", "bulletCount", "\u4e94\u70b9\u603b\u6570", "\u68c0\u6d4b\u4e94\u70b9\u6570"]);
  if (totalCol) return Math.max(...rows.map((row) => numberValue(row[totalCol])).filter(Number.isFinite), 0);
  const indexCol = findColumn(rows, ["bulletIndex", "bulletOrder", "index", "position", "\u4e94\u70b9\u5e8f\u53f7", "\u5e8f\u53f7"]);
  if (indexCol) return Math.max(...rows.map((row) => numberValue(row[indexCol])).filter(Number.isFinite), 0);
  return rows.length;
}

function validateBulletAssetAudit(dir, errors) {
  const rows = readCsv(dir, ["bullet_asset_audit.csv", "listing_bullet_audit.csv", "bullets_asset_audit.csv"], errors, "bullet_asset_audit.csv");
  if (!rows.length) return;
  const indexCol = findColumn(rows, ["bulletIndex", "bulletOrder", "index", "position", "\u4e94\u70b9\u5e8f\u53f7", "\u5e8f\u53f7"]);
  const textCol = findColumn(rows, ["bulletText", "currentBullet", "text", "copy", "\u4e94\u70b9\u6587\u6848", "\u5356\u70b9\u6587\u6848"]);
  const evidenceCol = findColumn(rows, SOURCE_EVIDENCE_ALIASES);
  const coveredCol = findColumn(rows, ["coveredSignals", "covered", "coverage", "\u5df2\u8986\u76d6", "\u8986\u76d6"]);
  const missingCol = findColumn(rows, ["missingSignals", "missing", "gap", "\u7f3a\u5931", "\u7f3a\u53e3"]);
  if (!indexCol) errors.push("bullet_asset_audit.csv must contain bulletIndex / bulletOrder.");
  if (!textCol) errors.push("bullet_asset_audit.csv must include bulletText/currentBullet.");
  if (!evidenceCol) errors.push("bullet_asset_audit.csv must include sourceEvidence / screenshotPath.");
  if (!coveredCol) errors.push("bullet_asset_audit.csv must state coveredSignals.");
  if (!missingCol) errors.push("bullet_asset_audit.csv must state missingSignals, even when there is no change.");
  const strengthCol = requireCoverageStrength(rows, "bullet_asset_audit.csv", errors);
  requireChangeDecision(rows, "bullet_asset_audit.csv", errors);
  requireActionRefsForAssetRows(rows, "bullet_asset_audit.csv", errors);
  validateSemanticSignalGuard(rows, "bullet_asset_audit.csv", textCol, missingCol, strengthCol, errors);

  const expected = inferBulletCount(rows);
  if (indexCol && expected > 0) {
    const present = new Set(rows.map((row) => Number(row[indexCol])).filter((value) => Number.isInteger(value)));
    const missing = [];
    for (let index = 1; index <= expected; index += 1) {
      if (!present.has(index)) missing.push(index);
    }
    if (missing.length) errors.push(`bullet_asset_audit.csv missing ordered bullet rows: ${missing.join(", ")}`);
  }
}

function validateImageAssetAudit(dir, args, errors) {
  const rows = readCsv(dir, ["image_asset_audit.csv", "listing_image_audit.csv"], errors, "image_asset_audit.csv");
  if (!rows.length) return;
  const indexCol = findColumn(rows, ["imageIndex", "imageOrder", "sortOrder", "position", "\u56fe\u7247\u5e8f\u53f7", "\u987a\u5e8f"]);
  const totalCol = findColumn(rows, IMAGE_TOTAL_ALIASES);
  const countSourceCol = findColumn(rows, IMAGE_COUNT_SOURCE_ALIASES);
  const imageEvidenceCol = findColumn(rows, IMAGE_EVIDENCE_ALIASES);
  const roleCol = findColumn(rows, ["imageRole", "role", "module", "\u56fe\u7247\u89d2\u8272"]);
  const descriptionCol = findColumn(rows, ["description", "imageDescription", "visualDescription", "\u56fe\u7247\u5185\u5bb9", "\u63cf\u8ff0"]);
  const missingCol = findColumn(rows, ["missing", "missingSignals", "gap", "gapSummary", "\u7f3a\u5931"]);
  const fixCol = findColumn(rows, ["recommendedFix", "recommendation", "action", "\u5efa\u8bae"]);
  const coveredCol = findColumn(rows, ["coveredSignals", "covered", "coverage", "\u5df2\u8986\u76d6", "\u8986\u76d6"]);
  if (!indexCol) errors.push("image_asset_audit.csv must contain imageIndex / imageOrder so every image is audited in page order.");
  if (!totalCol) errors.push("image_asset_audit.csv must contain detectedImageCount / totalImages from the current product page so partial image audits are blocked.");
  if (!countSourceCol) errors.push("image_asset_audit.csv must include imageCountSource / sourceEvidence showing how the page image count was detected.");
  if (!imageEvidenceCol) errors.push("image_asset_audit.csv must include imageUrl / screenshotPath / imageEvidence for the audited images.");
  if (!roleCol) errors.push("image_asset_audit.csv must contain imageRole.");
  if (!descriptionCol) errors.push("image_asset_audit.csv must describe what each image shows.");
  if (!coveredCol) errors.push("image_asset_audit.csv must state coveredSignals.");
  if (!missingCol) errors.push("image_asset_audit.csv must state what is missing for each image.");
  if (!fixCol) errors.push("image_asset_audit.csv must include recommendedFix for each image.");
  requireCoverageStrength(rows, "image_asset_audit.csv", errors);
  requireChangeDecision(rows, "image_asset_audit.csv", errors);
  requireActionRefsForAssetRows(rows, "image_asset_audit.csv", errors);

  const expectedImages = inferExpectedImageCount(dir, args);
  if (expectedImages > 0) {
    if (rows.length < expectedImages) errors.push(`image_asset_audit.csv must audit all ${expectedImages} images in order; actual rows=${rows.length}`);
    const present = new Set(rows.map((row) => Number(row[indexCol])).filter((value) => Number.isInteger(value)));
    const missing = [];
    for (let index = 1; index <= expectedImages; index += 1) {
      if (!present.has(index)) missing.push(index);
    }
    if (missing.length) errors.push(`image_asset_audit.csv missing ordered image rows: ${missing.join(", ")}`);
  } else if (rows.length < 1) {
    errors.push("image_asset_audit.csv must include at least one image row.");
  }

  if (descriptionCol) {
    const emptyDescriptions = rows.filter((row) => String(row[descriptionCol] ?? "").trim().length < 12).length;
    if (emptyDescriptions) errors.push(`image_asset_audit.csv has ${emptyDescriptions} image rows without a substantive description.`);
  }
}

function validateAplusAssetAudit(dir, errors) {
  const rows = readCsv(dir, ["aplus_asset_audit.csv", "a_plus_asset_audit.csv", "aplus_module_audit.csv"], errors, "aplus_asset_audit.csv");
  if (!rows.length) return;
  const statusCol = findColumn(rows, ["aplusStatus", "aPlusStatus", "status", "\u0041+\u72b6\u6001"]);
  const moduleCol = findColumn(rows, ["moduleIndex", "moduleType", "module", "\u6a21\u5757"]);
  const textCol = findColumn(rows, ["textCaptured", "text", "copy", "\u6587\u672c"]);
  const imageCountCol = findColumn(rows, ["imageCount", "images", "\u56fe\u7247\u6570"]);
  const imageEvidenceCol = findColumn(rows, ["imageUrl", "imageUrls", "imageDescription", "imageAltText", "screenshotPath", "\u56fe\u7247\u8bc1\u636e", "\u56fe\u7247\u63cf\u8ff0"]);
  const missingCol = findColumn(rows, ["missing", "missingSignals", "gap", "gapSummary", "\u7f3a\u5931"]);
  const moduleCountCol = findColumn(rows, ["detectedAplusModuleCount", "aplusModuleCount", "totalAplusModules", "moduleCount", "\u0041+\u6a21\u5757\u603b\u6570", "\u68c0\u6d4b\u0041+\u6a21\u5757\u6570"]);
  const moduleSourceCol = findColumn(rows, ["aplusModuleSource", "moduleSourceEvidence", "sourceEvidence", "screenshotPath", "\u0041+\u6a21\u5757\u8bc1\u636e", "\u8bc1\u636e"]);
  const slideCountCol = findColumn(rows, ["carouselSlideCount", "slideCount", "totalSlides", "\u8f6e\u64ad\u56fe\u6570", "\u8f6e\u64ad\u9875\u6570"]);
  const slideIndexCol = findColumn(rows, ["carouselSlideIndex", "slideIndex", "slideOrder", "\u8f6e\u64ad\u5e8f\u53f7", "\u8f6e\u64ad\u9875\u5e8f\u53f7"]);
  const carouselCol = findColumn(rows, ["isCarousel", "carousel", "moduleHasCarousel", "moduleType", "\u662f\u5426\u8f6e\u64ad", "\u8f6e\u64ad"]);
  if (!statusCol) errors.push("aplus_asset_audit.csv must contain aplusStatus / status.");
  if (!moduleCol) errors.push("aplus_asset_audit.csv must contain moduleIndex/moduleType.");
  if (!moduleCountCol) errors.push("aplus_asset_audit.csv must include detectedAplusModuleCount / totalAplusModules.");
  if (!moduleSourceCol) errors.push("aplus_asset_audit.csv must include source evidence for A+ module detection.");
  if (!textCol) errors.push("aplus_asset_audit.csv must capture A+ text or explicitly mark no text.");
  if (!imageCountCol) errors.push("aplus_asset_audit.csv must include imageCount; A+ audit cannot be text-only.");
  if (!imageEvidenceCol) errors.push("aplus_asset_audit.csv must include image evidence or image descriptions; A+ images must be audited.");
  if (!findColumn(rows, ["coveredSignals", "covered", "coverage", "\u5df2\u8986\u76d6", "\u8986\u76d6"])) {
    errors.push("aplus_asset_audit.csv must state coveredSignals.");
  }
  if (!missingCol) errors.push("aplus_asset_audit.csv must state missing content / gaps.");
  requireCoverageStrength(rows, "aplus_asset_audit.csv", errors);
  requireChangeDecision(rows, "aplus_asset_audit.csv", errors);
  requireActionRefsForAssetRows(rows, "aplus_asset_audit.csv", errors);

  const noAplus = rows.every((row) => /no[_ -]?a\+|no[_ -]?aplus|not[_ -]?found|absent|\u65e0|\u672a\u53d1\u73b0/i.test(String(row[statusCol] ?? "")));
  if (!noAplus && imageCountCol) {
    const totalImages = rows.map((row) => numberValue(row[imageCountCol])).filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
    if (totalImages <= 0) errors.push("aplus_asset_audit.csv indicates A+ exists but has no captured A+ images.");
  }
  if (!noAplus && moduleCol) {
    const expectedModules = moduleCountCol
      ? Math.max(...rows.map((row) => numberValue(row[moduleCountCol])).filter(Number.isFinite), 0)
      : Math.max(...rows.map((row) => numberValue(row[moduleCol])).filter(Number.isFinite), 0);
    if (expectedModules > 0) {
      const presentModules = new Set(rows.map((row) => Number(row[moduleCol])).filter((value) => Number.isInteger(value)));
      const missingModules = [];
      for (let index = 1; index <= expectedModules; index += 1) {
        if (!presentModules.has(index)) missingModules.push(index);
      }
      if (missingModules.length) errors.push(`aplus_asset_audit.csv missing ordered A+ module rows: ${missingModules.join(", ")}`);
    }
  }
  if (!noAplus && carouselCol) {
    const carouselRows = rows.filter((row) => /carousel|slider|slide|\u8f6e\u64ad/i.test(String(row[carouselCol] ?? "")) || numberValue(row[slideCountCol]) > 1 || numberValue(row[slideIndexCol]) > 0);
    if (carouselRows.length && !slideIndexCol) errors.push("aplus_asset_audit.csv has carousel A+ modules but no carouselSlideIndex / slideIndex.");
    if (carouselRows.length && !slideCountCol) errors.push("aplus_asset_audit.csv has carousel A+ modules but no carouselSlideCount / slideCount.");
    if (slideIndexCol && slideCountCol && moduleCol) {
      const modules = new Map();
      for (const row of carouselRows) {
        const moduleIndex = Number(row[moduleCol]);
        if (!Number.isInteger(moduleIndex)) continue;
        const list = modules.get(moduleIndex) ?? [];
        list.push(row);
        modules.set(moduleIndex, list);
      }
      for (const [moduleIndex, moduleRows] of modules.entries()) {
        const slideCount = Math.max(...moduleRows.map((row) => numberValue(row[slideCountCol])).filter(Number.isFinite), 0);
        const presentSlides = new Set(moduleRows.map((row) => Number(row[slideIndexCol])).filter((value) => Number.isInteger(value)));
        const missingSlides = [];
        for (let index = 1; index <= slideCount; index += 1) {
          if (!presentSlides.has(index)) missingSlides.push(index);
        }
        if (missingSlides.length) errors.push(`aplus_asset_audit.csv module ${moduleIndex} missing carousel slide rows: ${missingSlides.join(", ")}`);
      }
    }
  }
}

function validateQnaAssetAudit(dir, errors) {
  const rows = readOptionalCsv(dir, ["qna_asset_audit.csv", "qa_asset_audit.csv", "q_and_a_asset_audit.csv"]);
  if (!rows.length) return;
  const statusCol = findColumn(rows, ["qnaStatus", "qaStatus", "status", "\u0051\u0026\u0041\u72b6\u6001", "\u95ee\u7b54\u72b6\u6001"]);
  const entryCol = findColumn(rows, ["entryPoint", "qnaEntryPoint", "sectionName", "source", "\u5165\u53e3", "\u677f\u5757"]);
  const questionCountCol = findColumn(rows, ["questionCount", "qnaQuestionCount", "qaCount", "\u95ee\u9898\u6570"]);
  const answerCountCol = findColumn(rows, ["answerCount", "qnaAnswerCount", "\u56de\u7b54\u6570"]);
  const evidenceCol = findColumn(rows, ["evidence", "sourceEvidence", "screenshotPath", "sourceUrl", "\u8bc1\u636e"]);
  const actionCol = findColumn(rows, ["recommendedFix", "recommendedAction", "action", "\u5efa\u8bae"]);
  if (!statusCol) errors.push("optional internal qna_asset_audit.csv, when present, should contain qnaStatus: present / not_found / looking_for_specific_info / rufus_replaced / category_not_supported.");
  if (!entryCol) errors.push("optional internal qna_asset_audit.csv, when present, should identify the Q&A entry point or searched section.");
  if (!questionCountCol) errors.push("optional internal qna_asset_audit.csv, when present, should contain questionCount, even when the result is 0.");
  if (!answerCountCol) errors.push("optional internal qna_asset_audit.csv, when present, should contain answerCount, even when the result is 0.");
  if (!evidenceCol) errors.push("optional internal qna_asset_audit.csv, when present, should include evidence for whether Q&A exists.");
  if (!actionCol) errors.push("optional internal qna_asset_audit.csv, when present, should include recommendedAction / recommendedFix.");

  if (statusCol) {
    const validStatuses = /present|not[_ -]?found|absent|looking[_ -]?for[_ -]?specific[_ -]?info|rufus[_ -]?replaced|ask[_ -]?alexa|category[_ -]?not[_ -]?supported|\u5b58\u5728|\u672a\u53d1\u73b0|\u65e0|\u88ab.*rufus|\u4e0d\u652f\u6301/i;
    const invalid = rows.filter((row) => !validStatuses.test(String(row[statusCol] ?? ""))).length;
    if (invalid) errors.push(`qna_asset_audit.csv has ${invalid} rows with unclear qnaStatus.`);
  }
}

function validateReport(dir, args, errors) {
  const candidates = ["listing_audit_report.html", "listing_visual_report.html", "index.html"];
  const reportPath = candidates.map((name) => path.join(dir, name)).find((candidate) => fs.existsSync(candidate));
  if (!reportPath) {
    const markdownOnly = ["listing_audit_report.md", "LISTING_AUDIT_REPORT.md", "Listing_Audit_Report.md"].some((name) => fs.existsSync(path.join(dir, name)));
    errors.push(markdownOnly
      ? "Markdown is not accepted as the customer-facing report. Generate listing_audit_report.html or a visual report."
      : "missing visual customer report: listing_audit_report.html");
    return;
  }
  const report = fs.readFileSync(reportPath, "utf8");
  const checks = [
    ["overall score", /AI Shopping Listing Fit Score|Listing Fit Score|\/100|\u603b\u5206/i],
    ["dimension score section", /dimension score|scorecard|\u7ef4\u5ea6\u5f97\u5206|\u6253\u5206\u7ef4\u5ea6/i],
    ["title coverage signals section", /title.*cover|title.*signal|\u6807\u9898.*\u8986\u76d6|\u6807\u9898.*\u4fe1\u53f7/i],
    ["bullet coverage signals section", /bullet.*cover|bullet.*signal|\u4e94\u70b9.*\u8986\u76d6|\u5356\u70b9.*\u4fe1\u53f7/i],
    ["image coverage signals section", /image.*cover|image.*signal|\u56fe\u7247.*\u8986\u76d6|\u56fe\u7247.*\u4fe1\u53f7/i],
    ["A+ coverage signals section", /A\+.*cover|A\+.*signal|aplus.*cover|aplus.*signal|\u0041\+.*\u8986\u76d6|\u0041\+.*\u4fe1\u53f7/i],
    ["A+ module or carousel audit section", /A\+.*module|aplus.*module|carousel|slide|\u0041\+.*\u6a21\u5757|\u8f6e\u64ad|\u5207\u6362\u56fe/i],
    ["all missing signals section", /missing signals|signal gaps|all gaps|\u5168\u90e8\u7f3a\u5931\u4fe1\u53f7|\u7f3a\u5931\u4fe1\u53f7|\u4fe1\u53f7\u7f3a\u53e3/i],
    ["single action plan section", /action plan|fix action|optimization action|targetAssetId|\u4fee\u6539\u5efa\u8bae\u603b\u8868|\u884c\u52a8\u65b9\u6848|\u52a8\u4f5c\u8868|\u5177\u4f53\u4fee\u6539/i],
    ["product capability boundary section", /product capability|capability fit|product fact|development opportunit|\u4ea7\u54c1\u80fd\u529b|\u4ea7\u54c1\u4e8b\u5b9e|\u4ea7\u54c1\u5f00\u53d1|\u4ea7\u54c1\u4f18\u5316\u5f00\u53d1/i],
    ["coverage strength labels", /strong coverage|weak coverage|partial coverage|missing signal|coverage strength|\u5f3a\u8986\u76d6|\u5f31\u8986\u76d6|\u90e8\u5206\u8986\u76d6|\u8986\u76d6\u5f3a\u5ea6|\u7f3a\u5931\u4fe1\u53f7/i],
    ["specific asset allocation", /bullet\s*[:#-]?\s*\d+|image\s*[:#-]?\s*\d+|a\+\s*(?:module)?\s*[:#-]?\s*\d+|aplus:\d+|targetAssetId|\u4e94\u70b9\s*\d+|\u7b2c\s*\d+\s*\u6761|\u56fe\u7247\s*\d+|\u7b2c\s*\d+\s*\u5f20|\u0041\+\s*\u6a21\u5757\s*\d+/i],
    ["no-change decision labels", /no change|keep as is|\u65e0\u9700\u4fee\u6539|\u4e0d\u7528\u6539|\u4fdd\u6301/i],
  ];
  for (const [label, pattern] of checks) {
    if (!pattern.test(report)) errors.push(`listing_audit_report.html missing ${label}.`);
  }
  const expectedImages = inferExpectedImageCount(dir, args);
  if (expectedImages > 0) {
    for (let index = 1; index <= expectedImages; index += 1) {
      const pattern = new RegExp(`(?:Image|图(?:片)?)\\s*${index}\\b|(?:#|序号)\\s*${index}\\b`, "i");
      if (!pattern.test(report)) errors.push(`listing_audit_report.html must show ordered audit for image ${index}.`);
    }
  }
  if (report.replace(/<[^>]+>/g, " ").replace(/\s+/g, "").length < 1200) {
    errors.push("listing_audit_report.html is too short to be customer-readable.");
  }
  if (/fix allocation plan/i.test(report) && /rewrite action plan/i.test(report)) {
    errors.push("listing_audit_report.html must not show both Fix Allocation Plan and Rewrite Action Plan as separate customer tables; use one Action Plan and let itemized audits reference actionId/actionRef.");
  }
  if (/\u4fee\u6539\u5206\u914d\u65b9\u6848/i.test(report) && /\u4f18\u5316\u8def\u7ebf|\u6539\u5199\u65b9\u6848|\u6267\u884c\u6539\u5199/i.test(report)) {
    errors.push("listing_audit_report.html must not duplicate 修改分配方案 and 优化路线/改写方案 as separate full tables; merge them into one 修改建议总表.");
  }
  if (/Q&A|qna|customer questions|\u95ee\u7b54/i.test(report) && !/not a listing module|not scored|not editable|internal only|\u4e0d\u4f5c\u4e3a.*\u6a21\u5757|\u4e0d\u8fdb\u5165.*\u6253\u5206|\u5185\u90e8/i.test(report)) {
    errors.push("listing_audit_report.html must not present Q&A as a scored/editable Listing module.");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = path.resolve(args.dir || args["out-dir"] || ".");
  const errors = [];
  validateReport(dir, args, errors);
  validateScorecard(dir, errors);
  validateModuleScorecard(dir, errors);
  validateTitleAssetAudit(dir, errors);
  validateBulletAssetAudit(dir, errors);
  validateImageAssetAudit(dir, args, errors);
  validateAplusAssetAudit(dir, errors);
  validateQnaAssetAudit(dir, errors);
  validateSignalMatrix(dir, errors);
  validateRewritePlan(dir, errors);
  const result = { ok: errors.length === 0, dir, errors };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main();
