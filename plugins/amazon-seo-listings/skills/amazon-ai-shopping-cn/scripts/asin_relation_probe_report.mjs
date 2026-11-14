import fs from "node:fs";
import path from "node:path";
import { writeCsv as writeCsvZh } from "./csv_zh.mjs";
import { generateRelationProbeVisualReport, writeRelationProbeSemanticInput } from "./relation_probe_visual_report.mjs";

const SCRIPT_VERSION = "0.2.30";

const RELATIONS = [
  ["is_a", "这是什么类型的产品", "What type of product is {product}? Describe its category, subcategory, product form, and Amazon shopper language."],
  ["used_as", "它可以替代什么、具有什么功能等效性", "What products can {product} replace or function like for Amazon shoppers, and what traditional category functions can it perform?"],
  ["used_on", "它适用于身体的哪一部分或对象", "What body part, object, surface, or target is {product} used on, attached to, applied to, or meant to affect?"],
  ["used_in_location", "通常在什么场所使用", "Where do Amazon shoppers usually use {product}, such as rooms, spaces, environments, or indoor/outdoor locations?"],
  ["used_for_func", "该产品具体执行什么功能", "What specific functions does {product} perform for shoppers?"],
  ["capable_of", "它具备哪些能力或用途", "What is {product} capable of doing, and what capability limits should shoppers know before buying?"],
  ["used_for_event", "适用于哪些场景、节日或特殊情境", "What events, seasons, holidays, gifting moments, or special situations is {product} commonly used for?"],
  ["used_to", "它用于实现什么目标或完成什么任务", "What goal, outcome, or task are shoppers trying to accomplish when buying {product}?"],
  ["used_with", "它通常与哪些产品一起使用", "What products, accessories, or related categories are commonly used together with {product}?"],
  ["used_by", "通常由谁使用", "Who directly uses {product}, and who usually buys it? Include age, gender, identity, or relationship roles when relevant."],
  ["xInterest_in", "目标用户的兴趣爱好", "If someone is interested in {product}, what related interests, styles, hobbies, or shopping needs do they usually have?"],
  ["xIs_a", "用户的身份或角色", "What kind of shopper persona is most likely to want {product}?"],
  ["xWant", "用户期望通过产品达成什么愿望或目标", "What outcome, feeling, or problem does a shopper want to address when buying {product}?"],
  ["used_for_audience", "产品面向的主要人群或受众", "Who is {product} primarily intended for as a user, recipient, or target audience?"],
  ["used_in_body", "产品作用于身体的哪些部位", "Which body areas, coverage zones, or body movements does {product} support? If this is not a body-use product, explain the actual use target."],
];

const PAGE_CONTAMINATION_MARKERS = [
  "Skip to Main content",
  "Keyboard shortcuts",
  "Delivering to",
  "Returns & Orders",
  "Click to see full view",
  "VIDEOS",
  "Add to cart",
  "Buy Now",
  "About this item",
  "Frequently bought together",
  "Product information",
  "Customer reviews",
  "Top reviews from the United States",
  "Back to top",
  "Make Money with Us",
  "Amazon Music",
  "Amazon Ads",
];

const GENERATING_MARKERS = [
  "Thinking...",
  "thinking…",
  "currently generating",
  "Rufus is currently generating",
  "The Rufus is currently generating",
  "Scheduled actions Automate shopping",
  "Generating response",
];

const COMPLETION_UI_MARKERS = [
  "Rufus has completed generating a response",
  "Alexa has completed generating a response",
];

const ASSISTANT_UI_NOISE_MARKERS = [
  "Chat history",
  "New chat",
  "Get started",
  "What do you need help with today?",
  "Select All That Apply",
  "This is inaccurate",
  "This is irrelevant",
  "This is harmful / unsafe",
  "Something else",
  "Dismiss",
  "Your feedback has been submitted",
  "Here are some things I can help with",
  "Automate shopping, discovery, and savings",
  "Feedback controls",
  "thumbs up feedback",
  "Thumbs up feedback",
  "thumbs down feedback",
  "Thumbs down feedback",
  "Select All That Apply (optional):",
  "More options",
  "Submit",
  "{}",
];

const PANEL_UI_LINE_PATTERNS = [
  /^Ask Alexa$/i,
  /^Alexa AI$/i,
  /^Rufus$/i,
  /^Looking for specific info\??$/i,
  /^Ask something else$/i,
  /^Have questions\??$/i,
  /^Search this page$/i,
  /^Rufus has completed generating a response$/i,
  /^Alexa has completed generating a response$/i,
  /^\{\}$/,
  /^Your feedback has been submitted$/i,
  /^Thank you for your feedback$/i,
  /^Was this helpful\??$/i,
  /^Helpful$/i,
  /^Not helpful$/i,
  /^Share$/i,
  /^Copy$/i,
  /^Close$/i,
  /^Sponsored/i,
  /^Show\/Hide shortcuts/i,
  /^Scheduled actions/i,
  /^Thinking/i,
  /currently generating/i,
  /^Generating response/i,
];

