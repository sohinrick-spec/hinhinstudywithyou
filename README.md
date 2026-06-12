# 軒軒陪你溫Bio (SohinReviseWithYou)

HKDSE Biology flashcard platform with gamification — XP, leaderboard, wrong-answer book, shop, assignments, and interactive simulations.

**Version:** 2026.06.08.v51  
**Stack:** React 18 (Babel standalone) · Tailwind CSS · Framer Motion · Google Apps Script backend

---

## Project Structure

```
sohinrevisewithyou/
├── index.html                  ← Entry point — loads all src/ modules in order
├── version.json                ← { "version": "...", "releaseNote": "..." } for auto-update banner
├── favicon.ico
└── src/
    ├── version-check.js        ← Auto-update banner + forceReload (vanilla JS)
    ├── config.js               ← CONFIG, LEVEL_TITLES, SHOP_ITEMS, ALL_CHAPTERS, constants
    ├── utils.js                ← Pure utility functions + image preload cache
    ├── api.js                  ← GAS API service (fetch wrappers for all backend actions)
    ├── toast.js                ← ToastContext + ToastProvider
    ├── hooks.js                ← All custom React hooks (useWrongBook, useLeaderboard, …)
    ├── components.js           ← Shared UI + chart components (DonutChart, RadarChart, …)
    ├── screens.js              ← StartScreen, FlashCard, LeaderboardScreen,
    │                             StatsScreen, TeacherStatsScreen,
    │                             WrongBookScreen, ShopScreen, ResultScreen
    ├── assignment-screens.js   ← AssignmentAdminScreen, AssignmentReportScreen
    ├── daily-quest.js          ← DailyQuestPanel
    ├── app.js                  ← BiologyFlashcardApp (main state machine) + Root + render
    └── notification.js         ← Daily 08:15 HKT push notification scheduler (vanilla JS)
```

---

## Module Dependency Order

Scripts must load in this order (as declared in `index.html`):

```
version-check.js   (vanilla, before React)
  ↓
config.js          (constants used by everything)
  ↓
utils.js           (pure functions used by hooks + components)
  ↓
api.js             (uses CONFIG)
  ↓
toast.js           (React context)
  ↓
hooks.js           (uses api, utils, CONFIG)
  ↓
components.js      (uses hooks, utils)
  ↓
screens.js         (uses components, hooks, api, utils)
  ↓
assignment-screens.js  (uses components, api)
  ↓
daily-quest.js     (uses components)
  ↓
app.js             (assembles everything → ReactDOM.render)
  ↓
notification.js    (vanilla, after React boots)
```

---

## Key Files to Edit

| What you want to change | File |
|---|---|
| API URLs / game config | `src/config.js` |
| Backend API calls | `src/api.js` |
| Version number | `src/version-check.js` (APP_VERSION) + `version.json` |
| Flashcard / game logic | `src/app.js` |
| Start screen + question UI | `src/screens.js` |
| Teacher assignment screens | `src/assignment-screens.js` |
| Charts and shared UI | `src/components.js` |
| Wrong book / shop hooks | `src/hooks.js` |

---

## Deploying

This is a **static site** — no build step required.  
Upload the whole folder to GitHub Pages, Netlify, or any static host.

For GitHub Pages:
1. Push to `main`
2. Enable Pages → `main` branch → root `/`
3. Update `CONFIG.GOOGLE_SCRIPT_URL` in `src/config.js` to your GAS deployment URL

---

## Updating the Version Banner

1. Edit `APP_VERSION` in `src/version-check.js`
2. Update `version.json`:
```json
{
  "version": "2026.06.09.v52",
  "releaseNote": "新增功能說明"
}
```
The banner auto-appears for users still on the old version.
