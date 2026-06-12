import { spawn } from "node:child_process";
import path from "node:path";

const pluginRoot = "C:\\Users\\35741\\.codex\\plugins\\cache\\personal\\luchikey-image\\0.1.7";
const serverPath = path.join(pluginRoot, "scripts", "luchikey-image-mcp.mjs");

const iconPrompt = [
  "Design a polished mobile app icon for a Chinese summer music app named 夏日律动 / Summer Beats.",
  "Square app icon, centered composition, no device mockup, no watermark.",
  "Core symbols: glossy vinyl record, flowing ocean wave, subtle music note, summer sun sparkle.",
  "Color palette: deep sea blue #1B4965 background, sea-salt mint #AEEFF0 wave accents, coral #FF8577 and lemon #FFF275 highlights, clean white details.",
  "Style: premium modern vector-illustration rendered as a crisp bitmap, smooth gradients, high contrast at small sizes, rounded app-icon safe area, balanced negative space.",
  "Do not use emoji, do not include tiny illegible text, avoid generic stock-photo style."
].join(" ");

const splashPrompt = [
  "Create a vertical app launch image for a Chinese summer music app named 夏日律动 / Summer Beats.",
  "Portrait composition, immersive first-screen splash artwork, no phone mockup, no watermark.",
  "Deep sea blue background with soft ocean glow, a large elegant vinyl record blended with mint ocean waves, small coral and lemon summer highlights, floating bubbles and music-note shimmer.",
  "Leave clean visual space in the upper third for the app name, but render the brand text 夏日律动 and smaller SUMMER BEATS tastefully if legible.",
  "Mood: refreshing, warm, musical, seaside evening, refined mobile product identity.",
  "Palette: #1B4965, #AEEFF0, #E0F7FA, #FF8577, #FFF275, white.",
  "High quality bitmap illustration, smooth gradients, crisp edges, suitable for mobile startup screen."
].join(" ");

const allRequests = [
  {
    label: "icon",
    arguments: {
      prompt: iconPrompt,
      output_path: "static/branding/luchikey/summer-app-icon.png",
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      overwrite: true
    }
  },
  {
    label: "splash",
    arguments: {
      prompt: splashPrompt,
      output_path: "static/branding/luchikey/summer-launch.png",
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
      overwrite: true
    }
  }
];

const selected = process.argv[2];
const requests = selected ? allRequests.filter((request) => request.label === selected) : allRequests;
if (requests.length === 0) {
  throw new Error(`Unknown asset label: ${selected}`);
}

const child = spawn(process.execPath, [serverPath], {
  cwd: pluginRoot,
  env: {
    ...process.env,
    LUCHIKEY_IMAGE_OUTPUT_ROOT: process.cwd()
  },
  stdio: ["pipe", "pipe", "pipe"]
});

let nextId = 1;
let stdoutBuffer = Buffer.alloc(0);
const pending = new Map();

child.stdout.on("data", (chunk) => {
  stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);
  consume();
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

child.on("exit", (code) => {
  if (code !== 0 && pending.size > 0) {
    for (const { reject } of pending.values()) {
      reject(new Error(`LuchiKey MCP exited with code ${code}`));
    }
  }
});

function consume() {
  while (true) {
    const headerEnd = stdoutBuffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = stdoutBuffer.subarray(0, headerEnd).toString("utf8");
    const match = header.match(/content-length:\s*(\d+)/i);
    if (!match) {
      stdoutBuffer = stdoutBuffer.subarray(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const start = headerEnd + 4;
    const end = start + length;
    if (stdoutBuffer.length < end) return;
    const raw = stdoutBuffer.subarray(start, end).toString("utf8");
    stdoutBuffer = stdoutBuffer.subarray(end);
    const message = JSON.parse(raw);
    const entry = pending.get(message.id);
    if (!entry) continue;
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error.message || JSON.stringify(message.error)));
    } else {
      entry.resolve(message.result);
    }
  }
}

function send(method, params) {
  const id = nextId++;
  const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  const framed = `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`;
  child.stdin.write(framed);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

try {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "codex-local-luchikey-runner", version: "1.0.0" }
  });

  const results = [];
  for (const request of requests) {
    console.error(`Generating ${request.label}...`);
    const result = await send("tools/call", {
      name: "generate_image",
      arguments: request.arguments
    });
    results.push({ label: request.label, structuredContent: result.structuredContent });
  }

  child.stdin.end();
  child.kill();
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  child.kill();
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
