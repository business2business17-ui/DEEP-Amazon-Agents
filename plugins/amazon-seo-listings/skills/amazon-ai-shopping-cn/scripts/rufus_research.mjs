import fs from "node:fs";
import path from "node:path";

const UTF8_BOM = "\uFEFF";
const SUMMARY_TEXT_ZH = {
  title: "Alexa for Shopping \u6df1\u5ea6\u95ee\u7b54",
  successfulAnswers: "\u5b8c\u6574\u56de\u7b54",
  originalSuffix: "\uff08\u539f\u6587\uff09",
  brands: "\u63d0\u53ca\u54c1\u724c",
  prices: "\u4ef7\u683c\u4fe1\u606f",
  purchaseCriteria: "\u8d2d\u4e70\u6807\u51c6\u539f\u6587",
  userConcerns: "\u7528\u6237\u987e\u8651\u539f\u6587",
  noSourceEvidence: "\u672a\u53d1\u73b0\u660e\u786e\u539f\u6587\u8bc1\u636e",
  noRecommendedCards: "\u672a\u53d1\u73b0\u660e\u786e\u63a8\u8350\u5546\u54c1\u5361\u7247",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function requireArg(args, key) {
  if (!args[key]) throw new Error(`Missing required --${key}`);
  return args[key];
}

function normalizeLanguage(value) {
  const language = String(value ?? "zh-CN").trim().toLowerCase();
  if (["zh", "zh-cn", "chinese", "中文"].includes(language)) return "zh-CN";
  if (["en", "en-us", "english", "英文"].includes(language)) return "en";
  throw new Error(`Unsupported --output-language: ${value}. Use zh-CN or en.`);
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { value += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(value); value = ""; }
    else if (ch === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += ch;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some(Boolean));
  const cleanHeader = header?.map((h) => String(h).replace(/^\ufeff/, ""));
  return cleanHeader ? body.map((cells) => Object.fromEntries(cleanHeader.map((h, i) => [h, cells[i] ?? ""]))) : [];
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function writeCsv(filePath, fields, rows) {
  const content = [fields.join(","), ...rows.map((row) => fields.map((f) => csvEscape(row[f])).join(","))].join("\r\n");
  fs.writeFileSync(filePath, `${content}\r\n`, "utf8");
}

function questionKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

function firstListItem(value) {
  return String(value ?? "").split(/[|,\r\n]+/).map((item) => item.trim()).filter(Boolean)[0] || "";
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
  const raw = firstListItem(value);
  if (!raw) return "";
  if (!hasCjk(raw) && /[a-z]/i.test(raw)) {
    return polishPromptContext(raw
      .replace(/\s+/g, " ")
      .replace(/\bfor\s+for\b/gi, "for")
      .trim()
      .slice(0, 120));
  }
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

function promptProductContext(item, productName, args = {}) {
  const candidates = [
    item.promptProductContext,
    args["prompt-product-context"],
    item.productName,
    item.keywords,
    args.keyword,
    productName,
  ];
  for (const candidate of candidates) {
    const clean = englishPromptContext(candidate);
    if (clean && !hasCjk(clean)) return clean;
  }
  return "this product category";
}

function questionJobKey(row) {
  const asin = String(row.sourceContextAsin || row.asinContextAsin || splitAsins(row.asins)[0] || "").toUpperCase();
  return `${questionKey(row.question)}|${asin || "NO_ASIN"}`;
}

function relationMetadata(row) {
  return {
    questionRole: String(row.questionRole ?? "").trim(),
    sourceType: String(row.sourceType ?? "").trim(),
    specialSignal: String(row.specialSignal ?? "").trim(),
    relationField: String(row.relationField ?? row.relationKey ?? "").trim(),
    relationKey: String(row.relationKey ?? row.relationField ?? "").trim(),
    relationFieldZh: String(row.relationFieldZh ?? "").trim(),
    relationFieldGroup: String(row.relationFieldGroup ?? "").trim(),
    relationDefinitionZh: String(row.relationDefinitionZh ?? "").trim(),
    relationAskFocusZh: String(row.relationAskFocusZh ?? "").trim(),
    relationQuestionType: String(row.relationQuestionType ?? "").trim(),
    relationPromptIndex: String(row.relationPromptIndex ?? "").trim(),
    relationPriority: String(row.relationPriority ?? "").trim(),
  };
}

function loadQuestions(args) {
  let rows = [];
  if (args["question-summary"]) {
    rows = parseCsv(fs.readFileSync(path.resolve(args["question-summary"]), "utf8"));
  } else if (args["questions-file"]) {
    const input = fs.readFileSync(path.resolve(args["questions-file"]), "utf8");
    rows = /\.csv$/i.test(args["questions-file"])
      ? parseCsv(input)
      : input.split(/\r?\n/).map((question) => ({ question }));
  } else {
    rows = String(requireArg(args, "questions")).split(/[|\r\n]+/).map((question) => ({ question }));
  }
  const normalized = rows.map((row) => ({
    question: String(row.question ?? row["问题"] ?? "").trim(),
    questionSource: String(row.questionSource ?? row["问题来源"] ?? "原始采集").trim(),
    relatedOriginalQuestions: String(row.relatedOriginalQuestions ?? row["关联原始问题"] ?? row.question ?? row["问题"] ?? "").trim(),
    questionTheme: String(row.questionTheme ?? row["问题主题"] ?? "").trim(),
    occurrenceCount: String(row.totalOccurrenceCount ?? row["出现次数"] ?? "").trim(),
    keywords: String(row.keywords ?? row["关键词"] ?? "").trim(),
    asins: String(row.asins ?? row["ASIN"] ?? "").trim(),
    sourceAsins: String(row.sourceAsins ?? "").trim(),
    asinContextIndex: String(row.asinContextIndex ?? "").trim(),
    asinContextCount: String(row.asinContextCount ?? "").trim(),
    promptProductContext: String(row.promptProductContext ?? row.productContext ?? "").trim(),
    productName: String(row.productName ?? "").trim(),
  })).map((row, index) => ({ ...row, ...relationMetadata(rows[index]) }));
  const expanded = [];
  for (const row of normalized) {
    const rowAsins = splitAsins(row.asins);
    const sourceAsins = splitAsins(row.sourceAsins).length ? splitAsins(row.sourceAsins) : rowAsins;
    if (rowAsins.length > 1 && !row.sourceAsins) {
      rowAsins.forEach((asin, index) => expanded.push({
        ...row,
        asins: asin,
        sourceAsins: rowAsins.join(" | "),
        asinContextIndex: String(index + 1),
        asinContextCount: String(rowAsins.length),
      }));
    } else {
      expanded.push({
        ...row,
        asins: rowAsins.length === 1 ? rowAsins[0] : row.asins,
        sourceAsins: row.sourceAsins || sourceAsins.join(" | "),
        asinContextIndex: row.asinContextIndex || (sourceAsins.length ? "1" : ""),
        asinContextCount: row.asinContextCount || (sourceAsins.length ? String(sourceAsins.length) : ""),
      });
    }
  }
  const seen = new Set();
  const deduped = expanded.filter((row) => {
    const key = questionJobKey(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const limit = Number(args.limit || 0);
  return limit > 0 ? deduped.slice(0, limit) : deduped;
}

async function pageWsUrl(cdpBase) {
  const targets = await (await fetch(`${cdpBase.replace(/\/$/, "")}/json/list`)).json();
  const page = targets.find((target) => target.type === "page" && /amazon\.com/i.test(target.url))
    ?? targets.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("No Chrome page found on the CDP endpoint.");
  return page.webSocketDebuggerUrl;
}

function createCdp(wsUrl, timeoutMs = 60000) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!pending.has(msg.id)) return;
    const call = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? call.reject(new Error(msg.error.message)) : call.resolve(msg.result);
  });
  return {
    open: () => ws.readyState === WebSocket.OPEN ? Promise.resolve() : new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true });
    }),
    send(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(callId, { resolve, reject });
        setTimeout(() => { if (pending.delete(callId)) reject(new Error(`CDP timeout: ${method}`)); }, timeoutMs);
      });
    },
    close: () => ws.close(),
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result?.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Browser evaluation failed");
  return result?.result?.value;
}

