/* ============================================================================
 * 【區塊 1】CONFIG
 * ============================================================================ */

const CONFIG = {
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxaXRcXlawwwkYMT2mMlk-B3iZAG2mUqb3DP7F8jFrw2iNKdbDnmD4FGmBn6AqT0lWm/exec",
  QUESTION_API_URL: "https://script.google.com/macros/s/AKfycbykunoXUXnsCsjqzvHHsOGs4sG-B74Ia5Qz4eip-cNkfkilxZago15Vpe7u_LODtfqBEg/exec",
  GOOGLE_CLIENT_ID: "1009693128680-5g65g888ss72cqr8dkdl84ci77rc7qv1.apps.googleusercontent.com",
  ALLOWED_EMAIL_DOMAIN: "@tcss.edu.hk",
  QUESTIONS_PER_SESSION: 20,
  CHAPTER_RANGE: { start: 2, end: 30 },
  ELECTIVES: ['E1', 'E2', 'E4'],
  GAME_MODE: '20mc',
  TEACHER_NAMES: ['Chi Hin So'],
  ANTI_CHEAT: {
  minTimeMs: 30000,
  minAccuracy: 0.30,       
  minTimePerQuestionMs: 800,
  maxTooFastQuestions: 5,
  maxTabSwitches: 3,
  warnOnTabSwitch: true
},
  LEVEL: { baseXp: 40, increment: 20, maxLevel: 100 },
  MAX_SHIELDS: 3,
  PRELOAD_AHEAD: 3,
  PRELOAD_CACHE_LIMIT: 200,
  GOOGLE_SIGNIN_MAX_ATTEMPTS: 100,
  WRONG_BOOK_MASTERY_THRESHOLD: 3,
  STORAGE: {
    username: 'bio_revise_username',
    darkMode: 'bio_revise_dark_mode',
    wrongBookPrefix: 'bio_wrongbook_'
  },
  DAILY_QUESTS: [
    { id: 'quest_60q',    label: '今日完成 60 題',         icon: '📚', reward: 30,  check: (stats) => stats.todayTotal >= 60 },
    { id: 'quest_perfect', label: '任一測驗達到 100% 正確率', icon: '🎯', reward: 50,  check: (stats) => stats.hadPerfect },
    { id: 'quest_10wrong', label: '消滅 10 題錯題',          icon: '🗑️', reward: 40,  check: (stats) => stats.wrongRemoved >= 10 },
  ]
};

