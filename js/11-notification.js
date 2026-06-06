/* ============================================================
 * 每天 HKT 08:15 提醒做 Bio（需瀏覽器 Notification API 支援）
 * ============================================================ */
(function () {
  if (!('Notification' in window)) return; // 不支援則靜默退出

  /* 請求通知權限（延遲 3 秒，避免一進頁面就彈） */
  function askPermission() {
    /* 觸發通知，並排程明天同一時間 */
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  // [修復] 移除 setTimeout(askPermission, 3000); 以防被瀏覽器阻擋
  // 改為暴露到全域，請在 React 內的「開始練習」或「登入」按鈕 onClick 事件中呼叫 window.askPermission()
  window.askPermission = askPermission;

  /* 計算距離「今天 HKT 08:15」還有多少毫秒 */
  function msUntilNext815HKT() {
    const now = new Date();
    /* 用 Intl 取香港現在時間的時/分，避免時區換算錯誤 */
    const hktParts = new Intl.DateTimeFormat('en-HK', {
      timeZone: 'Asia/Hong_Kong',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).formatToParts(now);
    const hktH = parseInt(hktParts.find(p => p.type === 'hour').value);
    const hktM = parseInt(hktParts.find(p => p.type === 'minute').value);
    const hktS = parseInt(hktParts.find(p => p.type === 'second').value);

    const targetMinutes = 8 * 60 + 15; // 08:15
    const nowMinutes = hktH * 60 + hktM;

    let diffMs = (targetMinutes - nowMinutes) * 60 * 1000 - hktS * 1000;
    if (diffMs <= 0) diffMs += 24 * 60 * 60 * 1000; // 已過了今天，等明天
    return diffMs;
  }

  /* 觸發通知，並排程明天同一時間 */
  function fireNotification() {
    if (Notification.permission === 'granted') {
      new Notification('軒軒陪你溫Bio ⏰', {
        body: '是時候了！做Bio！',
        icon: 'favicon.ico',
        tag: 'daily-bio-reminder', // 防止重複疊加
        renotify: true,
      });
    }
    // 24 小時後再觸發
    setTimeout(fireNotification, 24 * 60 * 60 * 1000);
  }

  // 等到下一個 HKT 08:15 才第一次觸發
  const delay = msUntilNext815HKT();
  console.log(`[Bio提醒] 距離下次提醒：${Math.round(delay / 60000)} 分鐘`);
  setTimeout(fireNotification, delay);
})();
