import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

function firstExisting(paths) {
  return paths.filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

function findOnPath(names) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  for (const name of names) {
    const result = spawnSync(locator, [name], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status === 0) {
      const match = String(result.stdout || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (match) return match;
    }
  }
  return "";
}

function findWindowsRegistryChrome() {
  const result = spawnSync(
    "reg.exe",
    ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe", "/ve"],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) return "";
  const match = String(result.stdout || "").match(/REG_SZ\s+(.+?)\s*$/m);
  const candidate = match?.[1]?.trim() || "";
  return candidate && fs.existsSync(candidate) ? candidate : "";
}

function findWindowsUserChrome() {
  const usersRoot = path.join(process.env.SystemDrive || "C:", "Users");
  try {
    const candidates = fs.readdirSync(usersRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(usersRoot, entry.name, "AppData", "Local", "Google", "Chrome", "Application", "chrome.exe"));
    return firstExisting(candidates) || "";
  } catch {
    return "";
  }
}

function findChrome() {
  if (process.platform === "win32") {
    return firstExisting([
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
      process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    ]) || findWindowsRegistryChrome() || findWindowsUserChrome() || findOnPath(["chrome.exe", "chrome"]);
  }

  if (process.platform === "darwin") {
    return firstExisting([
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(os.homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
    ]);
  }

  return findOnPath(["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]);
}

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid CDP port: ${args.port}`);
}

if (process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  throw new Error("No graphical desktop detected. Connect to an existing Chrome CDP session, or run this launcher on a machine with a desktop environment.");
}

const chromePath = findChrome();
if (!chromePath) {
  throw new Error("Google Chrome or Chromium was not found. Install Chrome, start it once, and retry.");
}

const profileDir = path.resolve(
  String(args["profile-dir"] || path.join(os.homedir(), ".amazon-ai-shopping-cn", "chrome-profile")),
);
const amazonUrl = String(args.url || DEFAULT_URL);
fs.mkdirSync(profileDir, { recursive: true });

const chromeArgs = [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  amazonUrl,
];

if (args["dry-run"]) {
  console.log(JSON.stringify({
    status: "chrome_launch_ready",
    platform: process.platform,
    chromePath,
    port,
    profileDir,
    amazonUrl,
  }, null, 2));
  process.exit(0);
}

const child = spawn(chromePath, chromeArgs, {
  detached: true,
  stdio: "ignore",
  windowsHide: false,
});

await new Promise((resolve, reject) => {
  child.once("spawn", resolve);
  child.once("error", reject);
});
child.unref();

console.log(JSON.stringify({
  status: "chrome_started",
  platform: process.platform,
  port,
  profileDir,
  amazonUrl,
  nextActionZh: "请在新打开的 Chrome 窗口登录 Amazon，然后重新运行 CDP 检查。",
}, null, 2));
