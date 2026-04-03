import fs from "node:fs";
import path from "node:path";
import {
  CLAUDE_MD_INSTRUCTION,
  EMOBAR_START_MARKER,
  EMOBAR_END_MARKER,
  CLAUDE_MD_PATH,
  SETTINGS_PATH,
  HOOKS_DIR,
  HOOK_SCRIPT_PATH,
  BACKUP_SUFFIX,
} from "./types.js";

// --- CLAUDE.md ---

export function injectClaudeMd(filePath: string = CLAUDE_MD_PATH): void {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf-8");
    if (content.includes(EMOBAR_START_MARKER)) return;
  }

  const separator = content.length > 0 && !content.endsWith("\n") ? "\n\n" : "\n";
  const newContent = content.length > 0
    ? `${content}${separator}${CLAUDE_MD_INSTRUCTION}\n`
    : `${CLAUDE_MD_INSTRUCTION}\n`;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, newContent);
}

export function removeClaudeMd(filePath: string = CLAUDE_MD_PATH): void {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(EMOBAR_START_MARKER);
  const endIdx = content.indexOf(EMOBAR_END_MARKER);
  if (startIdx === -1 || endIdx === -1) return;

  const before = content.slice(0, startIdx).replace(/\n+$/, "");
  const after = content.slice(endIdx + EMOBAR_END_MARKER.length).replace(/^\n+/, "");
  const newContent = before + (before && after ? "\n" : "") + after;

  fs.writeFileSync(filePath, newContent || "");
}

// --- settings.json hooks ---

export function addHookToSettings(
  filePath: string = SETTINGS_PATH,
  hookScriptPath: string = HOOK_SCRIPT_PATH,
): void {
  let settings: Record<string, any> = {};
  if (fs.existsSync(filePath)) {
    settings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.Stop) settings.hooks.Stop = [];

  const command = `node "${hookScriptPath}"`;
  const exists = settings.hooks.Stop.some(
    (entry: any) => entry.hooks?.some(
      (h: any) => h.command === command
    )
  );
  if (exists) return;

  settings.hooks.Stop.push({
    hooks: [{
      type: "command",
      command,
    }],
  });

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

export function removeHookFromSettings(filePath: string = SETTINGS_PATH): void {
  if (!fs.existsSync(filePath)) return;

  const settings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!settings.hooks?.Stop) return;

  settings.hooks.Stop = settings.hooks.Stop.filter(
    (entry: any) => !entry.hooks?.some(
      (h: any) => h.command?.includes("emobar")
    )
  );

  if (settings.hooks.Stop.length === 0) delete settings.hooks.Stop;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

// --- Full setup / uninstall ---

function backup(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + BACKUP_SUFFIX);
  }
}

export function deployHookScript(hookScriptPath: string = HOOK_SCRIPT_PATH): void {
  const dir = path.dirname(hookScriptPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const packageHook = new URL("../dist/emobar-hook.js", import.meta.url).pathname
    .replace(/^\/([A-Z]:)/, "$1");
  fs.copyFileSync(packageHook, hookScriptPath);
}

export function setup(): void {
  console.log("EmoBar Setup");
  console.log("============\n");

  backup(CLAUDE_MD_PATH);
  backup(SETTINGS_PATH);
  console.log("  Backups created");

  deployHookScript();
  console.log(`  Hook script deployed to ${HOOK_SCRIPT_PATH}`);

  injectClaudeMd();
  console.log(`  Emotional check-in added to ${CLAUDE_MD_PATH}`);

  addHookToSettings();
  console.log(`  Stop hook added to ${SETTINGS_PATH}`);

  console.log("\n  EmoBar is active. Claude will perform emotional check-ins from now on.");
  console.log("  Add to your statusline: npx emobar display");
}

export function uninstall(): void {
  console.log("EmoBar Uninstall");
  console.log("================\n");

  removeClaudeMd();
  console.log("  Removed EMOBAR section from CLAUDE.md");

  removeHookFromSettings();
  console.log("  Removed Stop hook from settings.json");

  if (fs.existsSync(HOOK_SCRIPT_PATH)) {
    fs.unlinkSync(HOOK_SCRIPT_PATH);
    console.log("  Removed hook script");
  }

  console.log("\n  EmoBar has been uninstalled.");
}