const LEVEL_TITLES = [
  { min: 99, name: '演化樹終點站' },
  { min: 98, name: '全球生態平衡' },
  { min: 97, name: '生物圈觀察者' },
  { min: 96, name: '物種多樣性指' },
  { min: 95, name: '系統發生標本' },
  { min: 94, name: '自然選擇適者' },
  { min: 93, name: '共同演化伴侶' },
  { min: 92, name: '適應性輻射區' },
  { min: 91, name: '分子演化鐘' },
  { min: 90, name: '基因頻率漂移' },

  { min: 89, name: '生殖隔離屏障' },
  { min: 88, name: '族群負載上限' },
  { min: 87, name: '生態棲位重疊' },
  { min: 86, name: '營養級能量流' },
  { min: 85, name: '孟德爾遺傳比' },
  { min: 84, name: '多基因表現型' },
  { min: 83, name: '性聯遺傳因子' },
  { min: 82, name: '染色體易位者' },
  { min: 81, name: '端粒長度恆定' },
  { min: 80, name: '表觀遺傳靜音' },

  { min: 79, name: '操縱組調節中' },
  { min: 78, name: '核型分析樣本' },
  { min: 77, name: '點突變修復隊' },
  { min: 76, name: '胚胎誘導大師' },
  { min: 75, name: '原腸胚凹陷區' },
  { min: 74, name: '囊胚腔擴張中' },
  { min: 73, name: '受精卵全能性' },
  { min: 72, name: '配子減數完成' },
  { min: 71, name: '同源染色對合' },
  { min: 70, name: '聯會交叉互換' },

  { min: 69, name: '免疫記憶效應' },
  { min: 68, name: 'B細胞克隆選' },
  { min: 67, name: '輔助 T 識別' },
  { min: 66, name: '抗體重鏈重組' },
  { min: 65, name: '巨噬趨性運動' },
  { min: 64, name: '補體系統激活' },
  { min: 63, name: '體內穩態常數' },
  { min: 62, name: '下視丘溫控位' },
  { min: 61, name: '負回饋調節環' },
  { min: 60, name: '胰島素受體鎖' },

  { min: 59, name: '腎元超濾作用' },
  { min: 58, name: '肺泡氣體交換' },
  { min: 57, name: '血紅素帶氧態' },
  { min: 56, name: '動作電位閾值' },
  { min: 55, name: '突觸小泡釋放' },
  { min: 54, name: '神經跳躍傳導' },
  { min: 53, name: '心肌間盤連線' },
  { min: 52, name: '韌皮部壓力流' },
  { min: 51, name: '木質部導管化' },
  { min: 50, name: '程序性胞凋亡' },

  { min: 49, name: '細胞週期停滯' },
  { min: 48, name: '紡錘絲動點位' },
  { min: 47, name: '著絲點分裂態' },
  { min: 46, name: '染色質濃縮中' },
  { min: 45, name: '中心體複製點' },
  { min: 44, name: '真核內共生態' },
  { min: 43, name: '阿米巴式偽足' },
  { min: 42, name: '眼蟲趨光導航' },
  { min: 41, name: '鞭毛旋轉馬達' },
  { min: 40, name: '肽聚醣厚壁菌' },

  { min: 39, name: '質體抗藥載體' },
  { min: 38, name: '噬菌體溶菌環' },
  { min: 37, name: '細胞骨架微管' },
  { min: 36, name: '葉綠體類囊體' },
  { min: 35, name: '粒線體嵴摺疊' },
  { min: 34, name: '溶體水解反應' },
  { min: 33, name: '高基氏體分選' },
  { min: 32, name: '內質網運輸網' },
  { min: 31, name: '核糖體大次單' },
  { min: 30, name: '磷脂雙層流體' },

  { min: 29, name: '選擇性通透膜' },
  { min: 28, name: '鈉鉀幫浦極化' },
  { min: 27, name: '外顯子拼接中' },
  { min: 26, name: '內含子切除位' },
  { min: 25, name: '反密碼子配對' },
  { min: 24, name: '轉運 RNA 載體' },
  { min: 23, name: '密碼子轉譯流' },
  { min: 22, name: 'RNA 聚合酶軌' },
  { min: 21, name: '引子結合序列' },
  { min: 20, name: 'DNA 雙螺旋鏈' },

  { min: 19, name: '鹼基對氫鍵結' },
  { min: 18, name: '脫氧核苷酸單' },
  { min: 17, name: '蛋白質四級構' },
  { min: 16, name: '胜肽鏈摺疊態' },
  { min: 15, name: '高能磷酸鍵結' },
  { min: 14, name: '兩性胺基酸離' },
  { min: 13, name: '親水性磷酸頭' },
  { min: 12, name: '疏水性脂類尾' },
  { min: 11, name: '五碳糖支架位' },
  { min: 10, name: '嘌呤嘧啶配對' },

  { min: 9, name: '單醣縮合產物' },
  { min: 8, name: '生化催化活化' },
  { min: 7, name: '有機小分子湯' },
  { min: 6, name: '生物單體雛形' },
  { min: 5, name: '大氣還原成分' },
  { min: 4, name: '碳骨架建構中' },
  { min: 3, name: '前生物化學態' },
  { min: 2, name: '米勒實驗產物' },
  { min: 1, name: '原始生命前緣' }
];