async function panelText(cdp) {
  return evaluate(cdp, `(() => {
    const panel = document.querySelector('.nav-rufus-content')
      || Array.from(document.querySelectorAll('[role="dialog"], aside, section')).find(el => /shopping question|rufus|alexa/i.test(el.innerText || ''));
    if (!panel) return '';
    const tagged = [...panel.querySelectorAll('[data-csa-c-nile-request-id]')];
    const latestRequestId = [...tagged].reverse().map((node) => node.getAttribute('data-csa-c-nile-request-id')).find(Boolean);
    if (latestRequestId) {
      const sectionCandidates = tagged.filter((node) => node.getAttribute('data-csa-c-nile-request-id') === latestRequestId && /^rufus-dsk-section-/i.test(node.getAttribute('data-csa-c-content-id') || ''));
      const sections = new Map();
      for (const node of sectionCandidates) {
        const contentId = node.getAttribute('data-csa-c-content-id');
        const text = (node.innerText || node.textContent || '').trim();
        if (text.length > (sections.get(contentId)?.length || 0)) sections.set(contentId, text);
      }
      const sectionText = [...sections.values()].filter(Boolean).join('\\n').trim();
      if (sectionText) return sectionText;
      const selector = '[data-csa-c-nile-request-id="' + latestRequestId + '"]';
      const leaves = tagged.filter((node) => node.getAttribute('data-csa-c-nile-request-id') === latestRequestId && !node.querySelector(selector));
      const parts = [...new Set(leaves.map((node) => (node.innerText || node.textContent || '').trim()).filter(Boolean))];
      const scopedText = parts.join('\\n').trim();
      if (scopedText) return scopedText;
    }
    return [...panel.children].slice(-20).map((node) => node.innerText || node.textContent || '').filter(Boolean).join('\\n').trim();
  })()`);
}

async function panelProductCards(cdp, question) {
  return evaluate(cdp, `(() => {
    const panel = document.querySelector('.nav-rufus-content')
      || Array.from(document.querySelectorAll('[role="dialog"], aside, section')).find(el => /shopping question|rufus|alexa/i.test(el.innerText || ''));
    if (!panel) return [];
    const q = ${JSON.stringify(question)}.toLowerCase().trim();
    let marker = null;
    if (q) {
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const value = (walker.currentNode.nodeValue || '').toLowerCase();
        if (value.includes(q) || (q.length > 35 && value.includes(q.slice(0, 35)))) marker = walker.currentNode;
      }
    }
    const requestNodes = [...panel.querySelectorAll('[data-csa-c-nile-request-id]')];
    const latestRequestId = [...requestNodes].reverse().map((node) => node.getAttribute('data-csa-c-nile-request-id')).find(Boolean) || '';
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const cardContext = (anchor) => {
      let node = anchor;
      let best = clean(anchor.innerText || anchor.textContent || '');
      for (let i = 0; i < 7 && node && node !== panel; i += 1, node = node.parentElement) {
        const text = clean(node.innerText || node.textContent || '');
        if (text.length >= 25 && text.length <= 1400) best = text;
        if (text.length > 1400) break;
      }
      return best.slice(0, 1400);
    };
    const items = [];
    for (const anchor of panel.querySelectorAll('a[href]')) {
      if (marker && !(marker.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const anchorRequestId = anchor.closest('[data-csa-c-nile-request-id]')?.getAttribute('data-csa-c-nile-request-id') || '';
      if (latestRequestId && anchorRequestId && anchorRequestId !== latestRequestId) continue;
      const rawHref = anchor.href || anchor.getAttribute('href') || '';
      const match = rawHref.match(/\\/(?:dp|gp\\/product)\\/([A-Z0-9]{10})(?:[/?#]|$)/i);
      if (!match) continue;
      const img = anchor.querySelector('img') || anchor.closest('div')?.querySelector('img');
      const context = cardContext(anchor);
      const title = clean(anchor.getAttribute('aria-label') || anchor.getAttribute('title') || img?.alt || anchor.innerText || context.split(/(?<=[.!?])\\s+/)[0]);
      const price = context.match(/\\$\\s?\\d+(?:\\.\\d{1,2})?/)?.[0] || '';
      items.push({ asin: match[1].toUpperCase(), title: title.slice(0, 500), url: rawHref, price, evidenceExcerpt: context });
    }
    for (const card of panel.querySelectorAll('[data-csa-c-content-id*="asinCard"]')) {
      if (marker && !(marker.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const cardRequestId = card.getAttribute('data-csa-c-nile-request-id') || card.closest('[data-csa-c-nile-request-id]')?.getAttribute('data-csa-c-nile-request-id') || '';
      if (latestRequestId && cardRequestId !== latestRequestId) continue;
      if (/add to cart/i.test(clean(card.innerText || card.textContent || '')) && !card.querySelector('img[alt]')) continue;
      const img = card.querySelector('img[alt]');
      const title = clean(img?.alt || card.getAttribute('aria-label') || '');
      if (!title || title.length < 15) continue;
      const context = clean(card.innerText || card.textContent || '').slice(0, 1400);
      const priceParts = [...card.querySelectorAll('div,span')].map((node) => clean(node.innerText || node.textContent || '')).filter((value) => /^\\$?\\d+(?:\\.\\d{1,2})?$/.test(value));
      const price = context.match(/\\$\\s?\\d+(?:\\.\\d{1,2})?/)?.[0] || (priceParts.length >= 2 ? '$' + priceParts[0].replace('$','') + '.' + priceParts[1].replace('$','') : '');
      items.push({ asin: '', title: title.slice(0, 500), url: '', price, evidenceExcerpt: context, imageUrl: img?.src || '', cardId: card.getAttribute('data-csa-c-content-id') || '' });
    }
    const seen = new Set();
    return items.filter((item) => {
      const key = (item.asin || item.title.toLowerCase()) + '|' + item.evidenceExcerpt;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((item, index) => ({ ...item, recommendationRank: index + 1 }));
  })()`);
}

async function scrollRufusToBottom(cdp) {
  return evaluate(cdp, `(() => {
    const panel = document.querySelector('.nav-rufus-content')
      || Array.from(document.querySelectorAll('[role="dialog"], aside, section')).find(el => /shopping question|rufus|alexa/i.test(el.innerText || ''));
    if (!panel) return false;
    const scrollables = [panel, ...panel.querySelectorAll('.a-scroller, [class*="scroll"], [style*="overflow"]')].filter((el) => el.scrollHeight > el.clientHeight + 20);
    for (const el of scrollables) el.scrollTop = el.scrollHeight;
    panel.lastElementChild?.scrollIntoView?.({ block: 'end' });
    return true;
  })()`);
}

async function openPanel(cdp) {
  return evaluate(cdp, `(() => {
    if (document.getElementById('rufus-text-area')) return 'ready';
    const items = Array.from(document.querySelectorAll('button, a, [role="button"], span, div'));
    const el = items.find(node => /alexa for shopping|ask alexa|rufus/i.test((node.innerText || node.getAttribute('aria-label') || '').trim()));
    if (!el) return 'not_found';
    el.scrollIntoView({block:'center'}); el.click(); return 'clicked';
  })()`);
}

async function startNewChat(cdp) {
  const clicked = await evaluate(cdp, `(() => {
    const button = document.querySelector('#rufus-panel-header-new-chat, button[aria-label="Start a new chat"]');
    if (!button) return false;
    button.click(); return true;
  })()`);
  if (clicked) {
    await sleep(1200);
    await waitForInput(cdp, 10000);
  }
  return clicked;
}

async function waitForInput(cdp, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await evaluate(cdp, `Boolean(document.getElementById('rufus-text-area'))`)) return true;
    await sleep(750);
  }
  return false;
}

async function saveDebug(cdp, outDir, label) {
  const state = await evaluate(cdp, `(() => {
    const ta = document.getElementById('rufus-text-area');
    const panel = document.querySelector('.nav-rufus-content');
    return { url: location.href, title: document.title, inputFound: Boolean(ta), inputValue: ta?.value || '', inputDisabled: Boolean(ta?.disabled), panelTail: (panel?.innerText || '').slice(-2500) };
  })()`).catch((error) => ({ error: error.message }));
  fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(state, null, 2), "utf8");
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true }).catch(() => null);
  if (screenshot?.data) fs.writeFileSync(path.join(outDir, `${label}.png`), Buffer.from(screenshot.data, "base64"));
}