const BUSINESS_FAILURE_REASON_ZH = {
  ok: "",
  answer_still_generating: "生成未完成",
  answer_generation_timeout: "生成超时",
  assistant_input_not_found_in_panel: "输入框丢失",
  assistant_input_not_found_after_opening_composer: "输入框丢失",
  assistant_composer_root_not_found: "Alexa for Shopping输入区根容器未找到",
  assistant_composer_not_found: "Alexa for Shopping输入区未找到",
  no_dom_input_after_composer_click: "点击输入区后未出现可写输入控件",
  send_button_not_found: "发送按钮未找到",
  question_submit_not_confirmed: "问题提交未确认",
  assistant_panel_not_found: "面板定位失败",
  assistant_panel_not_found_before_submit: "面板定位失败",
  assistant_panel_contaminated: "回答污染",
  answer_text_contaminated: "回答污染",
  empty_assistant_panel: "空面板",
  empty_panel_answer: "空答案",
  failed: "脚本异常",
  low_confidence_generic_answer: "答案泛泛/未匹配商品",
};

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
  return String(value ?? "").split(/[|,\r\n]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeAsin(value) {
  return String(value ?? "").trim().toUpperCase();
}

function slugify(value) {
  return String(value ?? "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function formatQuestion(template, productName) {
  return template.replaceAll("{product}", productName);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasCjk(value) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(String(value ?? ""));
}

function cleanAmazonTitle(value) {
  return cleanText(value)
    .replace(/^Amazon\.com:\s*/i, "")
    .replace(/\s*:\s*Amazon\.com.*$/i, "")
    .replace(/\s*:\s*Cell Phones\s*&\s*Accessories.*$/i, "")
    .replace(/\s*:\s*Electronics.*$/i, "");
}

function compactProductLabel(value) {
  const title = cleanAmazonTitle(value);
  if (!title || hasCjk(title)) return "";
  const phoneContext = /\b(iPhone|phone|cellphone|smartphone|Samsung|Galaxy|Pixel|Motorola|Moto|OnePlus)\b/i.test(title);
  if (/\bearbuds?\b/i.test(title)) return "these earbuds";
  if (/\bheadphones?\b/i.test(title)) return "these headphones";
  if (/\bearphones?\b/i.test(title)) return "these earphones";
  if (phoneContext && /\b(case|cover|shell)\b/i.test(title)) {
    return "this case";
  }
  if (/\bcase\b/i.test(title)) {
    return "this case";
  }
  if (/\bcover\b/i.test(title)) {
    return "this cover";
  }
  if (/\bscreen\s+protector\b/i.test(title)) {
    return "this screen protector";
  }
  if (/\bprotector\b/i.test(title)) {
    return "this protector";
  }
  return "";
}

function questionProductName(productTitle, fallbackProductName) {
  const candidates = [productTitle, fallbackProductName].map(cleanAmazonTitle).filter(Boolean);
  const compact = candidates.map(compactProductLabel).find(Boolean);
  if (compact) return compact;
  const cleanCandidate = candidates.find((candidate) => candidate.length >= 3 && !hasCjk(candidate) && candidate.length <= 60);
  return cleanCandidate || "this item";
}

function cleanPanelText(value) {
  return String(value ?? "")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function contaminationHits(text) {
  const value = String(text ?? "");
  return PAGE_CONTAMINATION_MARKERS.filter((marker) => value.includes(marker));
}

function generationHits(text) {
  const value = stripCompletionMarkers(String(text ?? ""));
  return GENERATING_MARKERS.filter((marker) => value.toLowerCase().includes(marker.toLowerCase()));
}

function textAfterCurrentQuestion(text, question) {
  const normalized = cleanText(text);
  const questionKey = cleanText(question);
  if (!normalized || !questionKey) return "";
  const lower = normalized.toLowerCase();
  const qLower = questionKey.toLowerCase();
  const candidateTails = [];
  let searchFrom = 0;
  while (true) {
    const index = lower.indexOf(qLower, searchFrom);
    if (index < 0) break;
    candidateTails.push(normalized.slice(index + questionKey.length).trim());
    searchFrom = index + Math.max(1, qLower.length);
  }
  if (!candidateTails.length) {
    const prefix = qLower.slice(0, Math.min(60, qLower.length));
    if (prefix.length >= 24) {
      let prefixSearchFrom = 0;
      while (true) {
        const index = lower.indexOf(prefix, prefixSearchFrom);
        if (index < 0) break;
        candidateTails.push(normalized.slice(index + prefix.length).trim());
        prefixSearchFrom = index + Math.max(1, prefix.length);
      }
    }
  }
  if (!candidateTails.length) {
    const marker = "customer question";
    let markerSearchFrom = 0;
    while (true) {
      const markerIndex = lower.indexOf(marker, markerSearchFrom);
      if (markerIndex < 0) break;
      const tail = normalized.slice(markerIndex + marker.length).trim();
      const questionEnd = tail.indexOf("?");
      if (questionEnd >= 0 && questionEnd < 900) candidateTails.push(tail.slice(questionEnd + 1).trim());
      else candidateTails.push(tail);
      markerSearchFrom = markerIndex + marker.length;
    }
  }
  if (!candidateTails.length) return "";
  return candidateTails
    .map((tail) => ({ tail, score: stripPanelUiLines(tail, question).length }))
    .sort((a, b) => b.score - a.score || b.tail.length - a.tail.length)[0].tail;
}

function splitBeforeGeneration(text) {
  const value = String(text ?? "");
  const lower = value.toLowerCase();
  const hits = generationHits(value);
  let firstIndex = -1;
  for (const marker of GENERATING_MARKERS) {
    const index = lower.indexOf(marker.toLowerCase());
    if (index >= 0 && (firstIndex < 0 || index < firstIndex)) firstIndex = index;
  }
  return {
    beforeGeneration: firstIndex >= 0 ? value.slice(0, firstIndex).trim() : value,
    hits,
  };
}

function commonPrefixLength(a, b) {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

function stripCompletionMarkers(text) {
  let cleaned = String(text ?? "");
  for (const marker of COMPLETION_UI_MARKERS) {
    cleaned = cleaned.replaceAll(marker, "\n");
  }
  return cleaned;
}

function stripPanelUiLines(text, question) {
  const questionKey = cleanText(question).toLowerCase();
  return cleanPanelText(stripCompletionMarkers(text))
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .map((line) => {
      let cleanedLine = line;
      for (const marker of ASSISTANT_UI_NOISE_MARKERS) {
        const index = cleanedLine.toLowerCase().indexOf(marker.toLowerCase());
        if (index === 0) return "";
        if (index > 0) cleanedLine = cleanedLine.slice(0, index).trim();
      }
      return cleanedLine;
    })
    .filter(Boolean)
    .filter((line) => {
      if (PANEL_UI_LINE_PATTERNS.some((pattern) => pattern.test(line))) return false;
      if (questionKey && cleanText(line).toLowerCase() === questionKey) return false;
      if (/^Customer question$/i.test(line)) return false;
      if (line.endsWith("?") && line.length < 220) return false;
      return true;
    })
    .join("\n");
}

function dedupeAnswerText(text) {
  const dedupeLineSentences = (line) => {
    const sentences = String(line ?? "").split(/(?<=[.!])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
    if (sentences.length <= 1) return line;
    const seenSentences = new Set();
    const uniqueSentences = [];
    for (const sentence of sentences) {
      const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (key.length > 40 && seenSentences.has(key)) continue;
      if (key.length > 40) seenSentences.add(key);
      uniqueSentences.push(sentence);
    }
    return uniqueSentences.join(" ");
  };
  const lines = cleanPanelText(text).split(/\n+/).map((line) => cleanText(line)).filter(Boolean);
  const seenLines = new Set();
  const uniqueLines = [];
  for (const line of lines) {
    const cleanedLine = dedupeLineSentences(line);
    const key = cleanedLine.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
    if (key.length > 20 && seenLines.has(key)) continue;
    if (key.length > 20) seenLines.add(key);
    uniqueLines.push(cleanedLine);
  }
  return cleanText(uniqueLines.join("\n"));
}

function extractPanelAnswer({ beforeText, afterText, question }) {
  const before = cleanPanelText(beforeText);
  const after = cleanPanelText(afterText);
  if (!after) return { answer: "", status: "empty_assistant_panel" };

  const fullPanelHits = contaminationHits(after);
  if (fullPanelHits.length >= 3) {
    return { answer: "", status: `assistant_panel_contaminated:${fullPanelHits.join("|") || "oversized_panel_text"}` };
  }

  let candidate = textAfterCurrentQuestion(after, question);
  const usedQuestionScopedCandidate = Boolean(candidate);
  if (!candidate) {
    candidate = after;
    if (before && after.startsWith(before)) {
      candidate = after.slice(before.length);
    } else if (before) {
      candidate = after.slice(commonPrefixLength(before, after));
    }

    const questionText = cleanText(question);
    const questionIndex = candidate.toLowerCase().lastIndexOf(questionText.toLowerCase());
    if (questionText && questionIndex >= 0) {
      candidate = candidate.slice(questionIndex + questionText.length);
    }
  }
  if (!usedQuestionScopedCandidate && after.length > 60000) {
    return { answer: "", status: "assistant_panel_contaminated:oversized_panel_text_without_question_scope" };
  }

  const generation = splitBeforeGeneration(candidate);
  if (generation.hits.length > 0) {
    const fullCandidateAnswer = dedupeAnswerText(stripPanelUiLines(candidate, question));
    const partialAnswer = dedupeAnswerText(stripPanelUiLines(generation.beforeGeneration, question));
    const bestVisibleAnswer = fullCandidateAnswer.length >= partialAnswer.length ? fullCandidateAnswer : partialAnswer;
    if (bestVisibleAnswer.length >= 80) {
      const visibleAnswerHits = contaminationHits(bestVisibleAnswer);
      const visibleAssistantUiHits = ASSISTANT_UI_NOISE_MARKERS.filter((marker) => bestVisibleAnswer.toLowerCase().includes(marker.toLowerCase()));
      if (visibleAssistantUiHits.length > 0) {
        return { answer: "", status: `answer_text_contaminated:${visibleAssistantUiHits.join("|")}` };
      }
      if (bestVisibleAnswer.length > 30000 || visibleAnswerHits.length >= 2) {
        return { answer: "", status: `answer_text_contaminated:${visibleAnswerHits.join("|") || "oversized_answer_text"}` };
      }
      return { answer: bestVisibleAnswer, status: "ok" };
    }
    return { answer: "", status: `answer_still_generating:${generation.hits.join("|")}` };
  }

  let answer = stripPanelUiLines(candidate, question);
  if (!answer || cleanText(answer).length < 20) {
    answer = stripPanelUiLines(after, question);
  }
  answer = dedupeAnswerText(answer);
  const assistantUiHits = ASSISTANT_UI_NOISE_MARKERS.filter((marker) => answer.toLowerCase().includes(marker.toLowerCase()));
  if (assistantUiHits.length > 0) {
    return { answer: "", status: `answer_text_contaminated:${assistantUiHits.join("|")}` };
  }

  const answerHits = contaminationHits(answer);
  if (answer.length > 30000 || answerHits.length >= 2) {
    return { answer: "", status: `answer_text_contaminated:${answerHits.join("|") || "oversized_answer_text"}` };
  }
  const stillGenerating = generationHits(answer);
  if (stillGenerating.length > 0) {
    return { answer: "", status: `answer_still_generating:${stillGenerating.join("|")}` };
  }
  if (!answer || answer.length < 20) return { answer: "", status: "empty_panel_answer" };
  return { answer, status: "ok" };
}

function qualityCheckAnswer({ answer, productTitle, productName }) {
  if (!answer) return { status: "no_answer", reason: "无回答文本" };
  const lower = answer.toLowerCase();
  const tokens = Array.from(new Set(`${productTitle} ${productName}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .filter((token) => !["with", "this", "that", "from", "amazon", "product", "case"].includes(token))))
    .slice(0, 18);
  const hits = tokens.filter((token) => lower.includes(token));
  const categoryHints = ["case", "phone", "iphone", "cover", "magsafe", "magnetic", "stand", "screen", "camera", "protect"];
  const categoryHits = categoryHints.filter((token) => lower.includes(token));
  if (tokens.length >= 4 && hits.length < 1 && categoryHits.length < 2) {
    return { status: "low_confidence_generic_answer", reason: `商品词命中不足；命中=${hits.join("|") || "无"}` };
  }
  return { status: "product_specific", reason: `商品词命中=${hits.join("|") || "少量"}；品类词命中=${categoryHits.join("|") || "少量"}` };
}

function normalizeStatusPrefix(status) {
  return String(status ?? "").split(":")[0];
}

function businessFailureReason(answerStatus, qualityStatus) {
  if (answerStatus === "ok" && qualityStatus === "product_specific") return "";
  const key = answerStatus === "ok" ? qualityStatus : normalizeStatusPrefix(answerStatus);
  return BUSINESS_FAILURE_REASON_ZH[key] ?? key;
}

async function getAssistantSnapshot(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value ?? "")
      .replace(/\r/g, "\n")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const visible = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
    };
    const uniqueText = (value) => {
      const seen = new Set();
      return clean(String(value ?? "")
        .split(/\n+/)
        .map((line) => clean(line))
        .filter(Boolean)
        .filter((line) => {
          const key = line.toLowerCase().replace(/[^a-z0-9]+/g, "");
          if (key.length > 20 && seen.has(key)) return false;
          if (key.length > 20) seen.add(key);
          return true;
        })
        .join("\n"));
    };
    const shadowText = (root) => {
      const parts = [];
      const scan = (node) => {
        const elements = node?.querySelectorAll ? Array.from(node.querySelectorAll("*")) : [];
        for (const child of elements) {
          if (!(child instanceof HTMLElement)) continue;
          if (child.shadowRoot) {
            parts.push(child.shadowRoot.textContent || "");
            scan(child.shadowRoot);
          }
        }
      };
      scan(root);
      return clean(parts.join("\n"));
    };
    const attrText = (el) => clean([
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("alt"),
      el.getAttribute("placeholder"),
      "value" in el ? el.value : "",
    ].filter(Boolean).join("\n"));
    const visibleDescendantText = (root) => {
      const parts = [];
      const elements = [root, ...Array.from(root.querySelectorAll("*"))];
      for (const child of elements) {
        if (!(child instanceof HTMLElement) || !visible(child)) continue;
        parts.push(child.innerText || "");
        parts.push(child.textContent || "");
        parts.push(attrText(child));
        if (child.shadowRoot) {
          parts.push(child.shadowRoot.textContent || "");
        }
      }
      return clean(parts.filter(Boolean).join("\n"));
    };
    const textFrom = (el) => uniqueText([
      el.innerText || "",
      el.textContent || "",
      attrText(el),
      shadowText(el),
      visibleDescendantText(el),
    ].filter(Boolean).join("\n"));
    const answerMarker = /Customer question|Thinking|currently generating|complete breakdown|protective|direct users|function|capable|used for|commonly used|shoppers|buyers|persona|MagSafe|drop protection/i;
    const descriptor = (el) => {
      const id = el.id ? `#${el.id}` : "";
      const className = String(el.className || "").split(/\s+/).filter(Boolean).slice(0, 4).map((name) => `.${name}`).join("");
      const testId = el.getAttribute("data-testid") ? `[data-testid="${el.getAttribute("data-testid")}"]` : "";
      const role = el.getAttribute("role") ? `[role="${el.getAttribute("role")}"]` : "";
      return `${el.tagName.toLowerCase()}${id}${testId}${role}${className}`;
    };
    const hasAssistantAttr = (el) => /rufus|alexa|assistant/i.test([
      el.id,
      el.className,
      el.getAttribute("data-testid"),
      el.getAttribute("aria-label"),
      el.getAttribute("role"),
    ].filter(Boolean).join(" "));
    const inputSelector = 'textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]), [contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
    const hasInput = (el) => Boolean(el.querySelector(inputSelector));
    const hasSendControl = (el) => Array.from(el.querySelectorAll('button, [role="button"], input[type="submit"], a'))
      .some((control) => /send|ask|submit|arrow/i.test([control.innerText, control.value, control.getAttribute("aria-label"), control.className].filter(Boolean).join(" ")));
    const pageNoise = /Skip to Main content|Add to cart|Buy Now|About this item|Customer reviews|Frequently bought together|Back to top|Make Money with Us|Amazon Music|Click to see full view|VIDEOS/i;
    const marker = /Ask Alexa|Alexa AI|Rufus|Ask something else|Looking for specific info|shopping question/i;
    const snapshotFrom = (el, score = 0, source = "dom_candidate") => {
      const text = textFrom(el);
      if (!text || text.length < 8) return null;
      const rect = el.getBoundingClientRect();
      return {
        found: true,
        selector: descriptor(el),
        text,
        textLength: text.length,
        score,
        hasInput: hasInput(el),
        hasAssistantAttr: hasAssistantAttr(el),
        source,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    };
    const pointSampleSnapshot = () => {
      const candidates = new Map();
      const xs = [24, 80, 160, 260, 360, Math.min(430, Math.round(window.innerWidth * 0.34))].filter((x) => x >= 0 && x < window.innerWidth);
      const ys = [];
      for (let y = 60; y < window.innerHeight - 40; y += 90) ys.push(y);
      for (const x of xs) {
        for (const y of ys) {
          for (const hit of document.elementsFromPoint(x, y)) {
            let node = hit;
            for (let depth = 0; node && node !== document.body && depth < 9; depth += 1, node = node.parentElement) {
              if (!(node instanceof HTMLElement) || !visible(node)) continue;
              const rect = node.getBoundingClientRect();
              const attrs = [node.id, node.className, node.getAttribute("data-testid"), node.getAttribute("aria-label"), node.getAttribute("role")].filter(Boolean).join(" ");
              const looksLikeLeftPanel = rect.left <= 460 && rect.right <= 720 && rect.width >= 260 && rect.width <= 620 && rect.height >= 220;
              const assistantLike = /rufus|alexa|assistant/i.test(attrs);
              if (!looksLikeLeftPanel && !assistantLike) continue;
              const text = textFrom(node);
              if (!text || text.length < 8 || text.length > 20000) continue;
              let score = 80;
              if (assistantLike) score += 70;
              if (looksLikeLeftPanel) score += 60;
              if (marker.test(text)) score += 30;
              if (answerMarker.test(text)) score += 45;
              if (hasInput(node)) score += 12;
              if (hasSendControl(node)) score += 6;
              if (pageNoise.test(text)) score -= 90;
              const key = node;
              const existing = candidates.get(key);
              if (!existing || score > existing.score || text.length > existing.text.length) {
                candidates.set(key, { el: node, text, score });
              }
            }
          }
        }
      }
      const ranked = Array.from(candidates.values()).sort((a, b) => b.score - a.score || b.text.length - a.text.length);
      const best = ranked[0];
      if (!best || best.score < 90) return null;
      const snapshot = snapshotFrom(best.el, best.score, "left_panel_point_sample");
      return snapshot && snapshot.textLength >= 8 ? snapshot : null;
    };
    const preferredSelectors = ["#nav-flyout-rufus", "#nav-rufus-content", "#rufus-container", "#rufus-container-main-view", "#rufus-conversation-container"];
    let preferredFallback = null;
    for (const selector of preferredSelectors) {
      const el = document.querySelector(selector);
      if (!visible(el)) continue;
      const snapshot = snapshotFrom(el, 1000, "preferred_selector");
      if (!snapshot) continue;
      if (snapshot.textLength >= 120 || answerMarker.test(snapshot.text)) return snapshot;
      preferredFallback ??= snapshot;
    }
    const pointSnapshot = pointSampleSnapshot();
    if (pointSnapshot && (pointSnapshot.textLength >= 120 || answerMarker.test(pointSnapshot.text))) return pointSnapshot;
    const candidates = [];
    const elements = Array.from(document.querySelectorAll("body *")).filter(visible);
    for (const el of elements) {
      const ownText = textFrom(el);
      const attrs = [el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label"), el.getAttribute("role")].filter(Boolean).join(" ");
      if (!marker.test(ownText) && !marker.test(attrs) && !hasAssistantAttr(el)) continue;
      let node = el;
      for (let depth = 0; node && node !== document.body && depth < 7; depth += 1, node = node.parentElement) {
        if (!visible(node)) continue;
        const text = textFrom(node);
        if (!text || text.length < 8 || text.length > 16000) continue;
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        let score = 0;
        if (marker.test(text)) score += 12;
        if (hasAssistantAttr(node)) score += 12;
        if (hasInput(node)) score += 12;
        if (hasSendControl(node)) score += 5;
        if (/rufus-textarea|textarea-container|text-area|submit-icon|plus-button|input-text-wrapper/i.test([node.id, node.className].filter(Boolean).join(" "))) score -= 120;
        if (style.position === "fixed" || style.position === "sticky") score += 5;
        if (rect.bottom > window.innerHeight * 0.35) score += 3;
        if (text.length > 5000) score -= 10;
        if (pageNoise.test(text)) score -= 24;
        if (/Change language|Change country\/region/i.test(text)) score -= 20;
        candidates.push({
          selector: descriptor(node),
          text,
          textLength: text.length,
          score,
          hasInput: hasInput(node),
          hasAssistantAttr: hasAssistantAttr(node),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score || a.textLength - b.textLength);
    const best = candidates[0];
    if (!best || best.score < 12) return pointSnapshot || preferredFallback || { found: false, selector: "", text: "", textLength: 0, score: best?.score ?? 0 };
    const match = candidates.find((candidate) => candidate.score >= best.score - 3 && candidate.textLength <= Math.max(1200, best.textLength)) ?? best;
    if (pointSnapshot && pointSnapshot.score >= match.score - 20 && pointSnapshot.textLength >= match.textLength * 0.6) return pointSnapshot;
    return { found: true, source: "scored_dom_candidate", ...match };
  }).catch((error) => ({ found: false, selector: "", text: "", textLength: 0, score: 0, error: error.message }));
}

async function scrollAssistantPanel(page, position = "bottom") {
  await page.evaluate((scrollPosition) => {
    const visible = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden";
    };
    const marker = /Ask Alexa|Alexa AI|Rufus|Ask something else|Looking for specific info|shopping question/i;
    const preferred = Array.from(document.querySelectorAll("#rufus-conversation-container, #rufus-container-main-view, #rufus-container, #nav-rufus-content, #nav-flyout-rufus"))
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const scrollable = el.scrollHeight > el.clientHeight + 20;
        const attrs = [el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label")].filter(Boolean).join(" ");
        return { el, score: 100 + (scrollable ? 40 : 0) + (/rufus|alexa/i.test(attrs) ? 30 : 0) + (rect.left <= 460 && rect.width <= 620 ? 20 : 0) };
      })
      .sort((a, b) => b.score - a.score);
    const candidates = Array.from(document.querySelectorAll("body *"))
      .filter(visible)
      .filter((el) => marker.test(el.innerText || el.textContent || "") || /rufus|alexa|assistant/i.test([el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label")].filter(Boolean).join(" ")))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const scrollable = el.scrollHeight > el.clientHeight + 20;
        const attrs = [el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label")].filter(Boolean).join(" ");
        return { el, score: (scrollable ? 10 : 0) + (rect.left <= 460 && rect.width <= 620 ? 14 : 0) + (/rufus|alexa/i.test(attrs) ? 12 : 0) + (rect.bottom > window.innerHeight * 0.4 ? 4 : 0) - ((el.innerText || "").length > 8000 ? 10 : 0) };
      })
      .sort((a, b) => b.score - a.score);
    const root = preferred[0]?.el || candidates[0]?.el;
    if (root) {
      const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
      if (scrollPosition === "top") root.scrollTop = 0;
      else if (scrollPosition === "middle") root.scrollTop = Math.round(maxScroll * 0.5);
      else if (scrollPosition === "bottom") root.scrollTop = root.scrollHeight;
    }
  }, position).catch(() => {});
}

async function getAssistantSnapshotVariants(page) {
  const variants = [];
  const seen = new Set();
  for (const position of ["current", "top", "middle", "bottom"]) {
    if (position !== "current") {
      await scrollAssistantPanel(page, position);
      await page.waitForTimeout(350);
    }
    const snapshot = await getAssistantSnapshot(page);
    if (!snapshot.found) continue;
    const key = `${snapshot.selector}:${snapshot.textLength}:${String(snapshot.text || "").slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({ ...snapshot, variantPosition: position });
  }
  return variants;
}

function mergeAssistantSnapshots(snapshots) {
  const found = snapshots.filter((snapshot) => snapshot?.found && snapshot.text);
  if (!found.length) return null;
  const order = new Map([["top", 0], ["middle", 1], ["bottom", 2], ["current", 3]]);
  const sorted = [...found].sort((a, b) => (order.get(a.variantPosition) ?? 9) - (order.get(b.variantPosition) ?? 9));
  const lines = [];
  const seen = new Set();
  for (const snapshot of sorted) {
    for (const line of cleanPanelText(snapshot.text).split(/\n+/).map(cleanText).filter(Boolean)) {
      const key = line.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
      if (key.length > 24 && seen.has(key)) continue;
      if (key.length > 24) seen.add(key);
      lines.push(line);
    }
  }
  const text = cleanPanelText(lines.join("\n"));
  const best = sorted.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  return {
    ...best,
    found: true,
    selector: `${best.selector || "assistant_panel"} + merged_scroll_positions`,
    source: "merged_scroll_positions",
    variantPosition: "merged",
    text,
    textLength: text.length,
    score: Math.max(...found.map((snapshot) => snapshot.score || 0)) + 25,
  };
}

async function clickAssistant(page) {
  const selectors = [
    'button:has-text("Ask Alexa")',
    '[role="button"]:has-text("Ask Alexa")',
    '[aria-label*="Ask Alexa" i]',
    '[aria-label*="Rufus" i]',
    '[data-testid*="rufus" i]',
    '[data-testid*="alexa" i]',
    'text=/Ask Alexa/i',
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      if ((await locator.count()) === 0) continue;
      await locator.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});
      await locator.click({ timeout: 3500, force: true });
      await page.waitForTimeout(3500);
      const snapshot = await getAssistantSnapshot(page);
      if (snapshot.found) return `${selector} -> ${snapshot.selector}`;
    } catch {
      // Try next selector.
    }
  }
  const existing = await getAssistantSnapshot(page);
  return existing.found ? `existing_panel:${existing.selector}` : "";
}

async function gotoWithRetry(page, url, { waitUntil = "domcontentloaded", timeout = 75000, attempts = 3, settleMs = 1500 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil, timeout });
      if (settleMs > 0) await page.waitForTimeout(settleMs);
      return { ok: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1500 * attempt).catch(() => {});
      if (attempt < attempts) {
        await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
      }
    }
  }
  throw new Error(`page_goto_failed_after_${attempts}_attempts: ${lastError?.message || url}`);
}

async function resolveAsinUrl(page, asin) {
  const asinSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(asin)}`;
  await gotoWithRetry(page, asinSearchUrl, { timeout: 75000, attempts: 3 });
  await page.waitForTimeout(4500);
  const found = await page.evaluate((targetAsin) => {
    const link = Array.from(document.querySelectorAll("a[href]")).find((a) => new RegExp(`/dp/${targetAsin}|/gp/product/${targetAsin}`, "i").test(a.href));
    return link?.href || "";
  }, asin).catch(() => "");
  return { asinSearchUrl, productUrl: found || `https://www.amazon.com/dp/${asin}`, resolutionStatus: found ? "search_result_resolved" : "direct_dp_fallback" };
}

async function submitViaVisibleComposer(page, question) {
  const directTextareaCount = await page.locator("#rufus-text-area").count().catch(() => 0);
  if (directTextareaCount > 0) {
    try {
      const textarea = page.locator("#rufus-text-area").first();
      await textarea.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await textarea.click({ timeout: 5000, force: true });
      await textarea.fill("", { timeout: 5000 });
      await textarea.fill(question, { timeout: 8000 });
      await page.waitForTimeout(700);
      await page.waitForFunction(() => {
        const input = document.querySelector("#rufus-text-area");
        const submit = document.querySelector("#rufus-submit-button");
        return Boolean(input?.value?.trim()) && !String(submit?.className || "").includes("--disabled");
      }, null, { timeout: 5000 }).catch(() => {});
      const state = await page.evaluate(() => {
        const input = document.querySelector("#rufus-text-area");
        const submit = document.querySelector("#rufus-submit-button");
        return {
          hasInput: Boolean(input),
          hasSubmit: Boolean(submit),
          value: input?.value || "",
          submitClass: String(submit?.className || ""),
        };
      });
      if (state.hasInput && state.hasSubmit && state.value.trim()) {
        await page.locator("#rufus-submit-button").first().click({ timeout: 5000, force: true });
        return { ok: true, action: "filled_rufus_textarea;clicked_rufus_submit_button", panelSelector: "#nav-flyout-rufus" };
      }
    } catch {
      // Fall back to the broader visible-composer strategy below.
    }
  }

  const clickResult = await page.evaluate(() => {
    const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const visible = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
    };
    const descriptor = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("data-testid") ? `[data-testid="${el.getAttribute("data-testid")}"]` : ""}`;
    const roots = [
      ...Array.from(document.querySelectorAll("#nav-flyout-rufus, #rufus-conversation-container, [id*='rufus' i], [class*='rufus' i], [data-testid*='rufus' i]")),
      ...Array.from(document.querySelectorAll("body *")).filter((el) => /Ask Alexa|Alexa AI|Rufus|Ask a shopping question|shopping question/i.test(clean(el.innerText || el.textContent || el.getAttribute("aria-label") || ""))),
    ].filter(visible);
    const root = roots
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const text = clean(el.innerText || el.textContent || "");
        let score = 0;
        if (/rufus|alexa/i.test([el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label")].filter(Boolean).join(" "))) score += 20;
        if (/Ask a shopping question|Ask Alexa|Rufus/i.test(text)) score += 20;
        if (rect.left < window.innerWidth * 0.45 && rect.height > 250) score += 8;
        if (/Add to cart|Buy Now|About this item|Customer reviews|Back to top/i.test(text)) score -= 40;
        return { el, score, textLength: text.length };
      })
      .sort((a, b) => b.score - a.score || a.textLength - b.textLength)[0]?.el;
    if (!root) return { ok: false, action: "assistant_composer_root_not_found", panelSelector: "" };

    const rootRect = root.getBoundingClientRect();
    const candidates = Array.from(root.querySelectorAll("*"))
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const text = clean(el.innerText || el.textContent || "");
        const attrs = clean([el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("role")].filter(Boolean).join(" "));
        let score = 0;
        if (/Ask a shopping question/i.test(`${text} ${attrs}`)) score += 80;
        if (/textbox|input|composer|prompt|search/i.test(attrs)) score += 24;
        if (el.matches("textarea, input, [contenteditable], [role='textbox']")) score += 30;
        if (rect.bottom > rootRect.bottom - Math.max(170, rootRect.height * 0.28)) score += 18;
        if (rect.width > 160 && rect.height > 28) score += 10;
        if (/Does it|Is it|Can it|Compare|What do customers|Why you might/i.test(text)) score -= 50;
        if (/^\+$/i.test(text)) score -= 80;
        return { el, score, rect, text, attrs };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.rect.bottom - a.rect.bottom);
    const target = candidates[0]?.el;
    if (!target) return { ok: false, action: "assistant_composer_not_found", panelSelector: descriptor(root) };
    target.scrollIntoView({ block: "center", inline: "nearest" });
    const targetRect = target.getBoundingClientRect();
    target.click();
    return {
      ok: true,
      action: "clicked_visible_composer",
      panelSelector: descriptor(root),
      composerSelector: descriptor(target),
      composerRect: { x: targetRect.x, y: targetRect.y, width: targetRect.width, height: targetRect.height, right: targetRect.right, bottom: targetRect.bottom },
    };
  }).catch((error) => ({ ok: false, action: `composer_click_error:${error.message}`, panelSelector: "" }));

  if (!clickResult.ok) return clickResult;
  await page.waitForTimeout(400);
  if (clickResult.composerRect) {
    const x = clickResult.composerRect.x + Math.min(120, Math.max(30, clickResult.composerRect.width * 0.35));
    const y = clickResult.composerRect.y + Math.min(34, Math.max(18, clickResult.composerRect.height * 0.45));
    await page.mouse.click(x, y).catch(() => {});
    await page.waitForTimeout(150);
  }

  const domInputResult = await page.evaluate((q) => {
    const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const visible = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
    };
    const inputSelector = 'textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]), [contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
    const roots = Array.from(document.querySelectorAll("#nav-flyout-rufus, #rufus-conversation-container, [id*='rufus' i], [class*='rufus' i], [data-testid*='rufus' i]")).filter(visible);
    const root = roots.sort((a, b) => (b.innerText || "").length - (a.innerText || "").length)[0] || document.body;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const candidates = [active, ...Array.from(root.querySelectorAll(inputSelector)).filter(visible)].filter(Boolean);
    const target = candidates.find((el) => el?.matches?.(inputSelector) || el?.isContentEditable);
    if (!target) return { ok: false, action: "no_dom_input_after_composer_click", activeTag: active?.tagName || "" };
    target.focus();
    if (target.isContentEditable || target.getAttribute("role") === "textbox") {
      target.textContent = "";
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward", data: "" }));
      target.textContent = q;
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: q }));
    } else {
      const proto = target.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (valueSetter) valueSetter.call(target, "");
      else target.value = "";
      target.dispatchEvent(new Event("input", { bubbles: true }));
      if (valueSetter) valueSetter.call(target, q);
      else target.value = q;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return { ok: true, action: `typed_dom_${target.tagName.toLowerCase()}`, activeText: clean(target.value || target.textContent || "").slice(0, 80) };
  }, question).catch((error) => ({ ok: false, action: `dom_type_error:${error.message}` }));

  let keyboardAction = "keyboard_inserted";
  try {
    if (domInputResult.ok) await page.keyboard.press("Control+A");
    await page.keyboard.insertText(question);
  } catch (error) {
    keyboardAction = `keyboard_insert_error:${error.message}`;
  }
  await page.waitForTimeout(500);

  if (clickResult.composerRect) {
    const x = clickResult.composerRect.right - 34;
    const y = clickResult.composerRect.bottom - 34;
    await page.mouse.click(x, y).catch(() => {});
    return { ok: true, action: `${clickResult.action};${domInputResult.action};${keyboardAction};clicked_composer_send_xy`, panelSelector: clickResult.panelSelector };
  }

  const sendResult = await page.evaluate(() => {
    const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const visible = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
    };
    const descriptor = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("data-testid") ? `[data-testid="${el.getAttribute("data-testid")}"]` : ""}`;
    const roots = Array.from(document.querySelectorAll("#nav-flyout-rufus, #rufus-conversation-container, [id*='rufus' i], [class*='rufus' i], [data-testid*='rufus' i]")).filter(visible);
    const root = roots.sort((a, b) => (b.innerText || "").length - (a.innerText || "").length)[0] || document.body;
    const rootRect = root.getBoundingClientRect();
    const composer = Array.from(root.querySelectorAll("*"))
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const text = clean(el.innerText || el.textContent || "");
        const attrs = clean([el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("role")].filter(Boolean).join(" "));
        let score = 0;
        if (/Ask a shopping question/i.test(`${text} ${attrs}`)) score += 80;
        if (/textbox|input|composer|prompt|search/i.test(attrs)) score += 20;
        if (rect.bottom > rootRect.bottom - Math.max(170, rootRect.height * 0.28)) score += 20;
        if (rect.width > 220 && rect.height > 45) score += 20;
        if (/Does it|Is it|Can it|Compare|What do customers|Why you might/i.test(text)) score -= 60;
        return { el, score, rect };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.rect.width - a.rect.width)[0];
    const rect = composer?.rect && composer.rect.width > 160 ? composer.rect : rootRect;
    const x = Math.max(rootRect.left + 20, Math.min(rect.right - 34, rootRect.right - 34));
    const y = Math.max(rootRect.top + 20, Math.min(rect.bottom - 34, rootRect.bottom - 34));
    const hit = document.elementFromPoint(x, y);
    const clickable = hit?.closest?.("button, [role='button'], input[type='submit']") || hit;
    if (!clickable || !visible(clickable)) return { ok: false, action: "send_button_not_found" };
    clickable.click();
    return { ok: true, action: "clicked_composer_send_xy", sendSelector: descriptor(clickable), x: Math.round(x), y: Math.round(y) };
  }).catch((error) => ({ ok: false, action: `send_click_error:${error.message}` }));

  if (sendResult.ok) {
    return { ok: true, action: `${clickResult.action};${domInputResult.action};${keyboardAction};${sendResult.action}`, panelSelector: clickResult.panelSelector };
  }
  await page.keyboard.press("Enter");
  return { ok: true, action: `${clickResult.action};${domInputResult.action};${keyboardAction};pressed_keyboard_enter`, panelSelector: clickResult.panelSelector };
}

async function submitQuestion(page, question) {
  const composerResult = await submitViaVisibleComposer(page, question);
  if (composerResult.ok) return composerResult;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await page.evaluate((q) => {
      const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const visible = (el) => {
        if (!el || !(el instanceof HTMLElement)) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
      };
      const inputSelector = 'textarea, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]), [contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
      const marker = /Ask Alexa|Alexa AI|Rufus|Ask something else|Looking for specific info|shopping question/i;
      const pageNoise = /Skip to Main content|Add to cart|Buy Now|About this item|Customer reviews|Frequently bought together|Back to top|Click to see full view|VIDEOS/i;
      const hasAssistantAttr = (el) => /rufus|alexa|assistant/i.test([el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label"), el.getAttribute("role")].filter(Boolean).join(" "));
      const descriptor = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("data-testid") ? `[data-testid="${el.getAttribute("data-testid")}"]` : ""}`;
      const candidates = [];
      for (const el of Array.from(document.querySelectorAll("body *")).filter(visible)) {
        const text = clean(el.innerText || el.textContent || "");
        const attrs = [el.id, el.className, el.getAttribute("data-testid"), el.getAttribute("aria-label"), el.getAttribute("role")].filter(Boolean).join(" ");
        if (!marker.test(text) && !marker.test(attrs) && !hasAssistantAttr(el)) continue;
        let node = el;
        for (let depth = 0; node && node !== document.body && depth < 7; depth += 1, node = node.parentElement) {
          if (!visible(node)) continue;
          const nodeText = clean(node.innerText || node.textContent || "");
          if (!nodeText || nodeText.length > 16000) continue;
          let score = 0;
          if (marker.test(nodeText)) score += 12;
          if (hasAssistantAttr(node)) score += 12;
          if (node.querySelector(inputSelector)) score += 14;
          if (nodeText.length > 5000) score -= 10;
          if (pageNoise.test(nodeText)) score -= 24;
          candidates.push({ node, score, selector: descriptor(node), textLength: nodeText.length });
        }
      }
      candidates.sort((a, b) => b.score - a.score || a.textLength - b.textLength);
      const root = candidates[0]?.score >= 12 ? candidates[0].node : null;
      if (!root) return { ok: false, action: "assistant_panel_not_found", panelSelector: "" };

      const input = Array.from(root.querySelectorAll(inputSelector)).find((el) => visible(el) && !el.disabled && el.getAttribute("aria-disabled") !== "true");
      if (!input) {
        const opener = Array.from(root.querySelectorAll('button, [role="button"], a'))
          .find((el) => visible(el) && /ask something else|ask another|ask a question|ask/i.test(clean(el.innerText || el.getAttribute("aria-label") || "")));
        if (opener) {
          opener.click();
          return { ok: false, action: "composer_opened", panelSelector: candidates[0].selector };
        }
        return { ok: false, action: "assistant_input_not_found_in_panel", panelSelector: candidates[0].selector };
      }

      input.focus();
      if (input.getAttribute("contenteditable") === "true") {
        input.textContent = q;
      } else {
        const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (valueSetter) valueSetter.call(input, q);
        else input.value = q;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      const sendButtons = Array.from(root.querySelectorAll('button, [role="button"], input[type="submit"]'))
        .filter((el) => visible(el))
        .filter((el) => {
          const label = clean([el.innerText, el.value, el.getAttribute("aria-label"), el.className].filter(Boolean).join(" "));
          return /send|submit|ask|arrow/i.test(label) && !/ask something else|language|country|share|add to cart/i.test(label);
        });
      for (const button of sendButtons) {
        try {
          button.click();
          return { ok: true, action: "clicked_panel_send", panelSelector: candidates[0].selector };
        } catch {}
      }

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
      return { ok: true, action: "pressed_panel_enter", panelSelector: candidates[0].selector };
    }, question);
    if (result.ok || result.action !== "composer_opened") return result;
    await page.waitForTimeout(2500);
  }
  return { ok: false, action: "assistant_input_not_found_after_opening_composer", panelSelector: "" };
}

async function waitForStableAnswer(page, before, question, timeoutMs) {
  const started = Date.now();
  let lastSnapshot = before;
  let best = { answer: "", status: "empty_panel_answer" };
  let lastAnswer = "";
  let stablePolls = 0;
  let pollCount = 0;
  while (Date.now() - started < timeoutMs) {
    await page.waitForTimeout(2500);
    pollCount += 1;
    const snapshots = await getAssistantSnapshotVariants(page);
    if (!snapshots.length) continue;
    const mergedSnapshot = mergeAssistantSnapshots(snapshots);
    const snapshotsToExtract = mergedSnapshot ? [...snapshots, mergedSnapshot] : snapshots;
    let bestOkThisPoll = null;
    let bestOkSnapshot = null;
    for (const snapshot of snapshotsToExtract) {
      lastSnapshot = snapshot;
      const extracted = extractPanelAnswer({ beforeText: before.text, afterText: snapshot.text, question });
      if (extracted.status === "ok") {
        if (!bestOkThisPoll || extracted.answer.length > bestOkThisPoll.answer.length) {
          bestOkThisPoll = extracted;
          bestOkSnapshot = snapshot;
        }
      } else if (extracted.status.startsWith("answer_still_generating")) {
        stablePolls = 0;
        best = extracted;
      } else if (extracted.answer?.length > best.answer?.length) {
        best = extracted;
      }
    }
    if (bestOkThisPoll) {
      lastSnapshot = bestOkSnapshot || lastSnapshot;
      if (bestOkThisPoll.answer === lastAnswer) stablePolls += 1;
      else {
        stablePolls = 0;
        lastAnswer = bestOkThisPoll.answer;
      }
      best = bestOkThisPoll;
      if (stablePolls >= 2) {
        return { ...bestOkThisPoll, completionStatus: "stable_complete", stablePolls, pollCount, snapshot: lastSnapshot };
      }
    }
  }
  const finalSnapshots = await getAssistantSnapshotVariants(page);
  const finalMergedSnapshot = mergeAssistantSnapshots(finalSnapshots);
  const finalSnapshotsToExtract = finalMergedSnapshot ? [...finalSnapshots, finalMergedSnapshot] : finalSnapshots;
  for (const snapshot of finalSnapshotsToExtract) {
    lastSnapshot = snapshot;
    const extracted = extractPanelAnswer({ beforeText: before.text, afterText: snapshot.text, question });
    if (extracted.status === "ok" && extracted.answer.length >= 80) {
      return { ...extracted, completionStatus: "final_visible_answer", stablePolls, pollCount, snapshot };
    }
  }
  if (best.status === "ok") {
    if (best.answer?.length >= 180) {
      return { ...best, completionStatus: "final_visible_answer_after_timeout", stablePolls, pollCount, snapshot: lastSnapshot };
    }
    return { ...best, status: "answer_generation_timeout", completionStatus: "not_stable_before_timeout", stablePolls, pollCount, snapshot: lastSnapshot };
  }
  return { ...best, completionStatus: "not_complete", stablePolls, pollCount, snapshot: lastSnapshot };
}

async function askAssistant(page, question, timeoutMs) {
  const before = await getAssistantSnapshot(page);
  const baseDebug = {
    question,
    before: { found: before.found, selector: before.selector, source: before.source || "", textLength: before.textLength || 0, textSample: String(before.text || "").slice(0, 2500) },
  };
  if (!before.found) {
    return { answer: "", answerStatus: "assistant_panel_not_found_before_submit", submitAction: "not_submitted", answerContainerSelector: "", answerTextSource: "none", answerCompletionStatus: "not_started", answerStablePolls: 0, answerPollCount: 0, answerDebug: baseDebug };
  }
  const submit = await submitQuestion(page, question);
  if (!submit.ok) {
    return { answer: "", answerStatus: submit.action, submitAction: submit.action, answerContainerSelector: submit.panelSelector || before.selector, answerTextSource: "assistant_panel", answerCompletionStatus: "not_submitted", answerStablePolls: 0, answerPollCount: 0, answerDebug: { ...baseDebug, submit } };
  }
  await page.waitForTimeout(1500);
  const afterSubmit = await getAssistantSnapshot(page);
  const currentQuestionTail = afterSubmit.found ? textAfterCurrentQuestion(afterSubmit.text, question) : "";
  const questionVisible = Boolean(currentQuestionTail) || (afterSubmit.found && afterSubmit.text.toLowerCase().includes(cleanText(question).toLowerCase()));
  const generatingVisible = Boolean(currentQuestionTail) && generationHits(currentQuestionTail).length > 0;
  if (!questionVisible && !generatingVisible) {
    return {
      answer: "",
      answerStatus: "question_submit_not_confirmed",
      submitAction: submit.action,
      answerContainerSelector: afterSubmit.selector || submit.panelSelector || before.selector,
      answerTextSource: afterSubmit.found ? "assistant_panel" : "none",
      answerCompletionStatus: "not_submitted",
      answerStablePolls: 0,
      answerPollCount: 0,
      answerDebug: {
        ...baseDebug,
        submit,
        afterSubmit: { found: afterSubmit.found, selector: afterSubmit.selector, source: afterSubmit.source || "", textLength: afterSubmit.textLength || 0, textSample: String(afterSubmit.text || "").slice(0, 3500) },
        currentQuestionTailSample: currentQuestionTail.slice(0, 2000),
      },
    };
  }
  const waited = await waitForStableAnswer(page, before, question, timeoutMs);
  return {
    answer: waited.answer,
    answerStatus: waited.status,
    submitAction: submit.action,
    answerContainerSelector: waited.snapshot?.selector || submit.panelSelector || before.selector,
    answerTextSource: waited.snapshot?.found ? "assistant_panel" : "none",
    answerCompletionStatus: waited.completionStatus,
    answerStablePolls: waited.stablePolls,
    answerPollCount: waited.pollCount,
    answerDebug: {
      ...baseDebug,
      submit,
      afterSubmit: { found: afterSubmit.found, selector: afterSubmit.selector, source: afterSubmit.source || "", textLength: afterSubmit.textLength || 0, textSample: String(afterSubmit.text || "").slice(0, 3500) },
      waitedSnapshot: { found: waited.snapshot?.found, selector: waited.snapshot?.selector || "", source: waited.snapshot?.source || "", textLength: waited.snapshot?.textLength || 0, textSample: String(waited.snapshot?.text || "") },
      extracted: { status: waited.status, completionStatus: waited.completionStatus, answerLength: waited.answer?.length || 0, answerSample: String(waited.answer || "").slice(0, 3500), stablePolls: waited.stablePolls, pollCount: waited.pollCount },
    },
  };
}

async function prepareProductQuestionPage(page, productUrl, waitMs) {
  await gotoWithRetry(page, productUrl, { timeout: 75000, attempts: 3 });
  await page.waitForTimeout(waitMs);
  const productTitle = await page.evaluate(() => {
    const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    return clean(
      document.querySelector("#productTitle")?.textContent ||
      document.querySelector("h1#title span")?.textContent ||
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      document.title ||
      ""
    );
  }).then(cleanAmazonTitle).catch(() => "");
  const assistantEntry = await clickAssistant(page);
  return { productTitle, assistantEntry };
}

const args = parseArgs(process.argv.slice(2));
if (args["self-test-extraction"]) {
  const question = "What type of product is this case?";
  const clean = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Ask Alexa\nWhat type of product is this case?\nThis is a protective smartphone case designed for an iPhone, with MagSafe-style magnetic support and a built-in stand.",
    question,
  });
  const contaminated = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Skip to Main content\nCart\nAdd to cart\nAbout this item\nCustomer reviews\nBack to top\nAmazon Music",
    question,
  });
  const generating = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Ask Alexa\nWhat type of product is this case?\nThinking...\nRufus is currently generating a response\nScheduled actions Automate shopping, discovery, and savings",
    question,
  });
  const duplicated = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Ask Alexa\nWhat type of product is this case?\nThis is a protective smartphone case designed for an iPhone. This is a protective smartphone case designed for an iPhone. Rufus has completed generating a response\n{}\nYour feedback has been submitted",
    question,
  });
  const staleGenerating = extractPanelAnswer({
    beforeText: "Ask Alexa\nOld question\nRufus is currently generating a response",
    afterText: "Ask Alexa\nOld question\nRufus is currently generating a response\nCustomer question\nWhat type of product is this case?\nThis is a protective smartphone case designed for an iPhone with a magnetic stand, drop protection, and wireless charging compatibility.",
    question,
  });
  const usefulBeforeMarker = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Ask Alexa\nWhat type of product is this case?\nThis is a protective smartphone case designed for an iPhone with a magnetic stand, drop protection, and wireless charging compatibility.\nRufus is currently generating a response",
    question,
  });
  const customerQuestionFallback = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Ask Alexa\nCustomer question\nWhat specific functions does SPIDERCASE Magnetic for iPhone 17 Pro Max Case,with [3 Stand Ways] [Military Grade Drop Protection] with Invisible Stand Shockproof Slim Case for iPhone 17 Pro Max 6.9 inch,Clear perform for shoppers?\nHere is a complete breakdown of every specific function the SPIDERCASE Magnetic iPhone 17 Pro Max Case performs for shoppers, grouped into product functions and verified customer review themes.",
    question: "What specific functions does this case perform for shoppers?",
  });
  const visibleAnswerWithoutQuestion = extractPanelAnswer({
    beforeText: "Ask Alexa\nAsk something else",
    afterText: "Ask Alexa\nHere is a complete breakdown of every specific function this case performs for shoppers:\nFunction 1: Drop and impact protection. Function 2: Hands-free viewing with a kickstand. Function 3: MagSafe-compatible attachment and charging support.",
    question: "What specific functions does this case perform for shoppers?",
  });
  const englishTitleQuestionName = questionProductName("SPIDERCASE Magnetic for iPhone 17 Pro Max Case,with [3 Stand Ways] [Military Grade Drop Protection] with Invisible Stand Shockproof Slim Case for iPhone 17 Pro Max 6.9 inch,Clear", "苹果17promax手机壳");
  const earbudsQuestionName = questionProductName("Bluetooth Earbuds Wireless Headphones with Charging Case", "");
  const fallbackQuestionName = questionProductName("", "苹果17promax手机壳");
  if (clean.status !== "ok" || !clean.answer.includes("protective smartphone case")) throw new Error(`Clean extraction failed: ${JSON.stringify(clean)}`);
  if (!contaminated.status.includes("contaminated") || contaminated.answer) throw new Error(`Contamination test failed: ${JSON.stringify(contaminated)}`);
  if (!generating.status.includes("answer_still_generating") || generating.answer) throw new Error(`Generating test failed: ${JSON.stringify(generating)}`);
  if (duplicated.status !== "ok" || (duplicated.answer.match(/protective smartphone case/g) || []).length !== 1 || duplicated.answer.includes("{}")) throw new Error(`Dedupe/UI-noise test failed: ${JSON.stringify(duplicated)}`);
  if (staleGenerating.status !== "ok" || !staleGenerating.answer.includes("magnetic stand")) throw new Error(`Stale generating marker test failed: ${JSON.stringify(staleGenerating)}`);
  if (usefulBeforeMarker.status !== "ok" || !usefulBeforeMarker.answer.includes("wireless charging")) throw new Error(`Useful partial answer before marker test failed: ${JSON.stringify(usefulBeforeMarker)}`);
  if (customerQuestionFallback.status !== "ok" || !customerQuestionFallback.answer.includes("complete breakdown")) throw new Error(`Customer question fallback test failed: ${JSON.stringify(customerQuestionFallback)}`);
  if (visibleAnswerWithoutQuestion.status !== "ok" || !visibleAnswerWithoutQuestion.answer.includes("Hands-free viewing")) throw new Error(`Visible answer without question test failed: ${JSON.stringify(visibleAnswerWithoutQuestion)}`);
  if (englishTitleQuestionName !== "this case") throw new Error(`English title question name failed: ${englishTitleQuestionName}`);
  if (earbudsQuestionName !== "these earbuds") throw new Error(`Earbuds question name failed: ${earbudsQuestionName}`);
  if (fallbackQuestionName !== "this item") throw new Error(`Fallback question name failed: ${fallbackQuestionName}`);
  console.log(JSON.stringify({ ok: true, scriptVersion: SCRIPT_VERSION, clean, contaminated, generating, duplicated, staleGenerating, usefulBeforeMarker, customerQuestionFallback, visibleAnswerWithoutQuestion, englishTitleQuestionName, earbudsQuestionName, fallbackQuestionName }, null, 2));
  process.exit(0);
}

const productName = String(args.product ?? "bluetooth headphones").trim();
const asins = splitList(args.asins ?? args["target-asin"]).map(normalizeAsin);
if (!asins.length) throw new Error("Missing --asins or --target-asin for independent ASIN relation probe report.");

const batchId = String(args["batch-id"] ?? `${slugify(productName)}_asin_relation_probe_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`);
const outDir = path.resolve(args["out-dir"] ?? path.join("output", `${slugify(productName)}_asin_relation_probe_report`));
const answerTimeoutMs = Math.max(20000, Number(args["answer-timeout-ms"] ?? 90000));
const productWaitMs = Math.max(2500, Number(args["product-wait-ms"] ?? 6500));
const cdpConnectTimeoutMs = Math.max(30000, Number(args["cdp-connect-timeout-ms"] ?? 90000));
const resetEachQuestion = String(args["reset-each-question"] ?? "true").toLowerCase() !== "false";
const relationFieldFilter = new Set(splitList(args["relation-fields"] ?? args["relation-field"]).map((field) => field.trim()));
const maxRelations = Math.max(0, Number(args["max-relations"] ?? 0));
let selectedRelations = relationFieldFilter.size ? RELATIONS.filter(([field]) => relationFieldFilter.has(field)) : RELATIONS;
if (maxRelations > 0) selectedRelations = selectedRelations.slice(0, maxRelations);
if (!selectedRelations.length) throw new Error("No relation fields selected. Check --relation-fields.");
fs.mkdirSync(outDir, { recursive: true });
const evidenceDir = path.join(outDir, "_evidence");
fs.mkdirSync(evidenceDir, { recursive: true });

const { chromium } = await import("playwright").catch((error) => {
  console.error("Cannot load Playwright. Run npm install in the skill/package folder before collecting from Amazon.");
  console.error(error.message);
  process.exit(1);
});
const browser = await chromium.connectOverCDP(args["cdp-base"] ?? "http://127.0.0.1:9222", { timeout: cdpConnectTimeoutMs }).catch((error) => {
  console.error("Cannot connect to Chrome. Run npm run cdp:launch first, then log in to Amazon.");
  console.error(error.message);
  process.exit(1);
});
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();
page.setDefaultTimeout(12000);

const rows = [];
const csvPath = path.join(outDir, "asin_relation_probe_answers.csv");
const reportPath = path.join(outDir, "asin_relation_product_report.html");
const draftReportPath = path.join(evidenceDir, "asin_relation_product_report_draft.html");
const semanticAnalysisPath = path.join(evidenceDir, "relation_probe_semantic_analysis.json");
const manifestPath = path.join(evidenceDir, "asin_relation_probe_manifest.json");
const header = ["batchId", "productName", "asin", "productTitle", "probeType", "relationField", "relationFieldZh", "fullQuestion", "amazonAiAnswer", "isValidAnswer", "failureReason", "answerQualityStatus", "answerQualityReason", "answerStatus", "answerExtractionStatus", "answerCompletionStatus", "answerStablePolls", "answerPollCount", "answerContainerSelector", "answerTextSource", "answerLength", "asinSearchUrl", "asinResolvedUrl", "sourceUrl", "assistantEntry", "screenshotPath", "answeredAt", "status"];
const flushCsv = () => writeCsvZh(csvPath, header, rows, fs);

for (const asin of asins) {
  let resolved;
  try {
    resolved = await resolveAsinUrl(page, asin);
  } catch (error) {
    for (const [relationField, relationFieldZh, template] of selectedRelations) {
      const fullQuestion = formatQuestion(template, questionProductName("", productName));
      const answerStatus = "asin_resolution_failed";
      const quality = qualityCheckAnswer({ answer: "", productTitle: productName, productName });
      rows.push({
        batchId,
        productName,
        asin,
        productTitle: productName,
        probeType: "independent_asin_relation_probe",
        relationField,
        relationFieldZh,
        fullQuestion,
        amazonAiAnswer: "",
        isValidAnswer: "否",
        failureReason: businessFailureReason(answerStatus, quality.status),
        answerQualityStatus: quality.status,
        answerQualityReason: quality.reason,
        answerStatus,
        answerExtractionStatus: answerStatus,
        answerCompletionStatus: "not_started",
        answerStablePolls: 0,
        answerPollCount: 0,
        answerContainerSelector: "",
        answerTextSource: "none",
        answerLength: 0,
        asinSearchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(asin)}`,
        asinResolvedUrl: "",
        sourceUrl: "",
        assistantEntry: "",
        screenshotPath: "",
        answeredAt: new Date().toISOString(),
        status: `error: ${error.message}`,
      });
      flushCsv();
    }
    continue;
  }
  let cachedProductTitle = "";
  let cachedAssistantEntry = "";
  if (!resetEachQuestion) {
    const prepared = await prepareProductQuestionPage(page, resolved.productUrl, productWaitMs);
    cachedProductTitle = prepared.productTitle;
    cachedAssistantEntry = prepared.assistantEntry;
  }

  for (const [relationField, relationFieldZh, template] of selectedRelations) {
    let productTitle = cachedProductTitle;
    let assistantEntry = cachedAssistantEntry;
    let fullQuestion = formatQuestion(template, questionProductName(productTitle || "", productName));
    const screenshotPath = path.join(evidenceDir, `${asin}_${relationField}.png`);
    let amazonAiAnswer = "";
    let answerStatus = "ok";
    let status = "ok";
    let answerContainerSelector = "";
    let answerTextSource = "";
    let answerCompletionStatus = "";
    let answerStablePolls = 0;
    let answerPollCount = 0;
    const answerDebugPath = path.join(evidenceDir, `${asin}_${relationField}_assistant_debug.json`);
    let answerDebug = {};
    try {
      if (resetEachQuestion) {
        const prepared = await prepareProductQuestionPage(page, resolved.productUrl, productWaitMs);
        productTitle = prepared.productTitle;
        assistantEntry = prepared.assistantEntry;
      }
      productTitle = productTitle || productName;
      fullQuestion = formatQuestion(template, questionProductName(productTitle, productName));
      const answer = await askAssistant(page, fullQuestion, answerTimeoutMs);
      amazonAiAnswer = answer.answer;
      answerStatus = answer.answerStatus;
      status = answer.submitAction;
      answerContainerSelector = answer.answerContainerSelector || "";
      answerTextSource = answer.answerTextSource || "";
      answerCompletionStatus = answer.answerCompletionStatus || "";
      answerStablePolls = answer.answerStablePolls || 0;
      answerPollCount = answer.answerPollCount || 0;
      answerDebug = answer.answerDebug || {};
      await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 15000 });
    } catch (error) {
      answerStatus = String(error.message || "").startsWith("page_goto_failed") ? "page_goto_failed" : "failed";
      status = `error: ${error.message}`;
      await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 15000 }).catch(() => {});
      answerDebug = { error: error.message };
    }
    fs.writeFileSync(answerDebugPath, `${JSON.stringify({
      asin,
      relationField,
      fullQuestion,
      answerStatus,
      answerCompletionStatus,
      answerLength: amazonAiAnswer.length,
      answerDebug,
    }, null, 2)}\n`, "utf8");
    const quality = qualityCheckAnswer({ answer: amazonAiAnswer, productTitle, productName });
    const failureReason = businessFailureReason(answerStatus, quality.status);
    const isValidAnswer = answerStatus === "ok" && quality.status === "product_specific" ? "是" : "否";
    rows.push({
      batchId,
      productName,
      asin,
      productTitle,
      probeType: "independent_asin_relation_probe",
      relationField,
      relationFieldZh,
      fullQuestion,
      amazonAiAnswer,
      isValidAnswer,
      failureReason,
      answerQualityStatus: quality.status,
      answerQualityReason: quality.reason,
      answerStatus,
      answerExtractionStatus: answerStatus,
      answerCompletionStatus,
      answerStablePolls,
      answerPollCount,
      answerContainerSelector,
      answerTextSource,
      answerLength: amazonAiAnswer.length,
      asinSearchUrl: resolved.asinSearchUrl,
      asinResolvedUrl: resolved.productUrl,
      sourceUrl: resolved.productUrl,
      assistantEntry,
      screenshotPath,
      answeredAt: new Date().toISOString(),
      status,
    });
    flushCsv();
  }
}

await page.close().catch(() => {});
await browser.close().catch(() => {});

flushCsv();

const validCount = rows.filter((row) => row.isValidAnswer === "是").length;
fs.rmSync(reportPath, { force: true });
writeRelationProbeSemanticInput({
  rows,
  outPath: semanticAnalysisPath,
  language: "zh-CN",
  metadata: { batchId, productName, asins, scriptVersion: SCRIPT_VERSION },
});
generateRelationProbeVisualReport({
  rows,
  outPath: draftReportPath,
  language: "zh-CN",
  metadata: { batchId, productName, asins, scriptVersion: SCRIPT_VERSION, createdAt: new Date().toISOString() },
  draft: true,
});
fs.writeFileSync(manifestPath, `${JSON.stringify({
  batchId,
  productName,
  asins,
  scriptVersion: SCRIPT_VERSION,
  relationCount: selectedRelations.length,
  relationFields: selectedRelations.map(([field]) => field),
  rowCount: rows.length,
  validAnswerCount: validCount,
  standalone: true,
  dedupePolicy: "not_deduped_not_merged_with_natural_questions",
  answerExtractionPolicy: "assistant_panel_only_stable_complete_no_body_innerText_diff",
  answerTimeoutMs,
  resetEachQuestion,
  contaminationMarkers: PAGE_CONTAMINATION_MARKERS,
  generationMarkers: GENERATING_MARKERS,
  outputs: { csvPath, pendingVisualReportPath: reportPath, semanticAnalysisPath, draftReportPath, evidenceDir },
  createdAt: new Date().toISOString(),
}, null, 2)}\n`, "utf8");

console.log(csvPath);
console.log(semanticAnalysisPath);
console.log(`PENDING_SEMANTIC_NORMALIZATION: complete ${semanticAnalysisPath}, set status=ready, then render ${reportPath}`);
console.log(manifestPath);
