# 軒軒陪你溫Bio — 原始碼結構說明

## 目錄結構

```
sohinrevisewithyou/
├── _head.html              # HTML <head> + CDN 引用（靜態部分）
├── index.html              # ⚡ 部署檔案（由 build.js 自動生成）
├── build.js                # 建置腳本：把 js/ 合併成 index.html
├── version.json            # 版本號（供版本更新提示系統讀取）
└── js/                     # 原始碼（按功能分割）
    ├── 00-version-check.js   # 版本檢查系統、更新提示 Banner
    ├── 01-config.js          # CONFIG、LEVEL_TITLES、SHOP_ITEMS 等常數
    ├── 02-utilities.js       # 所有 helper functions（formatText、shuffleArray 等）
    ├── 03-api-service.js     # API 物件（fetchQuestions、submitGame 等）
    ├── 04-toast.js           # Toast 通知系統（ToastContext、ToastProvider）
    ├── 05-hooks.js           # 所有 custom hooks（useDarkMode、useWrongBook 等）
    ├── 06-ui-components.js   # 共用小組件 + 統計圖表（LoadingImage、DonutChart 等）
    ├── 07-screens.js         # 主要畫面（StartScreen、FlashCard、ResultScreen 等）
    ├── 08-assignment-screens.js  # 老師任務管理 + 成績單畫面
    ├── 09-daily-quest.js     # 每日任務面板組件
    ├── 10-app.js             # 主應用程式（BiologyFlashcardApp、Root、render）
    └── 11-notification.js    # 每日 08:15 推播通知（純 JS，不需 Babel）
```

## 修改流程

1. 編輯 `js/` 底下對應的檔案
2. 執行建置指令（需安裝 Node.js）：
   ```bash
   node build.js
   ```
3. 把整個資料夾推送到 GitHub Pages 即可

## GitHub Pages 部署

直接把這個資料夾推到 GitHub repository 的 `main` branch，  
在 repo Settings → Pages → Source 選 `main / root` 即可。

> **⚠️ 注意：** 只需要部署 `index.html`、`version.json`、以及其他靜態資源。  
> `_head.html`、`build.js`、`js/` 資料夾也可以一起推送（它們不影響網站運作）。

## 更新版本號

在 `js/01-config.js` 第一行找到：
```js
const APP_VERSION = "2026.05.27.v46";
```
修改後，同步更新 `version.json`：
```json
{ "version": "2026.06.06.v50", "releaseNote": "新功能說明" }
```