function extractAnswer(fullText, question, baseline) {
  let text = String(fullText ?? "").trim();
  if (baseline && text.startsWith(baseline)) text = text.slice(baseline.length).trim();
  const positions = [];
  for (const marker of [question, question.slice(0, 60), question.slice(0, 35)]) {
    const pos = text.lastIndexOf(marker);
    if (pos >= 0) positions.push(pos + marker.length);
  }
  if (positions.length) text = text.slice(Math.max(...positions)).trim();
  text = text.replace(/^customer question\s*/i, "").replace(/rufus has completed generating a response/gi, "").trim();
  const nextQuestionAt = text.search(/\n\s*Customer question\s*\n/i);
  if (nextQuestionAt > 0) text = text.slice(0, nextQuestionAt);
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length >= 30)?.trim() ?? "";
  if (firstLine) {
    const duplicateAt = text.indexOf(`\n. ${firstLine.slice(0, 60)}`);
    if (duplicateAt > 0) text = text.slice(0, duplicateAt);
  }
  const compactDuplicateAt = text.search(/\n\s*\.\s+[A-Z]/);
  if (compactDuplicateAt > 200) text = text.slice(0, compactDuplicateAt);
  const uiAt = text.search(/\s*(Your feedback has been submitted|Select All That Apply|Prime Day deals|Scheduled actions)/i);
  if (uiAt > 0) text = text.slice(0, uiAt);
  const followupUiAt = text.search(/\s+(How can I help\?|Compare with\s+similar|What do customers\s+say\?|Show price\s+history|Why you might like\s+this)/i);
  if (followupUiAt > 120) text = text.slice(0, followupUiAt);
  return stripProductCardUiNoise(text
    .replace(/Your feedback has been submitted!?/gi, "")
    .replace(/Select All That Apply[\s\S]*?(?:Dismiss|Submit|$)/gi, "")
    .replace(/\b(?:This is irrelevant|This is harmful|This is not accurate|This is not helpful)\b/gi, "")
    .replace(/\b(?:Dismiss|Submit)\b\s*$/gi, "")
    .replace(/\n?\{\}\n?/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim());
}

function importantQuestionTokens(question) {
  const stop = new Set(["this", "that", "with", "does", "will", "have", "much", "offer", "used", "work", "works", "case", "product", "asin", "iphone", "pro", "max", "for", "and", "the", "its", "any", "time"]);
  return [...new Set(String(question ?? "").toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [])]
    .filter((token) => !stop.has(token) && token.length >= 4)
    .slice(0, 10);
}

function questionTokenPatterns(token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const aliases = {
    yellow: ["yellow", "yellowing", "yellowed", "discolor", "discoloration", "non-yellowing", "anti-yellowing"],
    compatible: ["compatible", "compatibility"],
    protect: ["protect", "protects", "protected", "protection", "protective", "protector", "protectors"],
    protector: ["protector", "protectors", "protection", "protective"],
    charge: ["charge", "charges", "charging", "charger", "chargers"],
    charging: ["charging", "charge", "charger", "chargers"],
    magnetic: ["magnetic", "magnet", "magnets", "magsafe"],
    magsafe: ["magsafe", "magnetic", "magnet"],
    dissipate: ["dissipate", "dissipation", "heat"],
    dissipation: ["dissipation", "dissipate", "heat"],
  }[token] || [];
  const patterns = aliases.length
    ? aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    : [`${escaped}(?:s|ed|ing|ion|ions|ive|or|ors|er|ers)?`];
  return patterns.map((pattern) => new RegExp(`\\b${pattern}\\b`, "i"));
}

function answerMatchesQuestion(answer, question) {
  const tokens = importantQuestionTokens(question);
  if (!tokens.length) return true;
  const text = String(answer ?? "")
    .replace(/here are some things i can help with:[\s\S]*$/i, "")
    .replace(/\n?would you like (?:me to )?(?:see|show|recommend|know|find)[\s\S]*$/i, "")
    .toLowerCase();
  const hits = tokens.filter((token) => questionTokenPatterns(token).some((pattern) => pattern.test(text))).length;
  return hits >= Math.min(2, tokens.length);
}

