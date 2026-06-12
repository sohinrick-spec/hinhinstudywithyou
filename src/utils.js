/* ============================================================================
 * 【區塊 2】UTILITIES
 * ============================================================================ */

const { useState, useEffect, useMemo, useRef, useCallback, useContext, createContext, memo } = React;
const MotionLib = window.Motion || { motion: { div: 'div' }, AnimatePresence: ({children}) => children };
const { motion, AnimatePresence } = MotionLib;

function formatText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '    ');
}

function decodeJwtResponse(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonPayload);
}

function getHKDateString(dateObj) {
  const baseDate = dateObj || new Date();
  const utc = baseDate.getTime() + (baseDate.getTimezoneOffset() * 60000);
  const hk = new Date(utc + (3600000 * 8));
  const y = hk.getFullYear();
  const m = String(hk.getMonth() + 1).padStart(2, '0');
  const d = String(hk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getQuestionId(q) {
  if (!q) return null;
  if (q.id !== undefined && q.id !== null && q.id !== '') return String(q.id);
  const title = q.title || q.question || '';
  if (!title) return null;
  return `${q.category || ''}::${String(title).slice(0, 80)}`;
}

function shortenName(fullName) {
  if (!fullName) return '';
  return String(fullName)
    .replace(/^\s*[4-6][A-Z]\d+\s*/i, '')
    .replace(/\s*\([\d\-]+\)(\s*[A-Za-z0-9]+)?\s*$/, '')
    .trim();
}

// 中六同學在 5月31日後從排行榜隱藏
function isGraduated(fullName) {
  if (getStudentForm(fullName) !== '6') return false;
  const now = new Date();
  const hkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
  // Hide from May 31 onward: month > 4, OR month === 4 AND date >= 31
  return hkt.getMonth() > 4 || (hkt.getMonth() === 4 && hkt.getDate() >= 31);
}

function getStudentForm(fullName) {
  if (!fullName) return null;
  const match = String(fullName).match(/([4-6])[A-Z]\d+/i);
  return match ? match[1] : null;
}

// 從全名提取純英文姓名部分作為永久識別 key
// 例："6B03 Chan Tai Man" → "Chan Tai Man"
// 若無班號前綴則原樣返回
function getCanonicalName(fullName) {
  if (!fullName) return fullName;
  return String(fullName).replace(/^[4-6][A-Z]\d+\s*/i, '').trim() || fullName;
}

function normalizeNameForMatch(name) {
  if (!name) return '';
  return shortenName(name)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/* 預先正規化老師名稱清單（模組載入時一次） */
const TEACHER_NORMALIZED_SET = new Set(CONFIG.TEACHER_NAMES.map(normalizeNameForMatch));

function isTeacher(name) {
  if (!name || name === '訪客 (未登入)') return false;
  const normalized = normalizeNameForMatch(name);
  return !!normalized && TEACHER_NORMALIZED_SET.has(normalized);
}

function getWeekStartHK(dateObj) {
  const baseDate = dateObj || new Date();
  const utc = baseDate.getTime() + (baseDate.getTimezoneOffset() * 60000);
  const hk = new Date(utc + (3600000 * 8));
  const day = hk.getDay();
  const diff = day === 0 ? 6 : day - 1;
  hk.setDate(hk.getDate() - diff);
  const y = hk.getFullYear();
  const m = String(hk.getMonth() + 1).padStart(2, '0');
  const d = String(hk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const BATTLE_STD_TIME_PER_Q_MS = 30 * 1000;

function parseScopeCount(scopeStr) {
  if (!scopeStr || typeof scopeStr !== 'string' || !scopeStr.trim()) return 1;
  let count = 0;
  const parts = scopeStr.split('|');
  for (let i = 0; i < parts.length; i++) {
    const items = parts[i].trim().split(',');
    for (let j = 0; j < items.length; j++) {
      if (items[j].trim().length > 0) count++;
    }
  }
  return Math.max(1, count);
}

function parseScopeChapters(scopeStr) {
  if (!scopeStr || typeof scopeStr !== 'string') return [];
  return scopeStr.split('|').flatMap(p =>
    p.split(',').map(s => s.trim()).filter(Boolean)
  );
}

/* 🆕 縮短 scope 顯示，避免章節過多撐爆 UI */
function formatScopeShort(scopeStr, maxItems = 4) {
  if (!scopeStr) return '';
  const items = scopeStr.split('|').flatMap(p =>
    p.split(',').map(s => s.trim()).filter(Boolean)
  );
  if (items.length === 0) return '';
  if (items.length <= maxItems) return items.join(', ');
  return `${items.slice(0, maxItems).join(', ')} …等 ${items.length} 項`;
}

function calculateBattlePoint(correct, total, timeMs, scopeStr) {
  if (!total || total <= 0 || correct < 0) return 0;
  const baseScore       = correct * 100;
  const accuracy        = correct / total;
  const numCourses      = parseScopeCount(scopeStr);
  const scopeMultiplier = 1 + (numCourses - 1) * 0.15;
  const avgTimePerQMs   = timeMs / total;
  const speedMultiplier = avgTimePerQMs <= 0
    ? 1.5
    : Math.min(1.5, Math.max(1.0, BATTLE_STD_TIME_PER_Q_MS / avgTimePerQMs));
  return Math.round(baseScore * accuracy * scopeMultiplier * speedMultiplier);
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* 🆕 精簡版 safeDateStr：Date 構造與 regex 不會丟例外，無需 try/catch */
function safeDateStr(raw) {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (!s) return "";

  // 直接解析（ISO 8601 / RFC 2822 等標準格式）
  let d = new Date(s);
  if (!isNaN(d.getTime())) return getHKDateString(d);

  // YYYY/MM/DD 或 YYYY-MM-DD（斜線/連字符分隔，Google Sheet 常見輸出）
  const m1 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m1) {
    d = new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
    if (!isNaN(d.getTime())) return getHKDateString(d);
  }

  // DD/MM/YYYY 格式（香港日期慣用格式）
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m2) {
    d = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
    if (!isNaN(d.getTime())) return getHKDateString(d);
  }
  return "";
}

/* 🆕 共用 helper：解析一筆紀錄的 score/total 並做範圍驗證 */
function parseScoreTotal(r) {
  const score = parseFloat(String(r[2] || '0').replace(/[^\d.]/g, '').trim()) || 0;
  const total = parseFloat(String(r[3] || '0').replace(/[^\d.]/g, '').trim()) || 0;
  if (total <= 0 || score < 0 || score > total) return null;
  return { score, total };
}

/* 🆕 共用 helper：從記錄物件解析出 HK 日期字串（優先 DateStr，其次 Timestamp）*/
function extractRecordDateStr(r) {
  const rawDate = String(r[7] || '').trim();
  if (rawDate) {
    const ds = safeDateStr(rawDate);
    if (ds) return ds;
  }
  if (r[0]) {
    const parsed = new Date(r[0]);
    if (!isNaN(parsed.getTime())) return getHKDateString(parsed);
  }
  return '';
}

function getLevelInfo(totalQuestions) {
  const { baseXp, increment, maxLevel } = CONFIG.LEVEL;
  let level = 1;
  let currentBoundary = 0;
  let nextBoundary = baseXp;

  while (totalQuestions >= nextBoundary && level < maxLevel) {
    level++;
    currentBoundary = nextBoundary;
    nextBoundary += baseXp + (level - 1) * increment;
  }

  const currentExp = totalQuestions - currentBoundary;
  const expNeeded = nextBoundary - currentBoundary;
  const progressPercent = level >= maxLevel ? 100 : Math.round((currentExp / expNeeded) * 100);
  const questionsToNextLevel = nextBoundary - totalQuestions;

  const tier = LEVEL_TITLES.find(t => level >= t.min);
  const titleName = tier ? tier.name : '生物新手';

  return {
    level,
    title: `Lv.${level} ${titleName}`,
    currentExp,
    expNeeded,
    progressPercent,
    questionsToNextLevel
  };
}

function parseUserData(userArr) {
  if (!userArr) return null;
  const base = {
    name: userArr[0],
    totalQuestions: parseInt(userArr[1]) || 0,
    lastLogin: userArr[2],
    storedStreak: parseInt(userArr[3]) || 0,
    coins: parseInt(userArr[4]) || 0,
  };
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const item = SHOP_ITEMS[i];
    base[item.userField] = parseInt(userArr[item.col]) || 0;
  }
  return base;
}

function findUser(leaderboardData, userName) {
  if (!leaderboardData || !leaderboardData.users || !userName) return null;
  const shortTarget = shortenName(userName);
  const u = leaderboardData.users.find(row => shortenName(String(row[0] || '').trim()) === shortTarget);
  return parseUserData(u);
}

function calculateActiveStreak(user, todayStr, yesterdayStr) {
  if (!user) return 0;
  const lastStr = safeDateStr(user.lastLogin);
  if (!lastStr) return 0;

  if (lastStr === todayStr || lastStr === yesterdayStr) return user.storedStreak;

  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [ly, lm, ld] = lastStr.split("-").map(Number);
  if (!ly) return 0;
  const dToday = new Date(ty, tm - 1, td);
  const dLast  = new Date(ly, lm - 1, ld);
  const diffDays = Math.round(Math.abs(dToday - dLast) / (1000 * 3600 * 24));
  if (diffDays > 1 && user.shields >= (diffDays - 1)) return user.storedStreak;
  return 0;
}

function filterTodayMCQRecords(records, todayStr) {
  if (!records) return [];
  const out = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const name = String(r[1] || "").trim();
    if (!name || name === "訪客 (未登入)" || name === "Guest") continue;
    const mode = String(r[6] || "").toLowerCase();
    if (!mode.includes('mc')) continue;

    // 優先使用 DateStr 欄位；缺失時再用 Timestamp
    const rowDateStr = String(r[7] || "").trim() === todayStr
      ? todayStr
      : extractRecordDateStr(r);
    if (rowDateStr !== todayStr) continue;

    const acc   = Number(r[5]);
    const time  = Number(r[4]);
    const total = Number(r[3]) || CONFIG.QUESTIONS_PER_SESSION;
    const score = Number(r[2]) || Math.round(acc / 100 * total);
    const scope = String(r[8] || '');
    const battlePoint = calculateBattlePoint(score, total, time, scope);
    out.push({ name, acc, time, score, total, scope, battlePoint });
  }
  return out;
}

function computeRankings(leaderboardData, currentUserName, currentRunRecord, currentRunSubmittedAt) {
  const records = (leaderboardData && leaderboardData.records) || [];
  const users   = (leaderboardData && leaderboardData.users)   || [];
  const todayStr  = getHKDateString();
  const weekStart = getWeekStartHK();

  const userTotalMap = new Map();
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    if (u[0]) userTotalMap.set(u[0], parseInt(u[1]) || 0);
  }

  // 🆕 [H2 修復] 檢查 currentRunRecord 是否已存在於 records（避免重複計入）
  //     伺服器回傳 records 後，我們剛上傳的成績會出現在裡面；
  //     若仍把 currentRunRecord 加進去，週榜分數會被算兩次。
  let currentRunAlreadyInRecords = false;
  if (currentRunRecord && currentRunSubmittedAt) {
    const targetName  = currentRunRecord.name;
    const targetScore = currentRunRecord.score;
    const targetTotal = currentRunRecord.total;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const rName = String(r[1] || '').trim();
      if (rName !== targetName) continue;

      // 比對 timestamp（容忍 ±90 秒誤差，避免時鐘漂移或 Sheet 寫入延遲）
      const rTs = r[0] ? new Date(r[0]).getTime() : 0;
      if (!rTs || Math.abs(rTs - currentRunSubmittedAt) > 90000) continue;

      const st = parseScoreTotal(r);
      if (!st) continue;

      // 同名 + 時間相近 + 分數/題數相同 → 視為同一局
      if (st.score === targetScore && st.total === targetTotal) {
        currentRunAlreadyInRecords = true;
        break;
      }
    }
  }

  const candidates = filterTodayMCQRecords(records, todayStr);
  // 🆕 [H2 修復] 只在 records 尚未包含本局時才補上
  if (currentRunRecord && !currentRunAlreadyInRecords) candidates.push(currentRunRecord);

  const dailyMap = new Map();
  for (let i = 0; i < candidates.length; i++) {
    const rec = candidates[i];
    const old = dailyMap.get(rec.name);
    if (!old || rec.battlePoint > old.battlePoint) dailyMap.set(rec.name, rec);
  }

  const daily = Array.from(dailyMap.values())
    .map(r => ({ ...r, totalQuestions: userTotalMap.get(r.name) || 0 }))
    .sort((a, b) => b.battlePoint - a.battlePoint)
    .slice(0, 20);

  const weeklyMap = new Map();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const name = String(r[1] || "").trim();
    if (!name || name === "訪客 (未登入)" || name === "Guest") continue;
    const mode = String(r[6] || "").toLowerCase();
    if (!mode.includes('mc')) continue;

    const rowDateStr = extractRecordDateStr(r);
    if (!rowDateStr || rowDateStr < weekStart) continue;

    const score = Number(r[2]) || 0;
    weeklyMap.set(name, (weeklyMap.get(name) || 0) + score);
  }

  // 🆕 [H2 修復] 同樣加上去重判斷
  if (currentRunRecord && !currentRunAlreadyInRecords &&
      currentRunRecord.name !== "訪客 (未登入)" && currentRunRecord.name !== "Guest") {
    weeklyMap.set(
      currentRunRecord.name,
      (weeklyMap.get(currentRunRecord.name) || 0) + (currentRunRecord.score || 0)
    );
  }

  const weeklyRank = Array.from(weeklyMap.entries())
    .map(([name, correctCount]) => ({
      name,
      correctCount,
      totalQuestions: userTotalMap.get(name) || 0
    }))
    .sort((a, b) => b.correctCount - a.correctCount || b.totalQuestions - a.totalQuestions)
    .slice(0, 20);

  return { daily, weeklyRank, todayStr, weekStart, currentRunAlreadyInRecords };
}

