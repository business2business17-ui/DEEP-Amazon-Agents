import fs from "node:fs";
import path from "node:path";
import { buildOrganicRankBrowserScript } from "./amazon_search_rank_resolver.mjs";
import { writeCsv as writeCsvZh } from "./csv_zh.mjs";

const DEFAULT_CDP = "http://127.0.0.1:9222";

if (typeof WebSocket === "undefined") {
  throw new Error("This collector requires Node.js 22+ with built-in WebSocket support.");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function parseKeywords(value) {
  return String(value ?? "")
    .split(/[\r\n|,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizePostalCode(value) {
  return String(value ?? "").replace(/[^\dA-Za-z -]/g, "").trim();
}

function parsePostalCodes(args) {
  const raw = args["postal-codes"] ?? args["zip-codes"] ?? args["postal-code"] ?? args["zip-code"] ?? "";
  return Array.from(new Set(
    String(raw)
      .split(/[\r\n|,]+/)
      .map(normalizePostalCode)
      .filter(Boolean),
  ));
}

function requireArg(args, name) {
  if (!args[name]) throw new Error(`Missing required --${name}`);
  return args[name];
}

function boolArg(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  if (value === true) return true;
  return !/^(false|0|no)$/i.test(String(value));
}

function numberArg(value, defaultValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeCsv(filePath, header, rows) {
  writeCsvZh(filePath, header, rows, fs);
}

function slugify(value) {
  return String(value)
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 90);
}

function questionKey(question) {
  return String(question ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGenericQuestion(question) {
  const q = String(question ?? "").trim();
  return [
    /^have questions\?$/i,
    /^what do you need help with today\?$/i,
    /^what types of things can i ask\?$/i,
    /^how can i help\?$/i,
    /^what do customers say\?$/i,
    /^looking for specific info\?$/i,
    /^how customer reviews and ratings work$/i,
    /^alexa ai looking for specific info/i,
    /suggested questions/i,
    /ask your own below/i,
    /here are some things i can help with/i,
    /^\{\}/,
  ].some((pattern) => pattern.test(q));
}

function normalizeQuestions(questions) {
  const seen = new Set();
  return questions
    .map((q) => String(q ?? "").replace(/\s+/g, " ").trim())
    .map((q) => (/lower price\?/i.test(q) ? "Would you like to tell us about a lower price?" : q))
    .filter((q) => q.length >= 12 && q.length <= 180)
    .filter((q) => !isGenericQuestion(q))
    .filter((q) => (q.match(/\?/g) ?? []).length <= 1)
    .filter((q) => q.endsWith("?") || /^(what|how|is|are|can|does|do|which|where|when|why)\b/i.test(q))
    .filter((q) => {
      const key = questionKey(q);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function inferSpecialSignal(question) {
  const q = question.toLowerCase();
  const signals = [];
  if (/(lower price|price|budget|cheap|affordable|deal|discount|coupon|value)/.test(q)) signals.push("price");
  if (/(return|refund|warranty|support|replacement|after[- ]?sales)/.test(q)) signals.push("return_after_sales");
  if (/(bundle|included|include|package|box|come with|accessor)/.test(q)) signals.push("bundle");
  return signals.join(" | ");
}

function inferQuestionTheme(question) {
  const q = question.toLowerCase();
  if (/(lower price|price|budget|cheap|affordable|deal|discount|coupon|value)/.test(q)) return "price_value";
  if (/(return|refund|warranty|support|replacement|after[- ]?sales)/.test(q)) return "returns_after_sales";
  if (/(bundle|included|include|package|box|come with|accessor)/.test(q)) return "bundle_contents";
  if (/(battery|charge|charging|playtime|hours|mah|power|plug|cordless)/.test(q)) return "battery_power";
  if (/(bluetooth|connect|pair|range|wireless|aux|usb|tf card|app|voice assistant|alexa|compatible)/.test(q)) return "compatibility_connectivity";
  if (/(waterproof|water resistant|outdoor|pool|beach|shower|durable|weather|drop|rugged)/.test(q)) return "durability_outdoor";
  if (/(sound|bass|volume|loud|audio|quality|stereo|noise)/.test(q)) return "sound_quality";
  if (/(portable|carry|travel|size|weight|compact|small|large|dimension)/.test(q)) return "portability_size";
  if (/\bcustom(ized|izable|ization)?\b|\bpersonal(ized|ization)?\b|\bphoto\b|\bportrait\b|\bname\b|\binitial\b|\bmessage\b|\bengraving\b|\bdesign\b/.test(q)) return "customization_personalization";
  if (/(material|glass|stained|coating|metal|plastic|fabric|finish|quality)/.test(q)) return "materials_quality";
  if (/(hang|hanging|install|mount|setup|hardware|chain|cord|how to use)/.test(q)) return "installation_setup";
  if (/(gift|occasion|memorial|sympathy|birthday|christmas|holiday|grandma|mom|dad)/.test(q)) return "gift_occasion";
  if (/(popular|best|top|review|customer|rating|recommend)/.test(q)) return "reviews_popularity";
  if (/(safe|risk|break|issue|problem|concern|child|kid|pet)/.test(q)) return "safety_risk";
  if (/(compare|comparison|vs\.?|versus|difference|better|alternative|instead)/.test(q)) return "comparison_choice";
  if (/(use|used|suitable|work|for|with|where|when|can)/.test(q)) return "function_use_case";
  return "other";
}

function inferQuestionIntent(question) {
  const theme = inferQuestionTheme(question);
  const q = question.toLowerCase();
  if (theme === "price_value") return "price_value_check";
  if (theme === "returns_after_sales") return "return_or_support_risk";
  if (theme === "bundle_contents") return "bundle_or_contents_check";
  if (/(compare|comparison|vs\.?|versus|difference|better|alternative|instead|best|top)/.test(q)) return "comparison_standard";
  if (/(can|is|are|does|do|which|where|when)\b.*\b(use|work|suitable|fit|for|with)/.test(q)) return "usage_scenario";
  if (/(worry|concern|risk|safe|break|durable|quality|return|refund|warranty)/.test(q)) return "decision_concern";
  return theme;
}

function inferQuestionRole(question) {
  const theme = inferQuestionTheme(question);
  if (theme === "price_value") return "price_or_value";
  if (theme === "returns_after_sales") return "after_sales_risk";
  if (theme === "bundle_contents") return "bundle_or_bundle_gap";
  if (theme === "comparison_choice" || /compare|vs\.?|versus|better|alternative|best|top/i.test(question)) {
    return "comparison_standard";
  }
  if (/can|is|are|does|do|which|where|when/i.test(question) && /use|work|suitable|fit|for|with/i.test(question)) {
    return "usage_scenario";
  }
  return "decision_concern";
}

async function getPageWsUrl(cdpBase) {
  const targets = await (await fetch(`${cdpBase.replace(/\/$/, "")}/json/list`)).json();
  const page = targets.find((target) => target.type === "page" && /amazon\.com/i.test(target.url))
    ?? targets.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) {
    throw new Error("No Chrome page target found. Start Chrome with --remote-debugging-port=9222 first.");
  }
  return page.webSocketDebuggerUrl;
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  });

  return {
    async open() {
      if (ws.readyState === WebSocket.OPEN) return;
      await new Promise((resolve, reject) => {
        ws.addEventListener("open", resolve, { once: true });
        ws.addEventListener("error", reject, { once: true });
      });
    },
    send(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(callId, { resolve, reject });
        setTimeout(() => {
          if (!pending.has(callId)) return;
          pending.delete(callId);
          reject(new Error(`CDP timeout: ${method}`));
        }, 30000);
      });
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result?.result?.value;
}

async function navigate(cdp, url, waitMs) {
  await cdp.send("Page.navigate", { url });
  await sleep(waitMs);
}

async function saveScreenshot(cdp, screenshotPath) {
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true }).catch(() => null);
  if (screenshot?.data) fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
}

async function setAmazonPostalCode(cdp, postalCode, waitMs) {
  const cleanPostalCode = normalizePostalCode(postalCode);
  if (!cleanPostalCode) {
    return {
      postalCode: "",
      locationSetStatus: "not_requested",
      locationEvidence: "",
      ok: true,
    };
  }

  try {
    await navigate(cdp, "https://www.amazon.com/", waitMs);
    const openResult = await evaluate(
      cdp,
      `(() => {
        const candidates = [
          document.querySelector("#nav-global-location-popover-link"),
          document.querySelector("#glow-ingress-block"),
          ...Array.from(document.querySelectorAll('a, button, div[role="button"], span'))
            .filter(el => /deliver|delivery|update location|change address/i.test((el.innerText || el.getAttribute("aria-label") || "").trim()))
        ].filter(Boolean);
        for (const el of candidates) {
          try {
            el.scrollIntoView({ block: "center", inline: "center" });
            el.click();
            return { ok: true, action: "location_popover_clicked", label: (el.innerText || el.getAttribute("aria-label") || el.id || el.tagName).trim().slice(0, 120) };
          } catch (_) {}
        }
        return { ok: false, action: "location_popover_not_found" };
      })()`,
    );
    await sleep(1800);

    const submitResult = await evaluate(
      cdp,
      `((postalCode) => {
        const input = document.querySelector("#GLUXZipUpdateInput")
          || document.querySelector('input[name="zipCode"]')
          || Array.from(document.querySelectorAll("input")).find(el => /zip|postal/i.test([el.id, el.name, el.placeholder, el.getAttribute("aria-label")].filter(Boolean).join(" ")));
        if (!input) return { ok: false, action: "zip_input_not_found" };
        input.focus();
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.value = postalCode;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        const buttons = [
          document.querySelector("#GLUXZipUpdate"),
          document.querySelector('input[aria-labelledby*="GLUXZipUpdate"]'),
          ...Array.from(document.querySelectorAll('button, input[type="submit"], span.a-button-text'))
            .filter(el => /apply|done|update|submit/i.test((el.innerText || el.value || el.getAttribute("aria-label") || "").trim()))
        ].filter(Boolean);
        for (const button of buttons) {
          try {
            button.click();
            return { ok: true, action: "postal_code_submitted" };
          } catch (_) {}
        }
        return { ok: false, action: "submit_button_not_found" };
      })(${JSON.stringify(cleanPostalCode)})`,
    );
    await sleep(2500);

    await evaluate(
      cdp,
      `(() => {
        const closeCandidates = [
          document.querySelector("#GLUXConfirmClose"),
          document.querySelector(".a-popover-footer #GLUXConfirmClose"),
          ...Array.from(document.querySelectorAll('button, span.a-button-text'))
            .filter(el => /done|continue|close/i.test((el.innerText || el.getAttribute("aria-label") || "").trim()))
        ].filter(Boolean);
        for (const el of closeCandidates) {
          try {
            el.click();
            return true;
          } catch (_) {}
        }
        return false;
      })()`,
    ).catch(() => false);
    await sleep(1500);

    const evidence = await evaluate(
      cdp,
      `(() => {
        const selectors = [
          "#glow-ingress-line1",
          "#glow-ingress-line2",
          "#nav-global-location-data-modal-action",
          "#nav-global-location-slot",
          "#nav-global-location-popover-link"
        ];
        return selectors
          .map(selector => document.querySelector(selector))
          .filter(Boolean)
          .map(el => (el.innerText || el.textContent || el.getAttribute("aria-label") || "").replace(/\\s+/g, " ").trim())
          .filter(Boolean)
          .join(" | ")
          .slice(0, 300);
      })()`,
    );

    const verified = String(evidence ?? "").includes(cleanPostalCode);
    const submitted = Boolean(submitResult?.ok);
    return {
      postalCode: cleanPostalCode,
      locationSetStatus: submitted ? (verified ? "location_verified" : "location_submitted_unverified") : `location_failed:${submitResult?.action || "unknown"}`,
      locationEvidence: `open=${openResult?.action || "unknown"}; submit=${submitResult?.action || "unknown"}; page=${evidence || "none"}`,
      ok: submitted,
    };
  } catch (error) {
    return {
      postalCode: cleanPostalCode,
      locationSetStatus: `location_error:${error.message}`,
      locationEvidence: "",
      ok: false,
    };
  }
}

async function openAssistantPanel(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText || "";
      if (/What do you need help with today\\?/i.test(text)) return "already_open";
      const candidates = Array.from(document.querySelectorAll('a, button, div[role="button"], span'))
        .filter(el => /alexa for shopping|ask alexa|rufus/i.test((el.innerText || el.getAttribute('aria-label') || '').trim()));
      for (const el of candidates) {
        try {
          el.scrollIntoView({ block: "center", inline: "center" });
          el.click();
          return "clicked:" + (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 80);
        } catch (_) {}
      }
      return "not_found";
    })()`,
  );
}

async function extractPanelQuestions(cdp) {
  const data = await evaluate(
    cdp,
    `(() => {
      const bodyText = document.body.innerText || "";
      const startMarker = "What do you need help with today?";
      const endMarker = "Ask a shopping question";
      const start = bodyText.indexOf(startMarker);
      const fromPanel = start === -1 ? [] : (() => {
        const end = bodyText.indexOf(endMarker, start);
        return bodyText.slice(start + startMarker.length, end === -1 ? start + 2500 : end)
          .split(/\\n+/).map(s => s.trim()).filter(Boolean);
      })();
      const fromButtons = Array.from(document.querySelectorAll('button, [role="button"], a, div, span'))
        .map(el => (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim())
        .filter(text => text && text.length >= 12 && text.length <= 180 && text.endsWith("?"));
      return [...fromPanel, ...fromButtons];
    })()`,
  );
  return normalizeQuestions(data ?? []);
}

function addQuestionRow(rows, config, locationContext, sourceType, keyword, asin, productTitle, question, sourceUrl, screenshotPath, status) {
  rows.push({
    batchId: config.batchId,
    productName: config.productName,
    platform: "amazon_desktop_alexa_for_shopping",
    postalCode: locationContext.postalCode || "",
    locationSetStatus: locationContext.locationSetStatus || "",
    locationEvidence: locationContext.locationEvidence || "",
    sourceType,
    keyword,
    asin: asin || "",
    productTitle: productTitle || "",
    question,
    questionIntentKey: inferQuestionIntent(question),
    questionTheme: inferQuestionTheme(question),
    questionRole: inferQuestionRole(question),
    specialSignal: inferSpecialSignal(question),
    sourceUrl,
    screenshotPath,
    collectedAt: new Date().toISOString(),
    status,
  });
}

async function collect(config) {
  fs.mkdirSync(config.outDir, { recursive: true });
  const evidenceDir = path.join(config.outDir, "_evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });

  const questionRows = [];
  const keywordAsinRows = [];
  const keywordSummaryRows = [];
  const rankAuditRows = [];

  const cdp = createCdp(await getPageWsUrl(config.cdpBase));
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  try {
    const postalCodes = config.postalCodes.length ? config.postalCodes : [""];
    for (const postalCode of postalCodes) {
      const locationContext = await setAmazonPostalCode(cdp, postalCode, config.locationWaitMs);
      const locationSlug = locationContext.postalCode ? `${slugify(locationContext.postalCode)}_` : "";

      if (!locationContext.ok) {
        for (const keyword of config.keywords) {
          keywordSummaryRows.push({
            batchId: config.batchId,
            productName: config.productName,
            postalCode: locationContext.postalCode,
            locationSetStatus: locationContext.locationSetStatus,
            locationEvidence: locationContext.locationEvidence,
            keyword,
            searchQuestionCount: 0,
            topAsinCount: 0,
            topAsins: "",
            status: locationContext.locationSetStatus,
          });
        }
        continue;
      }

      for (const keyword of config.keywords) {
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
        const searchShot = path.join(evidenceDir, `${locationSlug}${slugify(keyword)}_search.png`);
        let searchStatus = "ok";
        let searchQuestions = [];

        console.log(`[rufus-collector] postal=${locationContext.postalCode || "browser_default"} keyword: ${keyword}`);
        try {
          await navigate(cdp, searchUrl, config.searchWaitMs);
          const panelStatus = await openAssistantPanel(cdp);
          await sleep(config.panelWaitMs);
          searchQuestions = await extractPanelQuestions(cdp);
          await saveScreenshot(cdp, searchShot);
          if (!searchQuestions.length) searchStatus = `no_search_questions; panel=${panelStatus}`;
          for (const question of searchQuestions) {
            addQuestionRow(questionRows, config, locationContext, "search_page", keyword, "", "", question, searchUrl, searchShot, searchStatus);
          }
        } catch (error) {
          searchStatus = `error: ${error.message}`;
        }

        let topAsins = [];
        try {
          const rankResult = await evaluate(cdp, buildOrganicRankBrowserScript({ limit: config.topAsins, maxCards: 48 }));
          topAsins = rankResult?.products ?? [];
          rankAuditRows.push(...(rankResult?.rankAuditRows ?? []).map((row) => ({
            batchId: config.batchId,
            productName: config.productName,
            postalCode: locationContext.postalCode,
            locationSetStatus: locationContext.locationSetStatus,
            locationEvidence: locationContext.locationEvidence,
            keyword,
            sourceUrl: searchUrl,
            collectedAt: new Date().toISOString(),
            ...row,
          })));
        } catch (error) {
          searchStatus = searchStatus === "ok" ? `asin_scan_error: ${error.message}` : `${searchStatus}; asin_scan_error: ${error.message}`;
        }

        if (!topAsins.length) {
          keywordAsinRows.push({
            batchId: config.batchId,
            productName: config.productName,
            postalCode: locationContext.postalCode,
            locationSetStatus: locationContext.locationSetStatus,
            locationEvidence: locationContext.locationEvidence,
            keyword,
            asinRank: "",
            asin: "",
            productTitle: "",
            productUrl: "",
            status: searchStatus === "ok" ? "no_top_asin_found" : searchStatus,
          });
        }

        for (let i = 0; i < topAsins.length; i += 1) {
          const topAsin = topAsins[i];
          keywordAsinRows.push({
            batchId: config.batchId,
            productName: config.productName,
            postalCode: locationContext.postalCode,
            locationSetStatus: locationContext.locationSetStatus,
            locationEvidence: locationContext.locationEvidence,
            keyword,
            asinRank: topAsin.asinRank || i + 1,
            searchResultType: topAsin.searchResultType || "organic",
            searchPagePosition: topAsin.searchPagePosition,
            sponsoredSkippedBefore: topAsin.sponsoredSkippedBefore,
            rankEvidence: topAsin.rankEvidence,
            asin: topAsin.asin,
            productTitle: topAsin.title,
            productUrl: topAsin.url,
            status: "ok",
          });

          if (!config.collectAsinPages) continue;

          const productShot = path.join(evidenceDir, `${locationSlug}${slugify(keyword)}_${topAsin.asin}_asin.png`);
          try {
            await navigate(cdp, topAsin.url, config.productWaitMs);
            const panelStatus = await openAssistantPanel(cdp);
            await sleep(config.panelWaitMs);
            const asinQuestions = await extractPanelQuestions(cdp);
            await saveScreenshot(cdp, productShot);
            const status = asinQuestions.length ? "ok" : `no_asin_questions; panel=${panelStatus}`;
            for (const question of asinQuestions) {
              addQuestionRow(questionRows, config, locationContext, "asin_page", keyword, topAsin.asin, topAsin.title, question, topAsin.url, productShot, status);
            }
          } catch (error) {
            addQuestionRow(
              questionRows,
              config,
              locationContext,
              "asin_page",
              keyword,
              topAsin.asin,
              topAsin.title,
              "",
              topAsin.url,
              productShot,
              `error: ${error.message}`,
            );
          }
        }

        keywordSummaryRows.push({
          batchId: config.batchId,
          productName: config.productName,
          postalCode: locationContext.postalCode,
          locationSetStatus: locationContext.locationSetStatus,
          locationEvidence: locationContext.locationEvidence,
          keyword,
          searchQuestionCount: searchQuestions.length,
          topAsinCount: topAsins.length,
          topAsins: topAsins.map((asin) => asin.asin).join(" | "),
          status: searchStatus,
        });
      }
    }
  } finally {
    cdp.close();
  }

  const questionHeader = [
    "batchId",
    "productName",
    "platform",
    "postalCode",
    "locationSetStatus",
    "locationEvidence",
    "sourceType",
    "keyword",
    "asin",
    "productTitle",
    "question",
    "questionIntentKey",
    "questionTheme",
    "questionRole",
    "specialSignal",
    "sourceUrl",
    "screenshotPath",
    "collectedAt",
    "status",
  ];
  const asinHeader = ["batchId", "productName", "postalCode", "locationSetStatus", "locationEvidence", "keyword", "asinRank", "searchResultType", "searchPagePosition", "sponsoredSkippedBefore", "rankEvidence", "asin", "productTitle", "productUrl", "status"];
  const summaryHeader = ["batchId", "productName", "postalCode", "locationSetStatus", "locationEvidence", "keyword", "searchQuestionCount", "topAsinCount", "topAsins", "status"];

  const questionCsvPath = path.join(config.outDir, "question_sources.csv");
  const keywordAsinCsvPath = path.join(evidenceDir, "keyword_asins.csv");
  const keywordSummaryCsvPath = path.join(evidenceDir, "keyword_collection_summary.csv");
  const rankAuditPath = path.join(evidenceDir, "search_rank_audit.json");
  const manifestPath = path.join(evidenceDir, "collection_manifest.json");

  writeCsv(questionCsvPath, questionHeader, questionRows.filter((row) => row.question));
  writeCsv(keywordAsinCsvPath, asinHeader, keywordAsinRows);
  writeCsv(keywordSummaryCsvPath, summaryHeader, keywordSummaryRows);
  fs.writeFileSync(rankAuditPath, JSON.stringify(rankAuditRows, null, 2), "utf8");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        batchId: config.batchId,
        productName: config.productName,
        keywords: config.keywords,
        postalCodes: config.postalCodes,
        topAsins: config.topAsins,
        generatedAt: new Date().toISOString(),
        outputs: { questionCsvPath, keywordAsinCsvPath, keywordSummaryCsvPath, rankAuditPath },
      },
      null,
      2,
    ),
    "utf8",
  );

  return { questionCsvPath, keywordAsinCsvPath, keywordSummaryCsvPath, rankAuditPath, manifestPath, questionRows, keywordAsinRows };
}

const args = parseArgs(process.argv.slice(2));
const keywordFile = args["keywords-file"];
const keywords = keywordFile
  ? parseKeywords(fs.readFileSync(path.resolve(keywordFile), "utf8"))
  : parseKeywords(requireArg(args, "keywords"));

if (!keywords.length) throw new Error("No keywords provided.");

const config = {
  productName: requireArg(args, "product"),
  keywords,
  postalCodes: parsePostalCodes(args),
  outDir: path.resolve(args["out-dir"] ?? path.join("output", `rufus_${slugify(args.product)}`)),
  batchId: args["batch-id"] ?? `rufus_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`,
  topAsins: numberArg(args["top-asins"], 3),
  collectAsinPages: boolArg(args["asin-pages"], true),
  cdpBase: args["cdp-base"] ?? DEFAULT_CDP,
  searchWaitMs: numberArg(args["search-wait-ms"], 8000),
  productWaitMs: numberArg(args["product-wait-ms"], 9000),
  panelWaitMs: numberArg(args["panel-wait-ms"], 5000),
  locationWaitMs: numberArg(args["location-wait-ms"], 5000),
};

const result = await collect(config);
console.log(JSON.stringify({
  ok: true,
  batchId: config.batchId,
  postalCodes: config.postalCodes,
  questionCount: result.questionRows.filter((row) => row.question).length,
  asinCount: result.keywordAsinRows.filter((row) => row.asin).length,
  outputs: {
    question_sources: result.questionCsvPath,
    keyword_asins: result.keywordAsinCsvPath,
    keyword_summary: result.keywordSummaryCsvPath,
    search_rank_audit: result.rankAuditPath,
    manifest: result.manifestPath,
  },
}, null, 2));
