/* ============================================================================
 * 【每日任務面板組件】
 * ============================================================================ */
function DailyQuestPanel({ stats, onClaim, userName, isGuest }) {
  const today = getHKDateString();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!stats || stats.date !== today) return null;
  const completedCount = CONFIG.DAILY_QUESTS.filter(q => q.check(stats)).length;
  const doneCount = CONFIG.DAILY_QUESTS.filter(q => q.check(stats) && !(stats.claimed && stats.claimed[q.id])).length;
  return (
    <div className="mb-3" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800/40 transition-all text-sm font-semibold text-yellow-800 dark:text-yellow-300 shadow-sm"
      >
        <span>🗓️</span>
        <span>每日任務</span>
        {doneCount > 0 ? (
          <span className="ml-1 bg-yellow-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{doneCount}</span>
        ) : completedCount > 0 ? (
          <span className="ml-1 bg-green-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">✓</span>
        ) : null}
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-xs ml-1 opacity-60 transition-transform duration-300`}></i>
      </button>
      <div style={{ maxHeight: open ? '400px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
        <div className="mt-2 glass-panel rounded-xl shadow-lg p-3 border border-yellow-200 dark:border-yellow-700">
          <div className="space-y-2">
            {CONFIG.DAILY_QUESTS.map(q => {
              const done = q.check(stats);
              const claimed = stats.claimed && stats.claimed[q.id];
              return (
                <div key={q.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${done ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{q.icon}</span>
                    <div>
                      <div className={`text-sm font-medium ${claimed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{q.label}</div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">🪙 +{q.reward} 金幣　✨ +100 經驗值</div>
                    </div>
                  </div>
                  {claimed ? (
                    <span className="text-xs text-green-500 font-bold">✅ 已領取</span>
                  ) : done ? (
                    <button onClick={() => onClaim(q)} className="text-xs bg-yellow-400 hover:bg-yellow-500 text-white font-bold px-3 py-1 rounded-lg transition bubble-pop">
                      領取！
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">未完成</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ============================================================================
 * 【區塊 8】MAIN APP
 * ============================================================================ */