function getStudentRecords(records, userName) {
  if (!records || !userName) return [];
  const targetRaw   = String(userName).trim();
  const targetShort = shortenName(targetRaw);
  const targetRawLC   = targetRaw.toLowerCase();
  const targetShortLC = targetShort.toLowerCase();

  const out = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const rawName = String(r[1] || '').trim();
    const shortName = shortenName(rawName);
    const sameUser =
      rawName === targetRaw ||
      shortName === targetShort ||
      rawName.toLowerCase() === targetRawLC ||
      shortName.toLowerCase() === targetShortLC;
    if (!sameUser) continue;
    const mode = String(r[6] || '').toLowerCase();
    if (!mode.includes('mc')) continue;
    out.push(r);
  }
  return out;
}

function computeChapterStats(records, wrongBook) {
  if (!records || records.length === 0) return [];
  const stats = {};
  // 🆕 正規化章節名：把「Ch.2 生命的基本單位」等變體統一成「Ch.2」
  // 同時保留選修章節如 E1, E2, E4 不受影響
  function normalizeChapterKey(ch) {
    if (!ch) return ch;
    const m = ch.match(/^(Ch\.\d+)/i);
    if (m) return m[1]; // 只保留 Ch.數字 部分
    return ch.trim();
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const st = parseScoreTotal(r);
    if (!st) continue;
    const { score, total } = st;

    const scope = String(r[8] || '');
    const chapters = parseScopeChapters(scope);
    if (chapters.length === 0) continue;

    const perCorrect = score / chapters.length;
    const perTotal   = total / chapters.length;
    const confidenceWeight = 1 / chapters.length;

    for (let j = 0; j < chapters.length; j++) {
      const ch = normalizeChapterKey(chapters[j]); // 🆕 正規化
      let s = stats[ch];
      if (!s) {
        s = stats[ch] = { correct: 0, total: 0, sessions: 0, confidence: 0 };
      }
      s.correct    += perCorrect;
      s.total      += perTotal;
      s.sessions   += 1;
      s.confidence += confidenceWeight;
}
  }

// 🆕 從錯題本補充章節正確率與信度
  // 每道錯題有明確章節歸屬（無稀釋問題），是高精準度的單章數據源
  // 每道錯題貢獻：wrongCount 次答錯 + correctStreak 次答對
  // 若該章節練習記錄中從未出現，也允許從錯題本新建（只要有答錯記錄）
  if (wrongBook && typeof wrongBook === 'object' && !Array.isArray(wrongBook)) {
    const entries = Object.values(wrongBook);
    for (let k = 0; k < entries.length; k++) {
      const item = entries[k];
      const rawCh = (item.question && (item.question.category || item.question.chapter)) || '';
      const ch = normalizeChapterKey(rawCh);
      if (!ch) continue;

      const wrongCount   = item.wrongCount   || 1;   // 至少有1次答錯才進錯題本
      const streak       = item.correctStreak || 0;  // 近期複習連續答對次數

      // 錯題本每道題貢獻：streak 次答對 + wrongCount 次答錯（共 streak+wrongCount 題）
      // 權重設為 1.5（比一般大範圍練習高，因章節歸屬精確）
      const wbWeight = 1.5;
      const wbCorrect = streak * wbWeight;
      const wbTotal   = (streak + wrongCount) * wbWeight;
      const wbConfidence = wbWeight; // 每道錯題貢獻固定信度 1.5

      if (stats[ch]) {
        stats[ch].correct    += wbCorrect;
        stats[ch].total      += wbTotal;
        stats[ch].confidence += wbConfidence;
      } else {
        // 從未練習過該章節，但錯題本有記錄 → 允許新建
        stats[ch] = {
          correct:    wbCorrect,
          total:      wbTotal,
          sessions:   0,
          confidence: wbConfidence
        };
      }
    }
  }

  /* 🆕 預計算章節數字，避免在排序比較器中重複執行 regex */
  const result = Object.entries(stats).map(([chapter, s]) => {
    let accuracy = 0;
    if (s.total > 0) {
      accuracy = Math.max(0, Math.min(100, Math.round((s.correct / s.total) * 100)));
    }
    let reliability = 'low';
    if (s.confidence >= 3)      reliability = 'high';
    else if (s.confidence >= 1) reliability = 'medium';

    const m = chapter.match(/Ch\.(\d+)/);
    const chapterNum = m ? parseInt(m[1]) : null;

    return {
      chapter,
      chapterNum,
      accuracy,
      total: Math.round(s.total),
      attempts: s.sessions,
      reliability,
      confidenceScore: Math.round(s.confidence * 10) / 10
    };
  });

  result.sort((a, b) => {
    if (a.chapterNum !== null && b.chapterNum !== null) return a.chapterNum - b.chapterNum;
    if (a.chapterNum !== null) return -1;
    if (b.chapterNum !== null) return 1;
    return a.chapter.localeCompare(b.chapter);
  });

  return result;
}

