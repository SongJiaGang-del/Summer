import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.cwd();
const configPath = "C:\\Users\\35741\\.luchikey-image\\config.json";
const config = JSON.parse(await readFile(configPath, "utf8"));
const endpoint = `${config.base_url || "https://sub2api.luchikey.com"}${config.image_endpoint || "/v1/images/generations"}`;
const model = config.image_model || "gpt-image-2";

const prompts = {
  icon: {
    size: "1024x1024",
    output: "static/branding/luchikey/summer-app-icon.png",
    prompt:
      "Premium square mobile app icon for Chinese summer music app '夏日律动' / Summer Beats. Deep sea blue background (#1B4965), glossy vinyl record in center, mint ocean wave (#AEEFF0), coral and lemon summer highlights, clean white music-note shimmer. Modern vector-like bitmap illustration, crisp at small sizes, rounded app icon safe area, no watermark, no phone mockup, no tiny text."
  },
  splash: {
    size: "1024x1536",
    output: "static/branding/luchikey/summer-launch.png",
    prompt:
      "Vertical mobile launch image for Chinese summer music app '夏日律动' / Summer Beats. Deep sea blue background, large elegant vinyl record blended with mint ocean waves, coral and lemon glow accents, floating bubbles, refined seaside evening music mood. Include tasteful brand text 夏日律动 and small SUMMER BEATS if legible. High quality bitmap illustration, no watermark, no phone mockup."
  },
  iconLight: {
    size: "1024x1024",
    output: "static/branding/luchikey/summer-app-icon-light.png",
    prompt:
      "Fresh light pastel square mobile app icon for Chinese summer music app '夏日律动' / Summer Beats. Clean airy style matching a refreshing mint-and-white mobile UI. Background mostly pale seafoam #E0F7FA and soft white, with translucent glassy gradients. Center: minimal glossy vinyl record partly wrapped by a gentle mint ocean wave #AEEFF0, small coral #FF8577 and lemon #FFF275 highlights. Use deep sea blue #1B4965 only as subtle thin accents, not as a heavy background. Modern refined bitmap illustration, simple readable silhouette at small size, rounded app icon safe area, no watermark, no phone mockup, no dark moody palette, no tiny illegible text."
  },
  splashLight: {
    size: "1024x1536",
    output: "static/branding/luchikey/summer-launch-light.png",
    prompt:
      "Fresh light pastel vertical app launch image for Chinese summer music app '夏日律动' / Summer Beats. Match a clean refreshing mobile UI: pale mint #E0F7FA, white, soft aqua #AEEFF0, gentle coral and lemon highlights. Airy composition with lots of breathing room, translucent glass-like bubbles, soft sea breeze waves, a subtle vinyl record motif in the center, delicate music shimmer. Deep sea blue #1B4965 only for small refined accents and optional brand text, avoid heavy dark background. Include tasteful brand text 夏日律动 and small SUMMER BEATS if legible. High quality bitmap illustration, no watermark, no phone mockup, no dark moody palette."
  }
};

const label = process.argv[2] || "icon";
const item = prompts[label];
if (!item) throw new Error(`Unknown label: ${label}`);

const outPath = path.resolve(workspace, item.output);
const logPath = path.resolve(workspace, `static/branding/luchikey/${label}-direct-response.json`);
await mkdir(path.dirname(outPath), { recursive: true });

const body = {
  model,
  prompt: item.prompt,
  size: item.size,
  quality: "medium",
  n: 1,
  response_format: "b64_json",
  output_format: "png"
};

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 180000);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.LUCHIKEY_API_KEY || config.api_key}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  body: JSON.stringify(body),
  signal: controller.signal
}).finally(() => clearTimeout(timeout));

const contentType = response.headers.get("content-type") || "";
const text = await response.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  payload = { raw: text.slice(0, 5000) };
}

await writeFile(logPath, JSON.stringify({
  status: response.status,
  ok: response.ok,
  contentType,
  keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
  sample: summarize(payload)
}, null, 2), "utf8");

if (!response.ok) {
  throw new Error(`LuchiKey HTTP ${response.status}; see ${logPath}`);
}

const b64 = findBase64Image(payload);
if (!b64) {
  throw new Error(`No base64 image in response; see ${logPath}`);
}

await writeFile(outPath, Buffer.from(b64, "base64"));
console.log(JSON.stringify({ label, saved_path: outPath, log_path: logPath }, null, 2));

function findBase64Image(value) {
  if (!value || typeof value !== "object") return "";
  if (typeof value.b64_json === "string") return value.b64_json;
  if (typeof value.result === "string" && value.result.length > 1000) return value.result;
  if (value.item) {
    const nested = findBase64Image(value.item);
    if (nested) return nested;
  }
  if (Array.isArray(value.data)) {
    for (const entry of value.data) {
      const nested = findBase64Image(entry);
      if (nested) return nested;
    }
  }
  if (Array.isArray(value.output)) {
    for (const entry of value.output) {
      const nested = findBase64Image(entry);
      if (nested) return nested;
    }
  }
  return "";
}

function summarize(value) {
  if (!value || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value, (key, val) => {
    if (typeof val === "string" && val.length > 500) return `${val.slice(0, 80)}...<${val.length} chars>`;
    return val;
  }));
}
