/* ============================================================================
 * 【區塊 3】API SERVICE
 * ============================================================================ */

  const api = {
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