function stripProductCardUiNoise(value) {
  return String(value ?? "")
    .replace(/\n?Here are some things I can help with:[\s\S]*$/i, "")
    .replace(/\n?Would you like (?:me to )?(?:see|show|recommend|know|find)[\s\S]*$/i, "")
    .replace(/([A-Z][^\n]{20,520}?)\d(?:\.\d)?Stars\([\d,]+\)[\s\S]{0,900}?Add to cart\s*([\s\S]{20,320}?)(?:More details|$)/gi, (_match, _title, reason) => {
      const cleanReason = String(reason || "").replace(/\s+/g, " ").trim();
      return cleanReason ? `${cleanReason}.` : "";
    })
    .replace(/[^\n]{20,520}?\d(?:\.\d)?Stars\([\d,]+\)[^\n]*/gi, "")
    .replace(/\b(?:\d+K\+ bought in past month|FREE delivery[^.\n]*|Limited time deal|Typical:\s*\$?\d+(?:\.\d{1,2})?|Add to cart|More details)\b/gi, "")
    .replace(/([.!?]["”]?)(?=[A-Z])/g, "$1 ")
    .replace(/([a-z])The stand\b/g, "$1\n\nThe stand")
    .replace(/([a-z])([A-Z][A-Za-z ]{2,30}:)/g, "$1\n\n$2")
    .replace(/\s*•\s*/g, "\n• ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\?\./g, "?")
    .replace(/\.{2,}/g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function answerQuality(answer, context = {}) {
  const text = stripProductCardUiNoise(answer).replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty_answer" };
  if (/Your feedback has been submitted|Select All That Apply|This is irrelevant|This is harmful|This is not accurate|This is not helpful/i.test(text)) {
    return { ok: false, reason: "ui_noise_contamination" };
  }
  const asksForProduct = /\b(which|what)\s+(specific\s+)?(?:product|case|item)\b|\bproduct page\b|\bshare (?:a link|the link)|\bproduct name\b|\bASIN would help\b|\bcould you (?:please )?(?:clarify|share|let me know)\b|\bdon't have (?:a|the) specific product\b|\bdon't see (?:a|the) specific product\b|\bneed (?:a bit more )?context\b|\bneed to know which\b|\bwhich case you're (?:asking|referring) about\b/i.test(text);
  if (asksForProduct) return { ok: false, reason: context.sourceContextAsin ? "missing_product_context_after_asin_page" : "missing_product_context" };
  if (context.expectedQuestion && !answerMatchesQuestion(text, context.expectedQuestion)) return { ok: false, reason: "question_mismatch_or_stale_answer" };
  if (!isSubstantiveAnswer(text)) return { ok: false, reason: "empty_or_ui_only_answer" };
  return { ok: true, reason: "" };
}

function questionForContext(item, context, productName, args = {}) {
  const question = String(item.question ?? "").trim();
  if (context.sourceContextAsin) return `For this product (ASIN ${context.sourceContextAsin}), ${question}`;
  const productContext = promptProductContext(item, productName, args);
  return `For ${productContext}, answer this Amazon shopper question without asking which exact product: ${question}`;
}

function isLikelyTruncated(answer) {
  const text = String(answer ?? "").trim();
  return text.length < 120 || /\b(than|and|or|to|with|for|because|but|the|a|an|is|are|of)$/i.test(text);
}

function isSubstantiveAnswer(answer) {
  const text = String(answer ?? "")
    .replace(/how can i help\??/gi, "")
    .replace(/what types of things can i\s*ask\??/gi, "")
    .replace(/your feedback has been submitted!?/gi, "")
    .replace(/select all that apply.*?(?:dismiss|submit)/gis, "")
    .replace(/prime day deals|scheduled actions|automate shopping, discovery, and savings/gi, "")
    .replace(/rufus has completed generating a response/gi, "")
    .replace(/\{\}/g, "")
    .trim();
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  return text.length >= 100 && words.length >= 20;
}

function sentenceSamples(answer, pattern, limit = 8) {
  const parts = String(answer).split(/(?<=[.!?])\s+|\r?\n+/).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  return [...new Set(parts.filter((part) => pattern.test(part) && part.length >= 20 && part.length <= 360))].slice(0, limit);
}

function evidenceText(values, language = "zh-CN") {
  const items = [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))];
  if (!items.length) return language === "zh-CN" ? SUMMARY_TEXT_ZH.noSourceEvidence : "No explicit source evidence found";
  return items.map((item) => `\u2022 ${item}`).join("\n");
}

function extractUserConcerns(answer) {
  const concernPattern = /\b(however|trade-?offs?|limitations?|actual (?:performance|results?|runtime)|advertised|only works|must|need to|compatible|incompatible|risk|concern|avoid|not suitable|doesn['’]t|cannot|can['’]t|may not|might not|less effective|struggl(?:e|es)|fail(?:s|ure)?|drain(?:s|ed)?|adds?|costs? more|price:|heavier|fatigue|pressure|pinching|heat buildup|wind noise|drop(?:s|ped)? connection|latency|briefly disconnect|one-size-fits-all rarely works|comfort is personal|less critical|limited to|depends on|compromise|downside|drawback|reduced? (?:battery|awareness|quality)|muffled|unnatural|harder to block|still hear|disables?|temporarily)\b/i;
  return sentenceSamples(answer, concernPattern, 24);
}

function extractBrandCandidates(answer) {
  const stop = new Set(["Amazon", "Bluetooth", "Portable", "Wireless", "True", "Stereo", "Budget", "Best", "More", "List", "FREE", "Prime", "Rufus", "Yes", "Tip", "Waterproof", "See", "Add", "Effectiveness", "Sound", "Weight", "Wind", "Call", "What", "Latency", "Real-world", "Try", "Read", "Would", "Comfort", "Battery", "Office", "Flight"]);
  const candidates = [];
  for (const line of String(answer).split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.length > 220 || !/(speaker|product|machine|device|model|pack|set|system|kit|brand)/i.test(clean)) continue;
    const first = clean.match(/^([A-Z][A-Za-z0-9+&'.-]{1,30})\b/)?.[1];
    if (first && !stop.has(first)) candidates.push(first);
  }
  return [...new Set(candidates)].slice(0, 12);
}

function parseAnswer(answer, question) {
  const lines = answer.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const followups = [...new Set(lines.filter((line) => /^(show|best|how|what|which|can|compare|tips|find)\b/i.test(line) && line.length <= 180))].slice(-8);
  const priceText = answer.replace(/\$\s*\r?\n\s*(\d)/g, "$$$1");
  const prices = [...new Set(priceText.match(/\$\s?\d+(?:\.\d{1,2})?(?:\s*[-–]\s*\$?\s?\d+(?:\.\d{1,2})?)?/g) ?? [])];
  const comparisonTargets = sentenceSamples(answer, /\b(compare|compared|versus|\bvs\.?\b|better than|alternative|instead of|difference between)\b/i, 8);
  const purchaseCriteria = sentenceSamples(answer, /\b(look for|consider|important|key factor|choose|depends on|best for|ideal for|tip:|must be|same model|compatible|to work)\b/i, 10);
  const userConcerns = sentenceSamples(answer, /\b(however|note:|limitation|only works|must|need to|compatible|risk|concern|avoid|not suitable|doesn['’]t|cannot|can['’]t)\b/i, 10);
  const buyerLanguage = [...new Set([question, ...followups, ...sentenceSamples(answer, /\b(for|when|if you|shoppers|buyers|users|travel|home|outdoor|gift|budget)\b/i, 12)])]
    .filter((line) => line && line.length <= 180 && !/(bought in past month|free delivery|add to cart|\bstars\b|\blist:)/i.test(line))
    .slice(0, 14);
  return {
    followups,
    prices,
    brands: extractBrandCandidates(answer),
    comparisonTargets,
    purchaseCriteria,
    userConcerns: extractUserConcerns(answer),
    buyerLanguage,
  };
}

function recommendationType(evidence, rank) {
  const text = String(evidence ?? "");
  if (/\b(top pick|best overall|our pick|best choice|recommended choice)\b/i.test(text)) return "top_pick";
  if (/\b(alternative|also consider|instead|runner[- ]?up|another option)\b/i.test(text)) return "alternative";
  if (/\b(compare|versus|\bvs\.?\b)\b/i.test(text)) return "comparison";
  return rank === 1 ? "first_shown" : "recommended";
}

function recommendationReasonForTitle(answer, title, fallback) {
  const fullAnswer = String(answer ?? "");
  const productTitle = String(title ?? "");
  let searchFrom = 0, titleIndex;
  while (productTitle && (titleIndex = fullAnswer.indexOf(productTitle, searchFrom)) >= 0) {
    const afterTitle = fullAnswer.slice(titleIndex + productTitle.length);
    const cartIndex = afterTitle.indexOf("Add to cart");
    if (cartIndex >= 0) {
      const reason = afterTitle.slice(cartIndex + "Add to cart".length).split(/More details|See more/i)[0].replace(/\s+/g, " ").trim();
      if (reason.length >= 20 && reason.length <= 800 && !/Stars\(|Add to cart/i.test(reason)) return reason;
    }
    const segment = afterTitle.split(/More details|See more/i)[0].replace(/\s+/g, " ").trim();
    const afterDelivery = segment.match(/FREE delivery(?:\s+\w+,)?\s+\w+\s+\d{1,2}([\s\S]+)$/i)?.[1]?.trim() || "";
    if (afterDelivery.length >= 20 && afterDelivery.length <= 800 && !/Stars\(|Add to cart/i.test(afterDelivery)) return afterDelivery;
    searchFrom = titleIndex + productTitle.length;
  }
  const titleTokens = String(title ?? "").match(/[A-Za-z0-9]{3,}/g) ?? [];
  const distinctive = titleTokens.filter((token) => !/^(the|and|with|for|portable|bluetooth|speaker|wireless|waterproof|black|blue)$/i.test(token)).slice(0, 5);
  const parts = String(answer ?? "").split(/\r?\n+|(?<=[.!?])\s+/).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  const matched = parts.filter((part) => distinctive.some((token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(part))).slice(0, 4);
  return (matched.join(" ") || fallback || "").slice(0, 1400);
}

function isBadRecommendedProduct(raw) {
  const asin = String(raw?.asin ?? "").toUpperCase().match(/^[A-Z0-9]{10}$/)?.[0] ?? "";
  const title = String(raw?.title ?? "").replace(/\s+/g, " ").trim();
  const evidence = String(raw?.evidenceExcerpt ?? raw?.recommendationReason ?? "").replace(/\s+/g, " ").trim();
  const titleLower = title.toLowerCase();
  if (!asin && !title) return true;
  if (/^(continue to site|learn more|have questions\??|more details|add to cart|see more details)$/i.test(title)) return true;
  if (!asin && /continue to site/i.test(title)) return true;
  if (/see more details and confirm pricing on \{?website\}? continue to site/i.test(evidence)) return true;
  if (!asin && title.length < 15) return true;
  if (!asin && !/(case|cover|protector|charger|mount|phone|iphone|samsung|speaker|earbuds|headphones|pack|kit|magnetic|magsafe|bumper|screen)/i.test(title)) return true;
  if (!asin && /^(privacy|conditions|advertising|amazon|customer service|returns|cart)$/i.test(titleLower)) return true;
  return false;
}

function normalizeRecommendedProducts(cards, answer = "") {
  const byProduct = new Map();
  for (const raw of cards ?? []) {
    const asin = String(raw.asin ?? "").toUpperCase().match(/^[A-Z0-9]{10}$/)?.[0] ?? "";
    const title = String(raw.title ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
    const evidenceExcerpt = String(raw.evidenceExcerpt ?? "").replace(/\s+/g, " ").trim().slice(0, 1400);
    if (isBadRecommendedProduct({ ...raw, asin, title, evidenceExcerpt })) continue;
    const rank = Number(raw.recommendationRank) || byProduct.size + 1;
    const item = {
      asin,
      title,
      url: String(raw.url ?? (asin ? `https://www.amazon.com/dp/${asin}` : "")).trim(),
      price: String(raw.price ?? "").trim(),
      imageUrl: String(raw.imageUrl ?? "").trim(),
      cardId: String(raw.cardId ?? "").trim(),
      recommendationRank: rank,
      recommendationType: recommendationType(evidenceExcerpt, rank),
      recommendationReason: String(raw.recommendationReason ?? "").trim() || recommendationReasonForTitle(answer, title, evidenceExcerpt),
      evidenceExcerpt,
      asinResolutionStatus: String(raw.asinResolutionStatus || (asin ? "direct_product_link" : "unresolved")),
    };
    const key = asin || title.toLowerCase();
    if (!byProduct.has(key)) byProduct.set(key, item);
  }
  return [...byProduct.values()].sort((a, b) => a.recommendationRank - b.recommendationRank);
}

function recommendedProductsFromAnswerText(answer) {
  const items = [], pattern = /([\s\S]{20,650}?)\d(?:\.\d)?Stars\([\d,]+\)[\s\S]{0,350}?Add to cart([\s\S]*?)(?=More details|$)/gi;
  let match;
  while ((match = pattern.exec(String(answer ?? "")))) {
    let title = match[1].replace(/^[\s\S]*?See more\s*/i, "").replace(/\s+/g, " ").trim();
    const seeMore = title.lastIndexOf("See more");
    if (seeMore >= 0) title = title.slice(seeMore + 8).trim();
    title = title.replace(/^More details\s*/i, "").trim();
    const reason = match[2].replace(/\s+/g, " ").trim();
    if (title.length < 20 || title.length > 500) continue;
    items.push({ asin: "", title, url: "", price: match[0].match(/\$\s?\d+(?:\.\d{1,2})?/)?.[0] || "", recommendationReason: reason, evidenceExcerpt: reason || match[0].slice(0, 1400), recommendationRank: items.length + 1 });
  }
  return normalizeRecommendedProducts(items, answer);
}

function recommendationSummary(products, language = "zh-CN") {
  if (!products?.length) return language === "zh-CN" ? SUMMARY_TEXT_ZH.noRecommendedCards : "No explicit recommended product cards found";
  return products.map((item) => `\u2022 ${item.asin || "UNRESOLVED"}${item.title ? ` | ${item.title}` : ""}${item.recommendationReason ? ` | ${item.recommendationReason}` : ""}`).join("\n");
}

function writeMarkdownUtf8Bom(filePath, content) {
  fs.writeFileSync(filePath, `${UTF8_BOM}${content}`, "utf8");
}

function flattenRecommendations(rows) {
  const output = [];
  for (const row of rows) {
    for (const item of row.recommendedProducts ?? []) {
      output.push({
        batchId: row.batchId,
        testStage: row.testStage || "initial",
        productName: row.productName,
        outputLanguage: row.outputLanguage,
        question: row.question,
        questionTheme: row.questionTheme,
        questionRole: row.questionRole,
        relationField: row.relationField,
        relationKey: row.relationKey,
        relationFieldZh: row.relationFieldZh,
        relationFieldGroup: row.relationFieldGroup,
        relationDefinitionZh: row.relationDefinitionZh,
        relationAskFocusZh: row.relationAskFocusZh,
        relationQuestionType: row.relationQuestionType,
        keywords: row.keywords,
        sourceAsins: row.asins,
        recommendedAsin: item.asin,
        candidateAsin: item.candidateAsin,
        recommendedTitle: item.title,
        recommendedUrl: item.url,
        recommendationRank: item.recommendationRank,
        recommendationType: item.recommendationType,
        recommendationReason: item.recommendationReason,
        evidenceExcerpt: item.evidenceExcerpt,
        price: item.price,
        imageUrl: item.imageUrl,
        asinResolutionStatus: item.asinResolutionStatus,
        capturedAt: row.answeredAt,
        status: row.status,
      });
    }
  }
  return output;
}

async function askRaw(cdp, question, maxWaitMs, context = {}) {
  const baseline = await panelText(cdp);
  const typed = await evaluate(cdp, `(() => {
    const ta = document.getElementById('rufus-text-area'); if (!ta) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    ta.focus(); setter.call(ta, ${JSON.stringify(question)}); ta.dispatchEvent(new Event('input', {bubbles:true})); ta.dispatchEvent(new Event('change', {bubbles:true})); return true;
  })()`);
  if (!typed) throw new Error("Alexa for Shopping input not found");
  const clickedSubmit = await evaluate(cdp, `(() => {
    const button = document.querySelector('#rufus-submit-button, button[aria-label="Submit"].rufus-submit-button');
    if (!button || button.disabled) return false;
    button.click(); return true;
  })()`);
  if (!clickedSubmit) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  }

  const start = Date.now();
  let previous = "", latest = "", lastGrowthAt = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await sleep(1250);
    await scrollRufusToBottom(cdp).catch(() => false);
    latest = await panelText(cdp);
    const answer = extractAnswer(latest, question, baseline);
    if (answer !== previous) lastGrowthAt = Date.now();
    previous = answer;
    const done = /rufus has completed generating a response/i.test(latest);
    const idleMs = Date.now() - lastGrowthAt;
    const quality = answerQuality(answer, context);
    if (quality.ok && !isLikelyTruncated(answer) && ((done && idleMs >= 5000) || idleMs >= 10000)) return answer;
    if (!quality.ok && /missing_product_context|ui_noise_contamination/i.test(quality.reason) && ((done && idleMs >= 5000) || idleMs >= 10000)) {
      throw new Error(`Alexa for Shopping answer quality failed: ${quality.reason}`);
    }
  }
  const answer = extractAnswer(latest, question, baseline);
  const quality = answerQuality(answer, context);
  if (!quality.ok) throw new Error(`Alexa for Shopping answer quality failed: ${quality.reason}`);
  if (!isSubstantiveAnswer(answer)) throw new Error(`Alexa for Shopping response was empty, UI-only, or too short (${answer.length} chars)`);
  return answer;
}

function mergeContinuation(first, continuation) {
  const left = String(first).trim();
  let right = String(continuation).trim();
  const maxOverlap = Math.min(500, left.length, right.length);
  for (let size = maxOverlap; size >= 30; size -= 1) {
    if (left.slice(-size).toLowerCase() === right.slice(0, size).toLowerCase()) {
      right = right.slice(size).trim();
      break;
    }
  }
  return `${left}${right ? `\n${right}` : ""}`.trim();
}

async function ask(cdp, question, maxWaitMs, context = {}) {
  let answer = await askRaw(cdp, question, maxWaitMs, context);
  for (let continuation = 0; continuation < 2 && isLikelyTruncated(answer); continuation += 1) {
    const next = await askRaw(cdp, "Continue exactly from where you stopped, without repeating previous content.", maxWaitMs, context);
    answer = mergeContinuation(answer, next);
  }
  if (isLikelyTruncated(answer)) throw new Error(`Alexa for Shopping response appears truncated (${answer.length} chars)`);
  const quality = answerQuality(answer, context);
  if (!quality.ok) throw new Error(`Alexa for Shopping answer quality failed: ${quality.reason}`);
  let recommendedProducts = [], recommendationCaptureError = "";
  try {
    for (let attempt = 0; attempt < 6 && !recommendedProducts.length; attempt += 1) {
      if (attempt) await sleep(1000);
      recommendedProducts = normalizeRecommendedProducts(await panelProductCards(cdp, question), answer);
    }
    if (!recommendedProducts.length) recommendedProducts = recommendedProductsFromAnswerText(answer);
  } catch (error) {
    recommendationCaptureError = error.message;
    console.warn(`[rufus-research] recommended-product capture failed: ${error.message}`);
  }
  return { answer, recommendedProducts, recommendationCaptureError };
}

function questionContext(item, searchUrl, args) {
  const useAsinContext = String(args["use-asin-context"] ?? "true").toLowerCase() !== "false";
  const itemAsins = splitAsins(item.asins);
  const sourceAsins = splitAsins(item.sourceAsins).length ? splitAsins(item.sourceAsins) : itemAsins;
  const sourceContextAsin = useAsinContext ? String(item.sourceContextAsin || item.asinContextAsin || itemAsins[0] || "").toUpperCase() : "";
  if (sourceContextAsin) {
    return {
      sourceContextMode: "asin_product_page",
      sourceContextAsin,
      sourceContextUrl: `https://www.amazon.com/dp/${sourceContextAsin}`,
      sourceAsins,
    };
  }
  return {
    sourceContextMode: "search_or_category",
    sourceContextAsin: "",
    sourceContextUrl: searchUrl,
    sourceAsins,
  };
}

async function navigateWithRetry(cdp, url, args, label = "page") {
  const retries = Math.max(1, Number(args["navigate-retries"] ?? 2));
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      try { await cdp.send("Page.stopLoading"); } catch {}
      await cdp.send("Page.navigate", { url });
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(1500 + attempt * 1500);
    }
  }
  throw new Error(`${label} navigation failed after ${retries + 1} attempts: ${lastError?.message || "unknown_error"}`);
}

async function prepareQuestionContext(cdp, context, args) {
  await navigateWithRetry(cdp, context.sourceContextUrl, args, context.sourceContextMode);
  const waitMs = Number(args["context-page-wait-ms"] ?? args["page-wait-ms"] ?? 8000);
  await sleep(waitMs);
  await openPanel(cdp);
  if (!await waitForInput(cdp, 15000)) throw new Error(`Alexa for Shopping panel/input did not become available for ${context.sourceContextMode}: ${context.sourceContextUrl}`);
}

async function captureListingSnapshot(cdp, asin, pageWaitMs) {
  const url = `https://www.amazon.com/dp/${asin}`;
  await navigateWithRetry(cdp, url, {}, `recommended ASIN ${asin}`);
  await sleep(pageWaitMs);
  const data = await evaluate(cdp, `(() => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const text = (selector) => clean(document.querySelector(selector)?.innerText || document.querySelector(selector)?.textContent || '');
    const list = (selector) => [...document.querySelectorAll(selector)].map((node) => clean(node.innerText || node.textContent || '')).filter(Boolean);
    const detailRows = [...document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li')].map((row) => clean(row.innerText || row.textContent || '')).filter(Boolean);
    const imageUrls = [...document.querySelectorAll('#landingImage, #altImages img')].flatMap((img) => [img.getAttribute('data-old-hires'), img.getAttribute('data-a-dynamic-image'), img.src]).filter(Boolean);
    const pageText = clean(document.body?.innerText || '');
    return {
      pageTitle: document.title,
      title: text('#productTitle'),
      brand: text('#bylineInfo'),
      price: text('#corePrice_feature_div .a-offscreen') || text('.a-price .a-offscreen'),
      coupon: text('#couponTextpctch') || text('#couponText') || text('[id*="coupon"]'),
      rating: document.querySelector('#acrPopover')?.getAttribute('title') || text('#averageCustomerReviews .a-icon-alt'),
      reviewCount: text('#acrCustomerReviewText'),
      availability: text('#availability'),
      prime: Boolean(document.querySelector('#primeBadge, i.a-icon-prime, [aria-label*="Prime"]')),
      fulfillment: text('#merchant-info') || text('#tabular-buybox'),
      bullets: list('#feature-bullets li .a-list-item'),
      productDetails: detailRows,
      aPlusText: (text('#aplus_feature_div') || text('#aplus') || text('.aplus-v2')).slice(0, 20000),
      imageUrls: [...new Set(imageUrls)].slice(0, 30),
      captcha: /enter the characters you see below|type the characters you see in this image/i.test(pageText),
    };
  })()`);
  if (data?.captcha) throw new Error("Amazon captcha blocked the ASIN snapshot");
  if (!data?.title) throw new Error("Amazon product title was not found");
  return { asin, url, ...data };
}

function titleMatchScore(left, right) {
  const stop = new Set(["the", "and", "with", "for", "portable", "bluetooth", "speaker", "wireless"]);
  const tokens = (value) => new Set((String(value ?? "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((token) => !stop.has(token)));
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter((token) => b.has(token)).length / Math.max(1, a.size);
}

async function resolveRecommendedProductAsin(cdp, title, pageWaitMs) {
  const shortQuery = String(title).split(",").slice(0, 2).join(",").slice(0, 180);
  const queries = [...new Set([title, shortQuery].filter(Boolean))];
  const targetRenewed = /\brenewed\b/i.test(title);
  let best = null;
  for (const query of queries) {
    await navigateWithRetry(cdp, `https://www.amazon.com/s?k=${encodeURIComponent(query)}`, {}, "recommended product search");
    await sleep(pageWaitMs);
    const candidates = await evaluate(cdp, `(() => [...document.querySelectorAll('[data-component-type="s-search-result"][data-asin]')].slice(0, 16).map((node) => ({
      asin: node.getAttribute('data-asin') || '',
      title: (node.querySelector('h2')?.innerText || node.querySelector('[data-cy="title-recipe"]')?.innerText || '').replace(/\\s+/g, ' ').trim(),
      url: node.querySelector('h2 a[href], a.a-link-normal[href*="/dp/"]')?.href || ''
    })).filter((item) => /^[A-Z0-9]{10}$/i.test(item.asin) && item.title))()`);
    const ranked = candidates.map((candidate) => {
      const renewedMismatch = /\brenewed\b/i.test(candidate.title) !== targetRenewed;
      return { ...candidate, score: titleMatchScore(title, candidate.title) - (renewedMismatch ? 0.45 : 0) };
    }).sort((a, b) => b.score - a.score);
    if (ranked[0] && (!best || ranked[0].score > best.score)) best = ranked[0];
    if (best?.score >= 0.8) break;
  }
  if (!best || best.score < 0.45) return null;
  return { asin: best.asin.toUpperCase(), url: best.url || `https://www.amazon.com/dp/${best.asin}`, matchedTitle: best.title, matchScore: best.score };
}

function saveListingSnapshots(outDir, snapshots) {
  const fields = ["batchId", "testStage", "productName", "asin", "title", "url", "brand", "price", "coupon", "rating", "reviewCount", "availability", "prime", "fulfillment", "bullets", "productDetails", "aPlusText", "imageUrls", "capturedAt", "status", "error"];
  const csvRows = snapshots.map((row) => ({
    ...row,
    bullets: Array.isArray(row.bullets) ? row.bullets.map((item) => `• ${item}`).join("\n") : row.bullets,
    productDetails: Array.isArray(row.productDetails) ? row.productDetails.map((item) => `• ${item}`).join("\n") : row.productDetails,
    imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls.join(" / ") : row.imageUrls,
  }));
  writeCsv(path.join(outDir, "rufus_recommended_asin_snapshots.csv"), fields, csvRows);
  fs.writeFileSync(path.join(outDir, "rufus_recommended_asin_snapshots.json"), JSON.stringify(snapshots, null, 2), "utf8");
}

function saveOutputs(outDir, rows) {
  const evidenceDir = path.join(outDir, "_evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const fields = ["batchId", "testStage", "productName", "outputLanguage", "question", "askedQuestion", "questionSource", "relatedOriginalQuestions", "questionTheme", "questionRole", "sourceType", "specialSignal", "relationField", "relationKey", "relationFieldZh", "relationFieldGroup", "relationDefinitionZh", "relationAskFocusZh", "relationQuestionType", "relationPromptIndex", "relationPriority", "occurrenceCount", "keywords", "asins", "sourceAsins", "asinContextIndex", "asinContextCount", "promptProductContext", "sourceContextMode", "sourceContextAsin", "sourceContextUrl", "recommendedAsins", "recommendedProductCount", "recommendationEvidence", "recommendationCaptureStatus", "rufusAnswer", "followUps", "brands", "prices", "comparisonTargets", "purchaseCriteria", "userConcerns", "buyerLanguage", "sourceUrl", "answeredAt", "status", "error"];
  writeCsv(path.join(outDir, "rufus_deep_answers.csv"), fields, rows);
  fs.writeFileSync(path.join(evidenceDir, "rufus_deep_answers.json"), JSON.stringify(rows, null, 2), "utf8");
  writeCsv(path.join(evidenceDir, "failed_questions.csv"), fields, rows.filter((row) => row.status !== "ok"));
  const recommendationFields = ["batchId", "testStage", "productName", "outputLanguage", "question", "questionTheme", "questionRole", "relationField", "relationKey", "relationFieldZh", "relationFieldGroup", "relationDefinitionZh", "relationAskFocusZh", "relationQuestionType", "keywords", "sourceAsins", "recommendedAsin", "candidateAsin", "recommendedTitle", "recommendedUrl", "recommendationRank", "recommendationType", "recommendationReason", "evidenceExcerpt", "price", "imageUrl", "asinResolutionStatus", "capturedAt", "status"];
  const recommendationRows = flattenRecommendations(rows);
  writeCsv(path.join(evidenceDir, "rufus_recommended_products.csv"), recommendationFields, recommendationRows);
  fs.writeFileSync(path.join(evidenceDir, "rufus_recommended_products.json"), JSON.stringify(recommendationRows, null, 2), "utf8");
  const successful = rows.filter((row) => row.status === "ok");
  const zh = (rows[0]?.outputLanguage ?? "zh-CN") === "zh-CN";
  let md = `# ${zh ? SUMMARY_TEXT_ZH.title : "Alexa for Shopping Deep Research"}: ${rows[0]?.productName ?? "research"}\n\n`;
  md += `${zh ? SUMMARY_TEXT_ZH.successfulAnswers : "Successful answers"}: ${successful.length}/${rows.length}\n\n`;
  successful.forEach((row, i) => {
    md += `## ${i + 1}. ${row.question}\n\n${row.rufusAnswer}\n\n`;
    if (row.relationField) md += `Relation field: ${row.relationField}${row.relationFieldZh ? ` | ${row.relationFieldZh}` : ""}\n\n`;
    if (row.followUps) md += `Follow-up${zh ? SUMMARY_TEXT_ZH.originalSuffix : ""}: ${row.followUps}\n\n`;
    if (row.brands) md += `${zh ? SUMMARY_TEXT_ZH.brands : "Brands"}: ${row.brands}\n\n`;
    if (row.prices) md += `${zh ? SUMMARY_TEXT_ZH.prices : "Prices"}: ${row.prices}\n\n`;
    if (row.purchaseCriteria) md += `${zh ? SUMMARY_TEXT_ZH.purchaseCriteria : "Purchase criteria evidence"}: ${row.purchaseCriteria}\n\n`;
    if (row.userConcerns) md += `${zh ? SUMMARY_TEXT_ZH.userConcerns : "User concern evidence"}: ${row.userConcerns}\n\n`;
  });
  writeMarkdownUtf8Bom(path.join(evidenceDir, "SUMMARY.md"), md);
}

const args = parseArgs(process.argv.slice(2));
const requestedOutputLanguage = normalizeLanguage(args["output-language"] ?? "zh-CN");
if (args["reprocess-file"]) {
  const inputPath = path.resolve(args["reprocess-file"]);
  const inputRows = /\.json$/i.test(inputPath)
    ? JSON.parse(fs.readFileSync(inputPath, "utf8"))
    : parseCsv(fs.readFileSync(inputPath, "utf8"));
  const reprocessed = inputRows.map((row) => {
    if (!row.rufusAnswer) return row;
    const cleanedAnswer = extractAnswer(row.rufusAnswer, row.question || "", "");
    const parsed = parseAnswer(cleanedAnswer, row.question || "");
    const recommendedProducts = Array.isArray(row.recommendedProducts) && row.recommendedProducts.length ? normalizeRecommendedProducts(row.recommendedProducts.map((item) => ({ ...item, recommendationReason: "" })), cleanedAnswer) : recommendedProductsFromAnswerText(cleanedAnswer);
    const quality = answerQuality(cleanedAnswer, { ...row, expectedQuestion: row.question });
    const truncated = isLikelyTruncated(cleanedAnswer);
    return {
      ...row,
      testStage: row.testStage || args["test-stage"] || "initial",
      outputLanguage: requestedOutputLanguage || row.outputLanguage || "zh-CN",
      questionSource: row.questionSource || "原始采集",
      relatedOriginalQuestions: row.relatedOriginalQuestions || row.question || "",
      rufusAnswer: cleanedAnswer,
      followUps: evidenceText(parsed.followups, requestedOutputLanguage), brands: evidenceText(parsed.brands, requestedOutputLanguage), prices: evidenceText(parsed.prices, requestedOutputLanguage),
      comparisonTargets: evidenceText(parsed.comparisonTargets, requestedOutputLanguage), purchaseCriteria: evidenceText(parsed.purchaseCriteria, requestedOutputLanguage),
      userConcerns: evidenceText(parsed.userConcerns, requestedOutputLanguage), buyerLanguage: evidenceText(parsed.buyerLanguage, requestedOutputLanguage),
      recommendedProducts,
      recommendedAsins: recommendedProducts.map((item) => item.asin).filter(Boolean).join(" / "),
      recommendedProductCount: recommendedProducts.length,
      recommendationEvidence: recommendationSummary(recommendedProducts, requestedOutputLanguage),
      recommendationCaptureStatus: recommendedProducts.length ? "reprocessed_from_answer_text" : (row.recommendationCaptureStatus || "not_recaptured"),
      status: !quality.ok ? "failed" : (truncated ? "partial" : row.status),
      error: !quality.ok ? `Alexa for Shopping answer quality failed: ${quality.reason}` : (truncated ? `Alexa for Shopping response appears truncated (${cleanedAnswer.length} chars)` : (row.error || "")),
    };
  });
  const reprocessOutDir = path.resolve(args["out-dir"] ?? path.dirname(inputPath));
  fs.mkdirSync(reprocessOutDir, { recursive: true });
  saveOutputs(reprocessOutDir, reprocessed);
  console.log(JSON.stringify({ ok: true, reprocessed: reprocessed.length, outDir: reprocessOutDir }, null, 2));
  process.exit(0);
}
const productName = requireArg(args, "product");
const outputLanguage = requestedOutputLanguage;
const questions = loadQuestions(args);
if (!questions.length) throw new Error("No questions found.");
const outDir = path.resolve(args["out-dir"] ?? path.join("output", `rufus_research_${productName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`));
fs.mkdirSync(outDir, { recursive: true });
const evidenceDir = path.join(outDir, "_evidence");
fs.mkdirSync(evidenceDir, { recursive: true });
const batchId = args["batch-id"] ?? `rufus_research_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const testStage = args["test-stage"] ?? "initial";
const cdpBase = args["cdp-base"] ?? "http://127.0.0.1:9222";
const keyword = args.keyword ?? productName;
const searchUrl = args["search-url"] ?? `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
const retries = Math.max(0, Number(args.retries ?? 2));
const maxWaitMs = Math.max(45000, Number(args["max-wait-ms"] ?? 180000));
if (args["dry-run"]) {
  const dryRunQuestions = questions.map((item) => {
    const context = questionContext(item, searchUrl, args);
    return { ...item, ...context, askedQuestion: questionForContext(item, context, productName, args) };
  });
  console.log(JSON.stringify({ ok: true, dryRun: true, productName, outputLanguage, batchId, testStage, searchUrl, outDir, questionCount: questions.length, questions: dryRunQuestions }, null, 2));
  process.exit(0);
}
const currentExistingPath = path.join(evidenceDir, "rufus_deep_answers.json");
const legacyExistingPath = path.join(outDir, "rufus_deep_answers.json");
const existingPath = fs.existsSync(currentExistingPath) ? currentExistingPath : legacyExistingPath;
const previousRows = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : [];
const successfulKeys = new Set(previousRows.filter((row) => row.status === "ok" && row.recommendationCaptureStatus && answerQuality(row.rufusAnswer, { ...row, expectedQuestion: row.question }).ok).map((row) => questionJobKey(row)));
const rows = previousRows.filter((row) => successfulKeys.has(questionJobKey(row)));
const currentSnapshotPath = path.join(evidenceDir, "rufus_recommended_asin_snapshots.json");
const legacySnapshotPath = path.join(outDir, "rufus_recommended_asin_snapshots.json");
const snapshotPath = fs.existsSync(currentSnapshotPath) ? currentSnapshotPath : legacySnapshotPath;
const snapshots = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, "utf8")) : [];
const snapshotKeys = new Set(snapshots.filter((row) => row.status === "ok").map((row) => `${row.batchId}|${row.asin}`));

const cdp = createCdp(await pageWsUrl(cdpBase), Math.max(30000, Number(args["cdp-command-timeout-ms"] ?? 60000)));
await cdp.open(); await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
try {
  for (let i = 0; i < questions.length; i += 1) {
    const item = questions[i], key = questionJobKey(item);
    if (successfulKeys.has(key)) { console.log(`[rufus-research] skip completed ${i + 1}/${questions.length}`); continue; }
    const context = questionContext(item, searchUrl, args);
    const qualityContext = { ...context, expectedQuestion: item.question };
    const askedQuestion = questionForContext(item, context, productName, args);
    let result = null, error = "";
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        await prepareQuestionContext(cdp, context, args);
        if (String(args["fresh-chat-per-question"] ?? "true").toLowerCase() !== "false") await startNewChat(cdp);
        console.log(`[rufus-research] Q${i + 1}/${questions.length}, attempt ${attempt + 1}, ${context.sourceContextMode}${context.sourceContextAsin ? ` ${context.sourceContextAsin}` : ""}: ${item.question}`);
        const asked = await ask(cdp, askedQuestion, maxWaitMs, qualityContext);
        const answer = asked.answer;
        const parsed = parseAnswer(answer, item.question);
        const recommendedProducts = asked.recommendedProducts;
        result = {
          batchId, testStage, productName, outputLanguage, ...item, ...context, askedQuestion, rufusAnswer: answer,
          recommendedProducts,
          recommendedAsins: recommendedProducts.map((product) => product.asin).join(" / "),
          recommendedProductCount: recommendedProducts.length,
          recommendationEvidence: recommendationSummary(recommendedProducts, outputLanguage),
          recommendationCaptureStatus: asked.recommendationCaptureError ? `failed: ${asked.recommendationCaptureError}` : "captured",
          followUps: evidenceText(parsed.followups, outputLanguage), brands: evidenceText(parsed.brands, outputLanguage), prices: evidenceText(parsed.prices, outputLanguage),
          comparisonTargets: evidenceText(parsed.comparisonTargets, outputLanguage), purchaseCriteria: evidenceText(parsed.purchaseCriteria, outputLanguage),
          userConcerns: evidenceText(parsed.userConcerns, outputLanguage), buyerLanguage: evidenceText(parsed.buyerLanguage, outputLanguage),
          sourceUrl: context.sourceContextUrl, answeredAt: new Date().toISOString(), status: "ok", error: "",
        };
        break;
      } catch (e) {
        error = e.message;
        await saveDebug(cdp, evidenceDir, `failed_q${i + 1}_attempt${attempt + 1}`);
      }
    }
    const noEvidence = outputLanguage === "zh-CN" ? "未发现明确原文证据" : "No explicit source evidence found";
    rows.push(result ?? { batchId, testStage, productName, outputLanguage, ...item, ...context, askedQuestion, recommendedProducts: [], recommendedAsins: "", recommendedProductCount: 0, recommendationEvidence: noEvidence, recommendationCaptureStatus: "failed", rufusAnswer: "", followUps: noEvidence, brands: noEvidence, prices: noEvidence, comparisonTargets: noEvidence, purchaseCriteria: noEvidence, userConcerns: noEvidence, buyerLanguage: noEvidence, sourceUrl: context.sourceContextUrl, answeredAt: new Date().toISOString(), status: "failed", error });
    saveOutputs(outDir, rows);
    await sleep(Number(args["between-questions-ms"] ?? 3000));
  }
  for (const row of rows) row.recommendedProducts = normalizeRecommendedProducts(row.recommendedProducts ?? [], row.rufusAnswer);
  const unresolvedByTitle = new Map();
  for (const row of rows) for (const product of row.recommendedProducts ?? []) if (!product.asin && product.title) unresolvedByTitle.set(product.title, product);
  const asinResolveWaitMs = Math.max(2500, Number(args["asin-resolve-wait-ms"] ?? 5000));
  const resolvedByTitle = new Map();
  for (const title of unresolvedByTitle.keys()) {
    try {
      console.log(`[rufus-research] resolve recommended product ASIN: ${title.slice(0, 90)}`);
      resolvedByTitle.set(title, await resolveRecommendedProductAsin(cdp, title, asinResolveWaitMs));
    } catch (error) {
      resolvedByTitle.set(title, { error: error.message });
    }
  }
  for (const row of rows) {
    row.recommendedProducts = normalizeRecommendedProducts(row.recommendedProducts ?? [], row.rufusAnswer);
    for (const product of row.recommendedProducts ?? []) {
      if (product.asin || !product.title) continue;
      const resolved = resolvedByTitle.get(product.title);
      if (resolved?.asin) {
        product.asin = resolved.asin;
        product.url = resolved.url;
        product.asinResolutionStatus = "amazon_search_title_match";
        product.asinMatchScore = resolved.matchScore;
      } else {
        product.asinResolutionStatus = resolved?.error ? `resolution_failed: ${resolved.error}` : "unresolved_title_match";
      }
    }
    row.recommendedAsins = (row.recommendedProducts ?? []).map((product) => product.asin).filter(Boolean).join(" / ");
    row.recommendedProductCount = (row.recommendedProducts ?? []).length;
    row.recommendationEvidence = recommendationSummary(row.recommendedProducts ?? [], row.outputLanguage);
  }
  saveOutputs(outDir, rows);
  if (String(args["enrich-recommended-asins"] ?? "true").toLowerCase() !== "false") {
    const uniqueRecommendations = new Map(flattenRecommendations(rows).filter((row) => row.recommendedAsin).map((row) => [row.recommendedAsin, row]));
    const asinPageWaitMs = Math.max(2500, Number(args["asin-page-wait-ms"] ?? 6500));
    for (const [asin] of uniqueRecommendations) {
      const snapshotKey = `${batchId}|${asin}`;
      if (snapshotKeys.has(snapshotKey) && !args["refresh-asin-snapshots"]) continue;
      let snapshot;
      try {
        console.log(`[rufus-research] snapshot recommended ASIN ${asin}`);
        snapshot = { batchId, testStage, productName, ...(await captureListingSnapshot(cdp, asin, asinPageWaitMs)), capturedAt: new Date().toISOString(), status: "ok", error: "" };
        const recommendation = uniqueRecommendations.get(asin);
        const snapshotMatchScore = titleMatchScore(recommendation?.recommendedTitle, snapshot.title);
        const renewedMismatch = /\brenewed\b/i.test(recommendation?.recommendedTitle || "") !== /\brenewed\b/i.test(snapshot.title || "");
        if (snapshotMatchScore < 0.45 || renewedMismatch) {
          snapshot.status = "mismatch";
          snapshot.error = `Resolved ASIN title mismatch (score=${snapshotMatchScore.toFixed(2)}, renewedMismatch=${renewedMismatch})`;
          for (const row of rows) for (const product of row.recommendedProducts ?? []) if (product.asin === asin) {
            product.candidateAsin = asin;
            product.asin = "";
            product.url = "";
            product.asinResolutionStatus = "listing_title_mismatch";
          }
        }
      } catch (error) {
        snapshot = { batchId, testStage, productName, asin, url: `https://www.amazon.com/dp/${asin}`, capturedAt: new Date().toISOString(), status: "failed", error: error.message };
      }
      const oldIndex = snapshots.findIndex((row) => `${row.batchId}|${row.asin}` === snapshotKey);
      if (oldIndex >= 0) snapshots[oldIndex] = snapshot; else snapshots.push(snapshot);
      if (snapshot.status === "ok") snapshotKeys.add(snapshotKey);
      saveListingSnapshots(evidenceDir, snapshots);
      await sleep(Number(args["between-asins-ms"] ?? 2000));
    }
  }
  for (const row of rows) {
    row.recommendedProducts = normalizeRecommendedProducts(row.recommendedProducts ?? [], row.rufusAnswer);
    row.recommendedAsins = (row.recommendedProducts ?? []).map((product) => product.asin).filter(Boolean).join(" / ");
    row.recommendedProductCount = (row.recommendedProducts ?? []).length;
    row.recommendationEvidence = recommendationSummary(row.recommendedProducts ?? [], row.outputLanguage);
  }
  saveListingSnapshots(evidenceDir, snapshots);
} finally { cdp.close(); }

saveOutputs(outDir, rows);
console.log(JSON.stringify({ ok: true, batchId, testStage, total: rows.length, successful: rows.filter((row) => row.status === "ok").length, failed: rows.filter((row) => row.status !== "ok").length, recommendedProducts: flattenRecommendations(rows).length, uniqueRecommendedAsins: new Set(flattenRecommendations(rows).map((row) => row.recommendedAsin).filter(Boolean)).size, asinSnapshots: snapshots.filter((row) => row.status === "ok").length, outDir }, null, 2));