const SHOP_ITEMS = [
  {
    id: 'shield', userField: 'shields', col: 5, badgeLabel: '持有護盾', unit: '',
    icon: '🛡️', name: '防斷火盾牌', desc: '忘記登入也不怕！結算時若缺席，將自動扣除護盾抵銷缺席天數。',
    price: 500, color: 'blue', maxOwn: CONFIG.MAX_SHIELDS,
    maxOwnMsg: `⚠️ 護盾最多只能持有 ${CONFIG.MAX_SHIELDS} 個喔！`
  },
  {
    id: 'doubleXP', userField: 'doubleXP', col: 6, badgeLabel: '雙倍卡剩餘', unit: '題',
    icon: '✨', name: '雙倍經驗卡', desc: '接下來的 20 題，每題結算時可獲得 2 點 XP（加速升級用）。',
    price: 1000, color: 'purple'
  },
  {
    id: 'skip', userField: 'skipCards', col: 7, badgeLabel: '跳題卡', unit: '張',
    icon: '🃏', name: '跳題卡', desc: '遇到不會的題目？單次跳過！',
    price: 200, color: 'green'
  }
];

/* 預建所有可選章節清單，避免每次 render 重建 */
const ALL_CHAPTERS = (() => {
  const arr = [];
  for (let i = CONFIG.CHAPTER_RANGE.start; i <= CONFIG.CHAPTER_RANGE.end; i++) arr.push(i);
  return arr;
})();

/* 🆕 成就徽章資料提升至模組層級，避免每次 render 重建 */
const ACHIEVEMENT_TIERS = [
  { id: 'first_100',  label: '初心者',      desc: '累計完成 100 題',  target: 100,  icon: '🌱', color: 'green' },
  { id: 'first_500',  label: '勤奮學徒',    desc: '累計完成 500 題',  target: 500,  icon: '🌿', color: 'blue' },
  { id: 'first_1000', label: '熟練生物人',  desc: '累計完成 1000 題', target: 1000, icon: '🌳', color: 'purple' },
  { id: 'first_2000', label: '生物大師',    desc: '累計完成 2000 題', target: 2000, icon: '🏆', color: 'orange' }
];

/* 🆕 班級正確率分布區間提升至模組層級 */
const CLASS_DIST_BINS = [
  { label: '0-40%',   min: 0,  max: 40,      color: 'bg-red-500' },
  { label: '40-60%',  min: 40, max: 60,      color: 'bg-orange-400' },
  { label: '60-75%',  min: 60, max: 75,      color: 'bg-yellow-400' },
  { label: '75-90%',  min: 75, max: 90,      color: 'bg-green-400' },
  { label: '90-100%', min: 90, max: 100.01,  color: 'bg-emerald-500' }
];

/* 🆕 班級表單過濾選項 */
const FORM_TABS = [
  { id: 'All', label: '全校總覽' },
  { id: '4',   label: '中四 (F.4)' },
  { id: '5',   label: '中五 (F.5)' },
  { id: '6',   label: '中六 (F.6)' }
];

/* 🆕 Toast 樣式（提升至模組層級，避免在 Provider 內重建） */
const TOAST_TYPE_STYLE = {
  info:    { bg: 'bg-indigo-500', border: 'border-indigo-600', icon: 'fa-circle-info' },
  success: { bg: 'bg-green-500',  border: 'border-green-600',  icon: 'fa-circle-check' },
  warning: { bg: 'bg-yellow-500', border: 'border-yellow-600', icon: 'fa-triangle-exclamation' },
  error:   { bg: 'bg-red-500',    border: 'border-red-600',    icon: 'fa-circle-xmark' }
};

/* 🆕 KPI 卡片顏色對照（提升至模組層級） */
const KPI_COLOR_MAP = {
  blue:   'from-blue-500 to-cyan-500',
  green:  'from-green-500 to-emerald-500',
  purple: 'from-purple-500 to-pink-500',
  orange: 'from-orange-500 to-amber-500',
  indigo: 'from-indigo-500 to-purple-500',
  red:    'from-red-500 to-pink-500'
};
