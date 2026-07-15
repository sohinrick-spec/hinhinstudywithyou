/* ============================================================================
 * 【區塊 6】共用小組件 + 統計圖表元件
 * ============================================================================ */

const LoadingImage = memo(function LoadingImage({
  src,
  alt = '',
  className = '',
  onClick,
  placeholderClassName = '',
  minHeight = 'min-h-[80px]',
  refreshKey = 0
}) {
  const MAX_RETRIES = Infinity;
  const [renderKey, setRenderKey] = useState(0);
  const [status, setStatus] = useState('loading');
  const retryCountRef = useRef(0);
  const prevSignalRef = useRef(null);
  const prevSrcRef    = useRef(src);

  useEffect(() => {
    const signal = `${src}::${refreshKey}`;
    if (signal === prevSignalRef.current) return;
    prevSignalRef.current = signal;

    if (!src) { setStatus('error'); return; }

    const srcChanged = src !== prevSrcRef.current;
    prevSrcRef.current = src;

    retryCountRef.current = srcChanged ? 0 : Math.min(retryCountRef.current + 1, MAX_RETRIES);

    setStatus('loading');
    setRenderKey(k => k + 1);
  }, [src, refreshKey]);

  if (!src) return null;

  const bust = retryCountRef.current > 0
    ? `${src.includes('?') ? '&' : '?'}_retry=${retryCountRef.current}`
    : '';
  const actualSrc = `${src}${bust}`;

  const handleRetry = (e) => {
    e.stopPropagation();
    if (retryCountRef.current >= MAX_RETRIES) return;
    retryCountRef.current += 1;
    setStatus('loading');
    setRenderKey(k => k + 1);
  };

  const retriesLeft = MAX_RETRIES - retryCountRef.current;

  return (
    <div className={`relative inline-flex items-center justify-center ${placeholderClassName}`}>
      {status === 'loading' && (
        <div className={`flex flex-col items-center justify-center ${minHeight} min-w-[120px] px-4 py-3 bg-gray-100 dark:bg-gray-700/60 rounded border border-dashed border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-400 skeleton-pulse`}>
          <i className="fas fa-image text-2xl mb-1 opacity-30"></i>
          <span className="text-xs">圖片加載中...</span>
        </div>
      )}
      {status === 'error' && (
        <div className={`flex flex-col items-center justify-center ${minHeight} min-w-[140px] px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded border border-dashed border-red-200 dark:border-red-800 text-red-500 dark:text-red-300`}>
          <i className="fas fa-image text-lg mb-1"></i>
          <span className="text-xs mb-2">圖片無法載入</span>
          {retriesLeft > 0 ? (
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1 border border-red-200 dark:border-red-700"
              title="重新加載此圖片">
              <i className="fas fa-rotate-right"></i>
              重新加載（剩 {retriesLeft} 次）
            </button>
          ) : (
            <span className="text-[10px] text-red-400 dark:text-red-500">已達重試上限</span>
          )}
        </div>
      )}
      <img
        key={renderKey}
        src={actualSrc}
        alt={alt}
        className={className}
        onClick={onClick}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{ display: status === 'loaded' ? '' : 'none' }}
      />
    </div>
  );
});

const GameTimer = memo(function GameTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return (
    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
      <i className="fas fa-clock text-indigo-500 dark:text-indigo-400"></i>
      <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{formatTime(elapsed)}</span>
    </div>
  );
});

