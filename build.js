#!/usr/bin/env node
/**
 * build.js — 把 js/ 資料夾的分割原始碼組合成可部署的 index.html
 *
 * 使用方法：
 *   node build.js
 *
 * 輸出：index.html（可直接上傳至 GitHub Pages）
 */

const fs = require('fs');
const path = require('path');

// ── 路徑設定 ──────────────────────────────────────────────────────────────────
const SRC_DIR   = path.join(__dirname, 'js');
const HEAD_FILE = path.join(__dirname, '_head.html');   // HTML head (靜態部分)
const OUT_FILE  = path.join(__dirname, 'index.html');

// ── Babel JSX 區塊（按順序載入） ──────────────────────────────────────────────
const BABEL_FILES = [
  '00-version-check.js',
  '01-config.js',
  '02-utilities.js',
  '03-api-service.js',
  '04-toast.js',
  '05-hooks.js',
  '06-ui-components.js',
  '07-screens.js',
  '08-assignment-screens.js',
  '09-daily-quest.js',
  '10-app.js',
];

// ── 純 JS（不需要 Babel 編譯） ────────────────────────────────────────────────
const PLAIN_JS_FILES = [
  '11-notification.js',
];

// ── 組合 ──────────────────────────────────────────────────────────────────────
function build() {
  // 1. HTML head
  const head = fs.readFileSync(HEAD_FILE, 'utf8');

  // 2. 合併所有 Babel JSX 檔案成一個 <script type="text/babel"> 區塊
  const babelParts = BABEL_FILES.map(f => {
    const content = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
    return `\n/* ${'='.repeat(76)}\n * ${f}\n * ${'='.repeat(76)} */\n\n${content}`;
  });

  const babelBlock =
    `<script type="text/babel" data-presets="react,env">\n` +
    babelParts.join('\n') +
    `\n</script>\n`;

  // 3. 純 JS 區塊
  const plainBlocks = PLAIN_JS_FILES.map(f => {
    const content = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
    return `<script>\n${content}\n</script>\n`;
  });

  // 4. 輸出
  const output = [head, babelBlock, ...plainBlocks, '</body>\n'].join('\n');
  fs.writeFileSync(OUT_FILE, output, 'utf8');

  const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`✅ 建置完成：index.html (${kb} KB)`);
  BABEL_FILES.forEach(f => console.log(`   ✔ js/${f}`));
  PLAIN_JS_FILES.forEach(f => console.log(`   ✔ js/${f} (plain)`));
}

build();
