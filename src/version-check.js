/* ============================================================================
 * 【版本檢查系統】自動偵測新版本並提示用戶刷新
 * ============================================================================ */

const APP_VERSION = "2026.06.08.v51";                  // ⚠️ 每次發佈要手動改
const VERSION_CHECK_URL = "./version.json";
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;        // 每 5 分鐘檢查一次

// 暴露一個全域 flag，讓 React 組件把當前 gameState 寫進來
window.__APP_STATE__ = { gameState: 'start' };

async function checkForUpdate() {
  try {
    const res = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.version && data.version !== APP_VERSION) {
      showUpdatePrompt(data.version, data.releaseNote);
    }
  } catch (e) {
    console.warn('[版本檢查] 失敗:', e);
  }
}

function showUpdatePrompt(newVersion, releaseNote) {
  // 避免重複彈出
  if (document.getElementById('app-update-banner')) return;
  window.__APP_PENDING_UPDATE__ = true; 

  // 🆕 判斷用戶是否在答題中（透過 window.__APP_STATE__）
  const isPlaying = window.__APP_STATE__ &&
                    window.__APP_STATE__.gameState === 'playing';

  const mainMsg = isPlaying
    ? `🎉 新版本已發佈 (${newVersion})！答完本局練習後再刷新即可更新`
    : `🎉 發現新版本 (${newVersion})！請立即更新以獲得最新功能`;

  const banner = document.createElement('div');
  banner.id = 'app-update-banner';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(90deg, #6366f1, #a855f7);
    color: white; padding: 12px 16px;
    font-family: 'Noto Sans TC', sans-serif; font-size: 14px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    display: flex; align-items: center; justify-content: center;
    gap: 12px; flex-wrap: wrap;
    animation: slideDownBanner 0.4s ease-out;
  `;

  // 加入動畫 keyframes（只加一次）
  if (!document.getElementById('app-update-banner-style')) {
    const style = document.createElement('style');
    style.id = 'app-update-banner-style';
    style.textContent = `
      @keyframes slideDownBanner {
        from { transform: translateY(-100%); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  banner.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <span style="font-weight: 600;">${mainMsg}</span>
      ${releaseNote ? `<span style="font-size: 12px; opacity: 0.9;">📝 ${releaseNote}</span>` : ''}
    </div>
    <div style="display: flex; gap: 8px; flex-shrink: 0;">
      <button id="app-update-btn" style="
        background: white; color: #6366f1; border: none;
        padding: 6px 16px; border-radius: 6px;
        font-weight: bold; cursor: pointer; font-size: 13px;
        transition: transform 0.15s;
      " onmouseover="this.style.transform='scale(1.05)'"
         onmouseout="this.style.transform='scale(1)'">
        ${isPlaying ? '答完再說' : '立即更新'}
      </button>
      <button id="app-update-later" style="
        background: transparent; color: white;
        border: 1px solid rgba(255,255,255,0.6);
        padding: 6px 12px; border-radius: 6px;
        cursor: pointer; font-size: 13px;
      ">關閉</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('app-update-btn').onclick = () => {
    if (isPlaying) {
      // 答題中 → 只關閉橫幅，等答完自然會再次提示
      banner.remove();
    } else {
      forceReload();
    }
  };
  document.getElementById('app-update-later').onclick = () => banner.remove();
}

function forceReload() {
  // 清除所有 caches（若有 service worker）
  if ('caches' in window) {
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .finally(() => location.reload(true));
  } else {
    location.reload(true);
  }
}

// 啟動檢查：首次載入 30 秒後開始，之後每 5 分鐘
setTimeout(checkForUpdate, 30000);
setInterval(checkForUpdate, VERSION_CHECK_INTERVAL);

// 🆕 當用戶從其他分頁切回來時，立即檢查一次
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkForUpdate();
});

// 🆕 [C1 修復] 只在用戶「回到主畫面 (start)」時才考慮刷新
//     而非離開 playing 就立即刷新（避免中斷結算頁的成績上傳）
window.addEventListener('app-state-changed', () => {
  const st = window.__APP_STATE__;

  // 必要條件：
  // 1. 已經回到 start 主畫面（不是 result/shop/stats 等）
  // 2. 沒有橫幅顯示中
  // 3. 有待更新標記
  if (!st || st.gameState !== 'start') return;
  if (document.getElementById('app-update-banner')) return;
  if (!window.__APP_PENDING_UPDATE__) return;

  // 額外等 1.5 秒，讓離線佇列、錯題簿同步等背景請求有機會完成
  setTimeout(() => {
    // 二次確認：若仍有未上傳的成績，就先不刷新（等下一次回到 start 再試）
    const pending = window.__APP_PENDING_SUBMITS__ || 0;
    if (pending > 0) {
      console.log(`[版本檢查] 仍有 ${pending} 筆成績待上傳，延後刷新`);
      return;
    }
    // 再次檢查標記是否仍存在（避免被其他流程清掉）
    if (!window.__APP_PENDING_UPDATE__) return;
    if (document.getElementById('app-update-banner')) return;

    forceReload();
  }, 1500);
});