function ImageLightbox({ src, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
        >
          <motion.div
            initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
            className="relative max-w-full max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <LoadingImage
              src={src}
              className="max-w-[95vw] max-h-[85vh] rounded-lg shadow-2xl object-contain bg-white p-2"
              alt="Enlarged"
              minHeight="min-h-[200px]"
            />
            <button className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl w-10 h-10 flex items-center justify-center bg-black/50 rounded-full" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
            <p className="text-gray-300 mt-4 text-sm"><i className="fas fa-search-plus mr-1"></i> 點擊背景、按 ESC 或右上角關閉</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const NetworkStatusToast = memo(function NetworkStatusToast({ isOnline, justReconnected }) {
  const show = !isOnline || justReconnected;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={isOnline ? 'online' : 'offline'}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[1100] w-[90%] max-w-md">
          {!isOnline ? (
            <div className="flex items-center gap-3 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg border border-red-600">
              <i className="fas fa-wifi-slash text-lg animate-pulse"></i>
              <div className="flex-1">
                <div className="font-bold text-sm">目前離線中</div>
                <div className="text-xs opacity-90">資料將暫存，網路恢復後自動上傳</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg border border-green-600">
              <i className="fas fa-wifi text-lg"></i>
              <div className="flex-1">
                <div className="font-bold text-sm">網路已恢復</div>
                <div className="text-xs opacity-90">現在可以繼續順暢使用囉！</div>
              </div>
              <i className="fas fa-check-circle text-lg"></i>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const QuestionProgressBar = memo(function QuestionProgressBar({ current, total, results = [] }) {
  const answered = results.length;
  const correctCount = results.filter(r => r.isCorrect).length;
  const wrongCount = answered - correctCount;
  return (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">
        <span><i className="fas fa-flag-checkered mr-1"></i>進度 {current}/{total}</span>
        <span className="font-mono flex items-center gap-2">
          <span className="text-green-600 dark:text-green-400">✓{correctCount}</span>
          <span className="text-red-500 dark:text-red-400">✕{wrongCount}</span>
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => {
          let cls;
          if (i < answered) {
            cls = results[i].isCorrect
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-red-400 dark:bg-red-500';
          } else if (i === current - 1) {
            cls = 'bg-indigo-500 dark:bg-indigo-400 animate-pulse';
          } else {
            cls = 'bg-gray-200 dark:bg-gray-700';
          }
          return (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${cls}`}
            />
          );
        })}
      </div>
    </div>
  );
});

const LeaderboardTable = memo(function LeaderboardTable({ rows, type, currentUserName, emptyMsg }) {
  if (rows.length === 0) {
    return <p className="text-gray-400 dark:text-gray-500 text-center py-4">{emptyMsg}</p>;
  }
  const myShort = shortenName(currentUserName);
  return (
    <table className="w-full text-sm text-gray-800 dark:text-gray-200">
      <tbody>
        {rows.map((rank, idx) => {
          const displayName = shortenName(rank.name);
          const isMe = displayName === myShort;
          const levelInfo = getLevelInfo(rank.totalQuestions || 0);
          return (
            <tr key={idx} className={`border-b last:border-0 border-gray-100 dark:border-gray-700 ${isMe ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}`}>
              <td className="py-2 px-2 font-bold w-8 text-center">
                {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
              </td>
              <td className="py-2 px-2 font-medium max-w-[140px]">
                <div className="flex flex-col leading-tight">
                  <span className="truncate">
                    {displayName}
                    {isMe && <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400">(你)</span>}
                  </span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-0.5">
                    <i className="fas fa-medal mr-0.5"></i>Lv.{levelInfo.level}
                  </span>
                </div>
              </td>
              <td className="py-2 px-2 text-right">
                {type === 'daily' ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono flex flex-col items-end">
                    <span className="font-bold text-purple-600 dark:text-purple-400">⚔️ {rank.battlePoint}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-[10px]">
                      {parseFloat(rank.acc).toFixed(0)}% · {formatTime(rank.time)}
                    </span>
                  </span>
                ) : type === 'weekly' ? (
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">
                    {rank.correctCount} 題
                  </span>
                ) : (
                  <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded text-xs font-bold">
                    {rank.streak} 天
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});

const UserProfileCard = memo(function UserProfileCard({ user, userName, currentStreak, levelInfo, onLogout, onShowShop, isLoading}) {
  const teacher = isTeacher(userName);
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-800 rounded-xl p-4 shadow-sm transition-all relative overflow-hidden mb-2">
      <button onClick={onShowShop}
        className="absolute top-3 right-3 p-2 rounded-full shadow-sm transition transform z-20 bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-700 dark:text-yellow-400 hover:scale-110"
        title="進入商店">
        <i className="fas fa-shopping-cart"></i>
      </button>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full opacity-50"></div>

      <div className="flex justify-between items-start mb-3 relative z-10 pr-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className="fas fa-user-circle text-4xl text-indigo-500 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-full"></i>
            {!isLoading && currentStreak > 0 && (
              <span className="absolute -top-1 -right-2 text-[10px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full px-1.5 py-0.5 border border-white dark:border-gray-800 font-bold shadow-sm z-20">
                🔥{currentStreak}
              </span>
            )}
          </div>
          <div>
            <div className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight flex items-center gap-2">
              {shortenName(userName)}
              {teacher && (
                <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                  👨‍🏫 老師
                </span>
              )}
              {!isLoading && user && user.shields > 0 && (
                <span className="text-sm text-blue-600 dark:text-blue-400" title="防斷火盾牌">🛡️ {user.shields}</span>
              )}
            </div>

            {isLoading ? (
              <div className="mt-1 flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                <i className="fas fa-spinner fa-spin"></i>
                <span>角色加載中...</span>
              </div>
            ) : (
              <div className="text-xs text-indigo-600 dark:text-indigo-300 font-bold mt-0.5 flex items-center bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full inline-block">
                <i className="fas fa-medal mr-1"></i>{levelInfo.title}
              </div>
            )}
          </div>
        </div>
        <button onClick={onLogout}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex flex-col items-center bg-white dark:bg-transparent p-1 rounded z-20 relative">
          <i className="fas fa-sign-out-alt mb-1"></i>登出
        </button>
      </div>

      {isLoading ? (
        <div className="relative z-10 mb-2 flex items-center gap-2 text-sm font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 inline-block px-2 py-1 rounded-md skeleton-pulse">
          <i className="fas fa-coins"></i>
          <span>金幣載入中…</span>
        </div>
      ) : user ? (
        <div className="relative z-10 mb-2 flex items-center gap-1 text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 inline-block px-2 py-1 rounded-md">
          <i className="fas fa-coins"></i> 金幣: {user.coins}
        </div>
      ) : null}

      <div className="mt-2 relative z-10">
        {isLoading ? (
          <>
            <div className="flex justify-between text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">
              <span className="skeleton-pulse">本級進度載入中…</span>
              <span className="skeleton-pulse">距離下級 -- 題</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 border border-gray-200 dark:border-gray-600 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 h-full rounded-full skeleton-pulse" style={{ width: `40%` }}></div>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              <span>本級進度 <span className="font-bold text-gray-700 dark:text-gray-200">{levelInfo.currentExp}</span> / {levelInfo.expNeeded} 題</span>
              <span>距離 <span className="font-bold text-indigo-600 dark:text-indigo-400">Lv.{levelInfo.level + 1}</span> 差 <span className="text-indigo-600 dark:text-indigo-400 font-bold">{levelInfo.questionsToNextLevel}</span> 題</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 border border-gray-200 dark:border-gray-600 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                   style={{ width: `${levelInfo.progressPercent}%` }}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-white opacity-20 rounded-t-full"></div>
              </div>
            </div>
          </>
        )}
      </div>

      
    </div>
  );
});

/* ────────────────────────────────────────────────────────────
 * 統計圖表元件（純 SVG，無額外依賴）
 * ──────────────────────────────────────────────────────────── */

const KPICard = memo(function KPICard({ icon, label, value, sub, color = 'indigo' }) {
  const gradient = KPI_COLOR_MAP[color] || KPI_COLOR_MAP.indigo;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center relative overflow-hidden">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent break-all`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
});

const DonutChart = memo(function DonutChart({ correct, total, size = 160 }) {
  if (total === 0) return <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">暫無數據</div>;
  const pct = correct / total;
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="14"
                className="stroke-red-100 dark:stroke-red-900/40" />
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${pct * C} ${C}`}
                className={pct >= 0.8 ? "stroke-green-500" : pct >= 0.6 ? "stroke-yellow-500" : "stroke-red-500"} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{Math.round(pct * 100)}%</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{correct}/{total}</div>
      </div>
    </div>
  );
});

const RadarChart = memo(function RadarChart({ data, size = 320 }) {
  if (!data || data.length < 3) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
      需要至少 3 個章節的練習紀錄才能繪製雷達圖
    </div>;
  }
  const maxPoints = 10;
  const points = data.slice(0, maxPoints);
  const n = points.length;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 48;
  const rings = [20, 40, 60, 80, 100];

  const getPoint = (i, pct) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + R * (pct / 100) * Math.cos(angle),
      y: cy + R * (pct / 100) * Math.sin(angle)
    };
  };

  const dataPoints = points.map((p, i) => getPoint(i, p.accuracy));
  const polygonPath = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-full">
      {rings.map(r => (
        <polygon key={r}
          points={points.map((_, i) => {
            const pt = getPoint(i, r);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          }).join(' ')}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="1" />
      ))}
      {points.map((_, i) => {
        const pt = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y}
                     className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />;
      })}
      <polygon points={polygonPath} fill="rgba(99, 102, 241, 0.25)"
               className="stroke-indigo-500" strokeWidth="2" strokeLinejoin="round" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4"
                className="fill-indigo-600 stroke-white dark:stroke-gray-800" strokeWidth="2" />
      ))}
      {points.map((p, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const labelR = R + 22;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        return (
          <g key={i}>
            <text x={lx} y={ly - 4} textAnchor="middle" dominantBaseline="middle"
                  className="fill-gray-700 dark:fill-gray-300" fontSize="11" fontWeight="600">
              {p.chapter}
            </text>
            <text x={lx} y={ly + 8} textAnchor="middle" dominantBaseline="middle"
                  className="fill-indigo-500 dark:fill-indigo-400" fontSize="10" fontWeight="700">
              {p.accuracy}%
            </text>
          </g>
        );
      })}
    </svg>
  );
});

const LineChart = memo(function LineChart({ data, height = 240 }) {
  const isDark = useDarkModeClass();

  const C = isDark
    ? { grid: '#374151', text: '#9ca3af', line: '#818cf8',
        area: 'rgba(129,140,248,0.18)', dot: '#818cf8',
        dotStroke: '#1f2937', empty: '#4b5563',
        label: '#a5b4fc', muted: '#6b7280' }
    : { grid: '#e5e7eb', text: '#6b7280', line: '#6366f1',
        area: 'rgba(99,102,241,0.15)', dot: '#6366f1',
        dotStroke: '#ffffff', empty: '#d1d5db',
        label: '#4338ca', muted: '#9ca3af' };

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
        暫無數據
      </div>
    );
  }

  /* 動態 Y 軸上限：取最高 battlePoint，向上取整到美觀刻度 */
  let maxBP = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i].battlePoint;
    if (v != null && v > maxBP) maxBP = v;
  }
  const rawMax = maxBP <= 0 ? 200 : maxBP;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const yMax = Math.ceil(rawMax / magnitude) * magnitude;
  const gridValues = [0, 0.25, 0.5, 0.75, 1.0].map(f => Math.round(f * yMax));

  const width  = Math.max(500, data.length * 44);
  const padding = { top: 32, right: 24, bottom: 40, left: 52 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const multi = data.length > 1;
  const xStep = multi ? innerW / (data.length - 1) : 0;
  const getX  = (i) => multi ? padding.left + i * xStep : padding.left + innerW / 2;
  const getY  = (val) => padding.top + innerH * (1 - val / yMax);

  const indexed = data.map((d, i) => ({ ...d, __i: i }));
  const valid = [];
  for (let i = 0; i < indexed.length; i++) {
    const d = indexed[i];
    if (typeof d.battlePoint === 'number' && d.battlePoint !== null && isFinite(d.battlePoint)) {
      valid.push(d);
    }
  }

  const pathD = valid.length > 0
    ? valid.map((d, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${getX(d.__i).toFixed(2)} ${getY(d.battlePoint).toFixed(2)}`
      ).join(' ')
    : '';

  const areaD = valid.length >= 2
    ? `${pathD} L ${getX(valid[valid.length - 1].__i).toFixed(2)} ${getY(0).toFixed(2)} L ${getX(valid[0].__i).toFixed(2)} ${getY(0).toFixed(2)} Z`
    : '';

  const labelStep = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', minWidth: '100%' }}
      >
        {gridValues.map(v => (
          <g key={`grid-${v}`}>
            <line
              x1={padding.left} y1={getY(v)}
              x2={width - padding.right} y2={getY(v)}
              stroke={C.grid} strokeWidth="1" strokeDasharray="2,3"
            />
            <text
              x={padding.left - 6} y={getY(v)}
              textAnchor="end" dominantBaseline="middle"
              fill={C.text} fontSize="10"
            >
              {v}
            </text>
          </g>
        ))}

        {data.map((d, i) => (i % labelStep === 0) && (
          <text
            key={`lbl-${i}`}
            x={getX(i)} y={height - padding.bottom + 18}
            textAnchor="middle"
            fill={C.text} fontSize="10"
          >
            {d.label}
          </text>
        ))}

        {indexed
          .filter(d => d.battlePoint === null || d.battlePoint === undefined)
          .map(d => (
            <circle
              key={`empty-${d.__i}`}
              cx={getX(d.__i)} cy={getY(0)} r="2.5"
              fill={C.empty} opacity="0.7"
            >
              <title>{d.date}：未練習</title>
            </circle>
          ))
        }

        {areaD && <path d={areaD} fill={C.area} stroke="none" />}

        {valid.length >= 2 && (
          <path
            d={pathD} fill="none"
            stroke={C.line} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {valid.map(d => {
          const x = getX(d.__i);
          const y = getY(d.battlePoint);
          const labelY = y - 14 < padding.top ? y + 18 : y - 14;
          return (
            <g key={`pt-${d.__i}`}>
              <circle
                cx={x} cy={y} r="5"
                fill={C.dot} stroke={C.dotStroke} strokeWidth="2"
              >
                <title>
                  {d.date}：戰況最高分 {d.battlePoint}（正確率 {d.accuracy}%，{d.attempts} 次練習，{Math.round(d.correct)}/{Math.round(d.total)} 題）
                </title>
              </circle>
              <text
                x={x} y={labelY} textAnchor="middle"
                fill={C.label} fontSize="11" fontWeight="700"
              >
                {d.battlePoint}
              </text>
            </g>
          );
        })}

        {valid.length === 0 && (
          <g>
            <text
              x={width / 2} y={height / 2 - 8}
              textAnchor="middle" dominantBaseline="middle"
              fill={C.muted} fontSize="14" fontWeight="600"
            >
              📭 所選時間範圍內沒有練習紀錄
            </text>
            <text
              x={width / 2} y={height / 2 + 14}
              textAnchor="middle" dominantBaseline="middle"
              fill={C.empty} fontSize="11"
            >
              完成一局練習後，這裡就會出現你的曲線！
            </text>
          </g>
        )}
      </svg>
    </div>
  );
});

const ChapterMasteryGrid = memo(function ChapterMasteryGrid({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">暫無數據</div>;
  }

  const getCellClass = (d) => {
    if (d.reliability === 'low') {
      return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
    }
    if (d.reliability === 'medium') {
      if (d.accuracy >= 80) return 'bg-green-200 text-green-900 border-green-300 dark:bg-green-900/50 dark:text-green-100 dark:border-green-700';
      if (d.accuracy >= 60) return 'bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-700';
      return 'bg-red-200 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700';
    }
    if (d.accuracy >= 80) return 'bg-green-500 text-white border-green-600 dark:bg-green-600 dark:border-green-500 shadow-sm';
    if (d.accuracy >= 60) return 'bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600 dark:border-yellow-500 shadow-sm';
    return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-500 shadow-sm';
  };

  const relLabel = (r) => r === 'high' ? '高' : r === 'medium' ? '中' : '低';

  return (
    <div>
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-1.5">
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.chapter}\n正確率：${d.accuracy}%\n≈${d.total} 題 / ${d.attempts} 次練習\n可信度：${relLabel(d.reliability)}（${d.confidenceScore}）`}
            className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-transform hover:scale-110 hover:z-10 cursor-help relative ${getCellClass(d)}`}
          >
            <div className="text-[9px] font-semibold leading-none opacity-75 mb-0.5 truncate max-w-full px-0.5">
              {d.chapter.replace(/^Ch\./, '')}
            </div>
            <div className="text-sm md:text-base font-bold leading-none">
              {d.accuracy}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="font-semibold">顏色：</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"></span>低可信度
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 dark:bg-green-900/50 border border-green-300"></span>中可信度
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-500 border border-green-600"></span>高可信度
        </span>
        <span className="ml-2 font-semibold">正確率：</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-500"></span>≥80%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-yellow-500"></span>60-80%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-500"></span>&lt;60%
        </span>
      </div>
    </div>
  );
});

const BarChart = memo(function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">暫無數據</div>;
  }
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-300 w-20 shrink-0 text-right font-medium">{d.label}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden relative">
            <div className={`h-full rounded-full transition-all duration-500 ${d.color || 'bg-indigo-500'}`}
                 style={{ width: `${Math.max(2, d.value)}%` }}></div>
            <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-gray-700 dark:text-gray-200">
              {d.valueLabel || `${d.value}%`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

const MasteryMatrix = memo(function MasteryMatrix({
  students,
  chapters,
  selectedStudent,
  setSelectedStudent
}) {
  if (students.length === 0 || chapters.length === 0) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">暫無數據</div>;
  }
  const getCellClass = (acc) => {
    if (acc === undefined || acc === null) return 'bg-gray-200 dark:bg-gray-600 text-gray-400';
    if (acc >= 80) return 'bg-green-500 text-white';
    if (acc >= 60) return 'bg-yellow-400 text-white';
    return 'bg-red-400 text-white';
  };
  return (
    <div className="overflow-x-auto custom-scrollbar">
      {selectedStudent && (
        <button
          onClick={() => setSelectedStudent('')}
          className="text-xs px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700"
        >
          ← 返回我的統計
        </button>
      )}
      <table className="min-w-full text-xs border-separate" style={{borderSpacing: '2px'}}>
        <thead>
          <tr>
            <th className="sticky left-0 bg-white dark:bg-gray-800 py-2 px-2 text-left text-gray-500 dark:text-gray-400 font-semibold z-10 whitespace-nowrap">
              學生
            </th>
            {chapters.map(ch => (
              <th key={ch} className="py-2 px-1 text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                {ch}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const chMap = {};
            const cs = s.chapterStats || [];
            for (let k = 0; k < cs.length; k++) chMap[cs[k].chapter] = cs[k].accuracy;
            return (
              <tr key={i}>
                <td className="sticky left-0 bg-white dark:bg-gray-800 py-1 px-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap z-10 border-r border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span>{s.name}</span>
                    <button
                      onClick={() => setSelectedStudent(s.rawName || s.name)}
                      className="text-[10px] px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
                    >
                      查看
                    </button>
                  </div>
                </td>
                {chapters.map(ch => {
                  const acc = chMap[ch];
                  return (
                    <td key={ch} className="p-0">
                      <div className={`w-10 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getCellClass(acc)}`}
                           title={`${s.name} - ${ch}: ${acc !== undefined ? acc + '%' : '無數據'}`}>
                        {acc !== undefined ? acc : '–'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

/* ────────────────────────────────────────────────────────────
 * 🆕 可摺疊區塊容器（教師儀表板專用）
 * ──────────────────────────────────────────────────────────── */
const CollapsibleSection = memo(function CollapsibleSection({
  title, icon, iconColor = 'text-indigo-500', defaultOpen = true,
  badge, badgeColor = 'indigo', children, headerExtra, hint
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const badgeColorMap = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    red:    'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
    green:  'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    blue:   'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    orange: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
  };
  const badgeCls = badgeColorMap[badgeColor] || badgeColorMap.indigo;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <i className={`fas ${icon} ${iconColor}`}></i>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          {badge != null && (
            <span className={`text-xs ${badgeCls} px-2 py-0.5 rounded-full font-bold`}>{badge}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerExtra}
          <i className={`fas fa-chevron-down text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
              {hint && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 mt-2 leading-relaxed">
                  <i className="fas fa-lightbulb text-yellow-500 mr-1"></i>{hint}
                </p>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/* 🆕 計算過去 N 天的每日活躍趨勢（學生數、答題數、平均正確率） */
function computeDailyTrend(records, days) {
  const map = new Map();
  for (let i = 0; i < (records || []).length; i++) {
    const r = records[i];
    const name = String(r[1] || '').trim();
    if (!name || name === '訪客 (未登入)' || name === 'Guest') continue;
    if (isTeacher(name)) continue;
    const mode = String(r[6] || '').toLowerCase();
    if (!mode.includes('mc')) continue;
    const dateStr = extractRecordDateStr(r);
    if (!dateStr) continue;
    const st = parseScoreTotal(r);
    if (!st) continue;

    let s = map.get(dateStr);
    if (!s) {
      s = { students: new Set(), questions: 0, correct: 0, attempts: 0 };
      map.set(dateStr, s);
    }
    s.students.add(shortenName(name).toLowerCase());
    s.questions += st.total;
    s.correct   += st.score;
    s.attempts  += 1;
  }

  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dStr = getHKDateString(d);
    const s = map.get(dStr);
    result.push({
      date: dStr,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      activeStudents: s ? s.students.size : 0,
      totalQuestions: s ? s.questions : 0,
      attempts: s ? s.attempts : 0,
      accuracy: s && s.questions > 0 ? Math.round(s.correct / s.questions * 100) : 0
    });
  }
  return result;
}

/* 🆕 雙軸折線圖：左軸=活躍學生數，右軸=總答題數 */
const DailyTrendChart = memo(function DailyTrendChart({ data, height = 220 }) {
  const isDark = useDarkModeClass();
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">暫無數據</div>;
  }
  const C = isDark
    ? { grid: '#374151', text: '#9ca3af', students: '#34d399', questions: '#60a5fa', dotStroke: '#1f2937' }
    : { grid: '#e5e7eb', text: '#6b7280', students: '#10b981', questions: '#3b82f6', dotStroke: '#ffffff' };

  let maxS = 0, maxQ = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].activeStudents > maxS) maxS = data[i].activeStudents;
    if (data[i].totalQuestions > maxQ) maxQ = data[i].totalQuestions;
  }
  maxS = Math.max(5, Math.ceil(maxS / 5) * 5);
  maxQ = Math.max(20, Math.ceil(maxQ / 20) * 20);

  const width = Math.max(520, data.length * 52);
  const pad = { top: 24, right: 56, bottom: 36, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const getX  = (i) => data.length > 1 ? pad.left + i * xStep : pad.left + innerW / 2;
  const getY1 = (v) => pad.top + innerH * (1 - v / maxS);
  const getY2 = (v) => pad.top + innerH * (1 - v / maxQ);

  const sPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY1(d.activeStudents).toFixed(1)}`).join(' ');
  const qPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY2(d.totalQuestions).toFixed(1)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-4 text-xs mb-2 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: C.students }}></span>
          <span className="text-gray-600 dark:text-gray-300">活躍學生數（左軸）</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: C.questions }}></span>
          <span className="text-gray-600 dark:text-gray-300">總答題數（右軸）</span>
        </span>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: '100%', display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={pad.left} y1={pad.top + innerH * f} x2={width - pad.right} y2={pad.top + innerH * f}
                  stroke={C.grid} strokeWidth="1" strokeDasharray="2,3" />
            <text x={pad.left - 6} y={pad.top + innerH * f} textAnchor="end" dominantBaseline="middle"
                  fill={C.students} fontSize="10" fontWeight="700">{Math.round(maxS * (1 - f))}</text>
            <text x={width - pad.right + 6} y={pad.top + innerH * f} textAnchor="start" dominantBaseline="middle"
                  fill={C.questions} fontSize="10" fontWeight="700">{Math.round(maxQ * (1 - f))}</text>
          </g>
        ))}
        {data.map((d, i) => (i % labelStep === 0) && (
          <text key={`x-${i}`} x={getX(i)} y={height - pad.bottom + 16} textAnchor="middle" fill={C.text} fontSize="10">
            {d.label}
          </text>
        ))}
        <path d={qPath} fill="none" stroke={C.questions} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <path d={sPath} fill="none" stroke={C.students} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={`pt-${i}`}>
            <circle cx={getX(i)} cy={getY2(d.totalQuestions)} r="3" fill={C.questions}>
              <title>{d.date}：總答題 {d.totalQuestions}（{d.attempts} 局，平均 {d.accuracy}%）</title>
            </circle>
            <circle cx={getX(i)} cy={getY1(d.activeStudents)} r="4.5" fill={C.students} stroke={C.dotStroke} strokeWidth="1.5">
              <title>{d.date}：活躍 {d.activeStudents} 人</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
});
