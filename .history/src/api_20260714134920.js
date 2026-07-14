/* ============================================================================
 * 【區塊 3】API SERVICE
 * ============================================================================ */

  // 🔐 管理員 token（存記憶體，重新整理頁面需重新登入）
  let __ADMIN_TOKEN__ = null;

  const api = {
  // 🔐 驗證管理員密碼，成功就記住 token
  async verifyAdmin(password) {
    try {
      const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'verify_admin', password })
      });
      const data = await res.json();
      if (data && data.ok && data.token) {
        __ADMIN_TOKEN__ = data.token;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
  isAdminUnlocked() {
    return !!__ADMIN_TOKEN__;
  },
  async fetchQuestions() {
    const res = await fetch(CONFIG.QUESTION_API_URL);
    return res.json();
  },
  async fetchLeaderboard() {
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL);
    return res.json();
  },
  async submitGame({ name, score, total, time, doubleXPActive, scope }) {
    return fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submit_game",
        name, score, total, time,
        mode: CONFIG.GAME_MODE,
        doubleXPActive, scope
      })
    });
  },
  async buyItem({ name, item, cost }) {
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "buy_item", name, item, cost })
    });
    return res.json();
  },
  syncUser({ name, skipCards }) {
    return fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'sync_user', name, skipCards })
    });
  },
  async claimQuestReward({ name, coins, xp }) {
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'wrongbook_reward', name, coins, xp })
    });
    return res.json();
  },
  wrongBookReward({ name }) {
    return fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'wrongbook_reward', name, coins: 2, xp: 2 })
    });
  },
  /* 🆕 老師任務相關 API */
  async createAssignment(payload) {
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'create_assignment', ...payload })
    });
    return res.json();
  },
  async submitAssignment(payload) {
    return fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'submit_assignment', ...payload })
    });
  },
  async getAssignmentReport(assignmentId) {
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_assignment_report', assignmentId })
    });
    return res.json();
  },
  async toggleAssignment(assignmentId, active) {
    return fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'toggle_assignment', assignmentId, active })
    });
  },
  async updateAssignment(payload) {
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update_assignment', ...payload })
    });
    return res.json();
  }
};