/* 🆕 computeDailyBestBattle：每日取最高戰況分數（battlePoint）的一次練習來繪線圖 */
function computeDailyBestBattle(records, days) {
  const map = new Map();
  const now = new Date();

  for (let i = 0; i < (records || []).length; i++) {
    const r = records[i];
    const dateStr = extractRecordDateStr(r);
    if (!dateStr) continue;

    const st = parseScoreTotal(r);
    if (!st) continue;

    const timeMs  = Number(r[4]) || 0;
    const scope   = String(r[8] || '');
    const bp      = calculateBattlePoint(st.score, st.total, timeMs, scope);
    const accuracy = st.total > 0
      ? Math.max(0, Math.min(100, Math.round((st.score / st.total) * 100)))
      : 0;

    let s = map.get(dateStr);
    if (!s) {
      s = { battlePoint: -1, accuracy: 0, correct: 0, total: 0, attempts: 0 };
      map.set(dateStr, s);
    }
    s.attempts += 1;
    if (bp > s.battlePoint) {
      s.battlePoint = bp;
      s.accuracy    = accuracy;
      s.correct     = st.score;
      s.total       = st.total;
    }
  }

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = getHKDateString(d);
    const s = map.get(dStr);

    result.push({
      date:        dStr,
      label:       `${d.getMonth() + 1}/${d.getDate()}`,
      battlePoint: (s && s.battlePoint >= 0) ? s.battlePoint : null,
      accuracy:    (s && s.battlePoint >= 0) ? s.accuracy    : null,
      attempts:    s ? s.attempts : 0,
      correct:     s ? s.correct  : 0,
      total:       s ? s.total    : 0
    });
  }
  return result;
}

function collectImageUrls(question) {
  if (!question || typeof question !== 'object') return [];
  const urls = [];
  const keys = Object.keys(question);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = question[key];
    if (typeof key === 'string' && key.endsWith('_img') && typeof val === 'string' && val.trim()) {
      urls.push(val);
    }
  }
  return urls;
}

/* 🆕 真正的 LRU 圖片快取：存取時會重新插入，真正淘汰最久未用 */
const imageCache = new Map();
function preloadImage(url) {
  if (!url) return;
  if (imageCache.has(url)) {
    const existing = imageCache.get(url);
    imageCache.delete(url);
    imageCache.set(url, existing);
    return;
  }
  if (imageCache.size >= CONFIG.PRELOAD_CACHE_LIMIT) {
    imageCache.delete(imageCache.keys().next().value);
  }
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
}
function evictImageCache(url) {
  imageCache.delete(url);
}
