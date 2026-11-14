import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 9222;
const DEFAULT_URL = "https://www.amazon.com/";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function checkPlaywrightConnect(port, timeoutMs = 15000) {
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: timeoutMs });
    const contexts = browser.contexts();
    const pages = contexts.flatMap((context) => context.pages());
    if (typeof browser.disconnect === "function") browser.disconnect();
    return {
      ok: true,
      playwrightConnectOk: true,
      contextCount: contexts.length,
      pageCount: pages.length,
    };
  } catch (error) {
    if (browser && typeof browser.disconnect === "function") browser.disconnect();
    const dependencyMissing = error?.code === "ERR_MODULE_NOT_FOUND" || /Cannot find package 'playwright'/.test(error.message || "");
    return {
      ok: false,
      playwrightConnectOk: false,
      dependencyMissing,
      playwrightError: error.message,
    };
  }
}

async function checkCdp(port) {
  const versionUrl = `http://127.0.0.1:${port}/json/version`;
  try {
    const version = await fetchJsonWithTimeout(versionUrl);
    const playwrightCheck = await checkPlaywrightConnect(port);
    if (!playwrightCheck.ok) {
      return {
        ok: false,
        status: playwrightCheck.dependencyMissing ? "playwright_dependency_missing" : "cdp_playwright_unavailable",
        port,
        versionUrl,
        browser: version.Browser ?? "",
        webSocketDebuggerUrl: version.webSocketDebuggerUrl ?? "",
        ...playwrightCheck,
      };
    }
    return {
      ok: true,
      status: "cdp_ready",
      port,
      versionUrl,
      browser: version.Browser ?? "",
      webSocketDebuggerUrl: version.webSocketDebuggerUrl ?? "",
      ...playwrightCheck,
    };
  } catch (error) {
    return {
      ok: false,
      status: "cdp_not_ready",
      port,
      versionUrl,
      error: error.message,
    };
  }
}

function launchDedicatedProfile(port) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const launchScript = path.join(scriptDir, "launch_chrome_rufus_profile.mjs");
  if (!fs.existsSync(launchScript)) {
    throw new Error(`Missing launch script: ${launchScript}`);
  }

  return spawnSync(
    process.execPath,
    [launchScript, "--port", String(port)],
    { stdio: "inherit" },
  );
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || DEFAULT_PORT);
const launch = Boolean(args["launch-dedicated-profile"] || args.launch);

let result = await checkCdp(port);

if (!result.ok && launch && result.status === "cdp_not_ready") {
  const launchResult = launchDedicatedProfile(port);
  if (launchResult.status !== 0) {
    printResult({
      ...result,
      launchAttempted: true,
      launchStatus: launchResult.status,
      nextActionZh: "Chrome CDP 启动失败。请确认已安装 Google Chrome/Chromium，并且当前环境有图形桌面；也可以连接已有 CDP 会话。",
    });
    process.exit(launchResult.status ?? 1);
  }

  for (let i = 0; i < 12; i += 1) {
    await sleep(1000);
    result = await checkCdp(port);
    if (result.ok) break;
  }
}

if (result.ok) {
  printResult({
    ...result,
    launchAttempted: launch,
    amazonUrl: DEFAULT_URL,
    nextActionZh: "CDP 已连接 Google Chrome。请确认该 Chrome 窗口已登录 Amazon，然后继续运行采集脚本。",
  });
  process.exit(0);
}

if (result.status === "cdp_playwright_unavailable") {
  printResult({
    ...result,
    launchAttempted: launch,
    nextActionZh: "CDP HTTP 端口可读，但 Playwright 无法接管该 Chrome。请关闭当前 debug Chrome 后重新运行专用 Chrome profile，并确认 Amazon 登录状态。",
  });
  process.exit(3);
}

if (result.status === "playwright_dependency_missing") {
  printResult({
    ...result,
    launchAttempted: launch,
    nextActionZh: "缺少 Playwright 依赖。请先在当前 skill/交付包目录运行 npm install，再执行 CDP 检查和采集。",
  });
  process.exit(4);
}

printResult({
  ...result,
  launchAttempted: launch,
  nextActionZh: "CDP 未连接。请先运行：node ./scripts/rufus_cdp_preflight.mjs --launch-dedicated-profile，登录 Amazon 后再继续采集。",
});
process.exit(2);
