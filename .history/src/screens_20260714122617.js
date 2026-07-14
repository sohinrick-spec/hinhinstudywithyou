/* ============================================================================
 * 【區塊 7】SCREEN COMPONENTS
 * ============================================================================ */

function StartScreen({
  onStart, leaderboardData, userName, setUserName,
  isGuest, setIsGuest, onShowShop, onShowLeaderboard,
  onShowStats, onShowTeacherStats,
  settings, setSettings, mcqCount, questionLoadError, onReloadQuestions,
  myAssignments, onStartAssignment, onShowAssignmentAdmin,
  cumulativeCorrect, onShowWrongBook, wrongBookCount,
  dailyQuestStats, onClaimQuest
}) {
  const user = useMemo(() => findUser(leaderboardData, userName), [leaderboardData, userName]);
  const levelInfo = getLevelInfo(user?.totalQuestions || 0);
  const isProfileLoading = !!userName && userName !== "訪客 (未登入)" && !leaderboardData;
  const isTeacherUser = isTeacher(userName);
  const canShowStats = userName && userName !== "訪客 (未登入)";

  const currentStreak = useMemo(() => {
    if (!user) return 0;
    const todayStr = getHKDateString();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    return calculateActiveStreak(user, todayStr, getHKDateString(yest));
  }, [user]);

  useGoogleSignIn(userName, setUserName);

  const toggleChapter = useCallback((num) => {
    setSettings(prev => ({
      ...prev,
      selectedChapters: prev.selectedChapters.includes(num)
        ? prev.selectedChapters.filter(c => c !== num)
        : [...prev.selectedChapters, num].sort((a, b) => a - b)
    }));
  }, [setSettings]);

  const toggleElective = useCallback((code) => {
    setSettings(prev => ({
      ...prev,
      selectedElectives: prev.selectedElectives.includes(code)
        ? prev.selectedElectives.filter(c => c !== code)
        : [...prev.selectedElectives, code].sort()
    }));
  }, [setSettings]);

  const isCoreValid     = !settings.enableCore     || settings.selectedChapters.length >= 1;
  const isElectiveValid = !settings.enableElective || (settings.selectedElectives && settings.selectedElectives.length >= 1);
  const isAnyMode       = settings.enableCore || settings.enableElective;
  const questionPoolReady = mcqCount > 0;
  const canStart        = userName && isAnyMode && isCoreValid && isElectiveValid && questionPoolReady;

  const startBtnText = !userName ? "請先驗證學生身分"
    : questionLoadError ? "題庫載入失敗，請重試"
    : !questionPoolReady ? "題庫載入中..."
    : !isAnyMode ? "請選擇至少一種模式"
    : !isCoreValid ? "核心課題需選至少1課"
    : !isElectiveValid ? "選修單元需選至少1個"
    : `開始練習 (${CONFIG.QUESTIONS_PER_SESSION}題)`;

  return (
    <div className="w-full max-w-lg landscape:max-w-4xl">
      <div className="glass-panel p-3 rounded-2xl shadow-xl max-h-[94vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 overflow-hidden shadow-md border-2 border-white dark:border-gray-800 w-10 h-10 flex-shrink-0">
            <LoadingImage
              src="https://i.imgur.com/wZLVI47.jpeg"
              alt="Logo"
              className="w-10 h-10 object-cover"
              minHeight="min-h-[40px]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">軒軒和你溫Bio</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs">加油努力俾心機</p>
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
            學生身分驗證 <span className="text-red-500">*</span>
          </label>

          {!userName ? (
            <div className="w-full">
              <div id="googleSignInDiv" className="w-full flex justify-center mt-1 min-h-[40px]"></div>
              <div className="flex items-center justify-center space-x-2 my-4">
                <div className="h-px bg-gray-300 dark:bg-slate-500 flex-1"></div>
                <span className="text-gray-400 dark:text-gray-500 text-sm">或</span>
                <div className="h-px bg-gray-300 dark:bg-slate-500 flex-1"></div>
              </div>
              <button onClick={() => { setIsGuest(true); setUserName("訪客 (未登入)"); }}
                className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 flex justify-center items-center gap-2">
                <i className="fa-solid fa-user-secret"></i>
                不登入，以訪客身分開始 (不記錄成績)
              </button>
            </div>
          ) : (
            <>
              <UserProfileCard
                user={user}
                userName={userName}
                currentStreak={currentStreak}
                levelInfo={levelInfo}
                isLoading={isProfileLoading}
                onLogout={() => setUserName("")}
                onShowShop={onShowShop}
              />
              {!isGuest && dailyQuestStats && (
                <DailyQuestPanel
                  stats={dailyQuestStats}
                  userName={userName}
                  isGuest={isGuest}
                  onClaim={onClaimQuest}
                />
              )}
            </>
          )}
        </div>

        {/* 🆕 待辦任務卡（學生端） */}
        {userName && userName !== "訪客 (未登入)" && !isTeacherUser &&
          myAssignments && myAssignments.pending.length > 0 && (
          <div className="mb-2 p-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-bullhorn text-amber-600 dark:text-amber-400"></i>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                當前任務
              </span>
              <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                {myAssignments.pending.length} 份待完成
              </span>
            </div>
            <div className="space-y-2">
              {myAssignments.pending.map(a => (
                <button key={a.id} onClick={() => onStartAssignment(a)}
                  className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all hover:scale-[1.01] flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 dark:text-gray-100 truncate">{a.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={a.scope}>
  <i className="fas fa-book mr-1"></i>範圍：{formatScopeShort(a.scope, 3)} · {a.questionCount} 題
                      {a.dueDate && (
                        <span className="ml-2 text-red-500 dark:text-red-400">
                          <i className="fas fa-clock mr-0.5"></i>截止 {String(a.dueDate).slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <i className="fas fa-arrow-right text-amber-500 ml-2"></i>
                </button>
              ))}
            </div>
            {myAssignments.submitted.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                <i className="fas fa-check-circle mr-1"></i>
                已完成 {myAssignments.submitted.length} 份任務
              </div>
            )}
          </div>
        )}

        <div className="landscape:grid landscape:grid-cols-2 landscape:gap-3">

          <div className={`mb-3 border rounded-xl p-3 transition-all ${settings.enableCore ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
            <label className="flex items-center justify-between cursor-pointer mb-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.enableCore}
                  onChange={(e) => setSettings({ ...settings, enableCore: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"/>
                <span className="font-bold text-gray-800 dark:text-gray-100">核心課題 (Core)</span>
              </div>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full">
                Ch.{CONFIG.CHAPTER_RANGE.start} - {CONFIG.CHAPTER_RANGE.end}
              </span>
            </label>

            <AnimatePresence>
              {settings.enableCore && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-xs ${settings.selectedChapters.length < 1 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                        已選: {settings.selectedChapters.length} 課 (最少1課)
                      </span>
                      <div className="space-x-2">
                        <button onClick={() => setSettings(p => ({...p, selectedChapters: [...ALL_CHAPTERS]}))} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">全選</button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button onClick={() => setSettings(p => ({...p, selectedChapters: []}))} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">清空</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {ALL_CHAPTERS.map(num => (
                        <button key={num} onClick={() => toggleChapter(num)}
                          className={`text-xs py-1.5 rounded-md transition-all ${
                            settings.selectedChapters.includes(num)
                              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md transform scale-105'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-500'
                          }`}>
                          Ch.{num}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`mb-3 border rounded-xl p-3 transition-all ${settings.enableElective ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-sm' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
            <label className="flex items-center justify-between cursor-pointer mb-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={settings.enableElective}
                  onChange={(e) => setSettings({ ...settings, enableElective: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"/>
                <span className="font-bold text-gray-800 dark:text-gray-100">選修單元 (Elective)</span>
              </div>
              <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                {CONFIG.ELECTIVES.join(', ')}
              </span>
            </label>

            <AnimatePresence>
              {settings.enableElective && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-3 pt-3 border-t border-green-200/50 dark:border-green-800/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-xs ${settings.selectedElectives.length < 1 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                        已選: {settings.selectedElectives.length} 個 (最少1個)
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {CONFIG.ELECTIVES.map(code => (
                        <button key={code} onClick={() => toggleElective(code)}
                          className={`text-sm py-2 px-4 rounded-md transition-all font-medium ${
                            settings.selectedElectives.includes(code)
                              ? 'bg-green-600 dark:bg-green-500 text-white shadow-md transform scale-105'
                              : 'bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-slate-600'
                          }`}>
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {questionLoadError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
            <span><i className="fas fa-exclamation-triangle mr-1"></i>題庫載入失敗：{questionLoadError}</span>
            <button onClick={onReloadQuestions}
              className="flex-shrink-0 px-3 py-1 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-full font-medium border border-red-300 dark:border-red-700">
              <i className="fas fa-rotate-right mr-1"></i>重試
            </button>
          </div>
        )}

        <div className="mb-3 text-right px-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {mcqCount === 0 && !questionLoadError
              ? <><i className="fas fa-spinner fa-spin mr-1"></i>雲端題庫載入中...</>
              : mcqCount === 0 && questionLoadError
                ? <span className="text-red-500">題庫載入失敗</span>
                : `總題庫: ${mcqCount} 題`}
          </span>
        </div>

        <div className="space-y-2">
          <button onClick={onStart} disabled={!canStart}
            className={`w-full font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all flex items-center justify-center gap-2 ${
              canStart
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }`}>
            <span>{startBtnText}</span>
            {canStart && <i className="fas fa-arrow-right"></i>}
            {!questionPoolReady && userName && !questionLoadError && <i className="fas fa-spinner fa-spin"></i>}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={onShowLeaderboard}
              className="font-bold py-2.5 px-1 rounded-xl border-2 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-1 text-sm">
              <i className="fas fa-trophy"></i>
              <span>排行榜</span>
            </button>
            {canShowStats ? (
              <button onClick={onShowStats}
                className="font-bold py-2.5 px-1 rounded-xl border-2 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all flex items-center justify-center gap-1 text-sm">
                <i className="fas fa-chart-line"></i>
                <span>統計</span>
              </button>
            ) : (
              <button disabled
                className="font-bold py-2.5 px-1 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50 text-sm flex items-center justify-center gap-1 cursor-not-allowed">
                <i className="fas fa-chart-line"></i>
                <span>統計</span>
              </button>
            )}
            {canShowStats && onShowWrongBook ? (
              <button onClick={onShowWrongBook}
                className="relative font-bold py-2.5 px-1 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-1 text-sm">
                <i className="fas fa-book-bookmark"></i>
                <span>錯題本</span>
                {wrongBookCount > 0 && (
                  <span className="bubble-pop absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-gray-800 shadow">
                    {wrongBookCount > 99 ? '99+' : wrongBookCount}
                  </span>
                )}
              </button>
            ) : (
              <button disabled
                className="font-bold py-2.5 px-1 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50 text-sm flex items-center justify-center gap-1 cursor-not-allowed">
                <i className="fas fa-book-bookmark"></i>
                <span>錯題本</span>
              </button>
            )}
          </div>

          {isTeacherUser && (
            <button onClick={onShowTeacherStats}
              className="w-full font-bold py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
              <i className="fas fa-chalkboard-teacher"></i>
              <span>教師儀表板（班級統計）</span>
              <i className="fas fa-user-tie"></i>
            </button>
          )}

          {/* 🆕 任務管理按鈕（老師專用） */}
          {isTeacherUser && (
            <button onClick={onShowAssignmentAdmin}
              className="w-full font-bold py-2.5 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
              <i className="fas fa-paper-plane"></i>
              <span>任務管理（建立任務 / 查看成績單）</span>
              <i className="fas fa-clipboard-list"></i>
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4 pb-2">
        ©  Hinhinstudywithyou. All Rights Reserved.
      </p>
    </div>
  );
}

function FlashCard({
  data, onSubmit, currentIndex, totalCount, startTime,
  mySkipCards = 0, onUseSkipCard,
  isWrongBookMode = false, wrongBookStreak = 0, onExitWrongBook,
  isSpeedrun = false, speedrunRemainingMs = 0,
  speedrunTargetCorrect = 0, speedrunCurrentCorrect = 0,
  activeAssignmentTitle = '',
  comboCount = 0, showComboEffect = null,
  results = []
}) {
  const toast = useToast();
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [imgRefreshKey, setImgRefreshKey] = useState(0);
  const [isRefreshSpinning, setIsRefreshSpinning] = useState(false);

  const shuffledData = useMemo(() => {
    if (!data) return [];
    const opts = resolveOptions(data);
    if (opts.length === 0) return [];
    return shuffleArray(opts.map((opt, i) => ({ text: opt, origIdx: i, img: data[`opt_${i}_img`] })));
  }, [data, currentIndex]);

  useEffect(() => {
    setShowAnswer(false);
    setSelectedIdx(null);
    setIsAnswerCorrect(null);
    setImgRefreshKey(0);
  }, [currentIndex, data]);

  const handleOptionClick = useCallback((idx, item) => {
    if (showAnswer) return;
    setSelectedIdx(idx);
    setShowAnswer(true);
    const isCorrect = item.origIdx === resolveCorrectIndex(data.correctIndex);
    setIsAnswerCorrect(isCorrect);
    onSubmit(isCorrect, item.text, item.origIdx);
  }, [showAnswer, data, onSubmit]);

  useEffect(() => {
    const onKey = (e) => {
      if (showAnswer || !shuffledData.length) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const letterIdx = ['a','b','c','d','e','f'].indexOf(e.key.toLowerCase());
      const numIdx = ['1','2','3','4','5','6'].indexOf(e.key);
      const idx = letterIdx >= 0 ? letterIdx : numIdx;
      if (idx >= 0 && idx < shuffledData.length) {
        e.preventDefault();
        handleOptionClick(idx, shuffledData[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAnswer, shuffledData, handleOptionClick]);

  const handleRefreshImages = useCallback(() => {
    const urls = collectImageUrls(data);
    if (urls.length === 0) {
      toast("本題沒有圖片可以刷新", "info", 2000);
      return;
    }
    for (let i = 0; i < urls.length; i++) evictImageCache(urls[i]);
    setImgRefreshKey(k => k + 1);
    setIsRefreshSpinning(true);
    setTimeout(() => setIsRefreshSpinning(false), 600);
    toast(`已重新載入 ${urls.length} 張圖片`, "success", 2000);
  }, [data, toast]);

  if (!data) return <div className="text-center p-10 text-gray-700 dark:text-gray-200">載入題目中...</div>;

    // 🆕 題目資料殘缺（缺 correctIndex 或選項太少）→ 顯示明確錯誤，並提示用戶
    const questionBroken = !isQuestionComplete(data);
    if (shuffledData.length === 0 || questionBroken) return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full text-center">
          <i className="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-3"></i>
          <p className="text-gray-700 dark:text-gray-200 font-bold">此題資料異常，無法載入</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-4">
            {questionBroken
              ? '題目缺少正確答案欄位（可能是雲端同步殘缺）。'
              : '無法解析選項。'}
            <br />
            建議從錯題簿中移除此題並重新練習收集。
          </p>
          <button
            onClick={() => onSubmit(false, '(題目資料異常，自動跳過)', null)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">
            <i className="fas fa-forward mr-1"></i>跳過此題
          </button>
        </div>
    );

              const hasOptionImages = shuffledData.some(item => item.img);
              const questionText    = data.title || data.question || "";
              const categoryText    = data.category || "生物練習";
              const hasAnyImage     = collectImageUrls(data).length > 0;

    return (
    <div className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl w-full relative overflow-hidden transition-colors border-2 ${
      comboCount >= 5
        ? 'combo-border-rainbow'
        : comboCount >= 3 && showComboEffect
          ? 'combo-border-correct'
          : 'border-transparent'
    }`}>
      
      <QuestionProgressBar current={currentIndex + 1} total={totalCount} results={results} />

      {isWrongBookMode && (
        <div className="mb-3 p-2 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between text-xs">
          <span className="text-red-700 dark:text-red-300 font-bold flex items-center gap-1">
            <i className="fas fa-book-bookmark"></i> 錯題簿複習模式
          </span>
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400">
              本題進度: {wrongBookStreak}/{CONFIG.WRONG_BOOK_MASTERY_THRESHOLD}
              <span className="ml-1">{'⭐'.repeat(wrongBookStreak)}{'☆'.repeat(Math.max(0, CONFIG.WRONG_BOOK_MASTERY_THRESHOLD - wrongBookStreak))}</span>
            </span>
            <button
              onClick={onExitWrongBook}
              className="flex items-center gap-1 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700 px-2 py-1 rounded-lg transition-colors font-bold">
              <i className="fas fa-door-open text-[10px]"></i>
              <span>退出</span>
            </button>
          </div>
        </div>
      )}

      {/* 🆕 限時任務橫幅（倒數計時 + 目標進度） */}
      {isSpeedrun && (() => {
        const totalSec = Math.ceil(speedrunRemainingMs / 1000);
        const mm = Math.floor(totalSec / 60);
        const ss = totalSec % 60;
        const isUrgent = totalSec <= 30;
        const progress = speedrunTargetCorrect > 0
          ? Math.min(100, Math.round(speedrunCurrentCorrect / speedrunTargetCorrect * 100))
          : 0;
        const reached = speedrunCurrentCorrect >= speedrunTargetCorrect;

        return (
          <div className={`mb-3 p-3 rounded-xl border-2 ${
            reached
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700'
              : isUrgent
                ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-300 dark:border-red-700 animate-pulse'
                : 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-300 dark:border-rose-700'
          }`}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-sm">
                <i className="fas fa-stopwatch"></i>
                限時任務
                {activeAssignmentTitle && (
                  <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                    · {activeAssignmentTitle}
                  </span>
                )}
              </span>
              <div className={`font-mono font-bold text-2xl ${
                isUrgent ? 'text-red-600 dark:text-red-400' : 'text-rose-700 dark:text-rose-300'
              }`}>
                <i className="fas fa-clock mr-1 text-base"></i>
                {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-gray-700 dark:text-gray-200">
                <i className="fas fa-bullseye mr-1 text-rose-500"></i>
                答對進度：
                <span className={`ml-1 font-mono ${reached ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {speedrunCurrentCorrect} / {speedrunTargetCorrect}
                </span>
                {reached && <span className="ml-2 text-green-600 dark:text-green-400">✅ 已達標！</span>}
              </span>
              <span className="text-gray-500 dark:text-gray-400 font-mono">{progress}%</span>
            </div>

            <div className="w-full bg-white dark:bg-gray-800 rounded-full h-2 overflow-hidden border border-rose-200 dark:border-rose-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  reached
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-rose-400 to-pink-500'
                }`}
                style={{ width: `${progress}%` }}>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3 gap-2">
        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
          {categoryText}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAnyImage && (
            <button
              onClick={handleRefreshImages}
              title="重新載入本題所有圖片"
              className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200 dark:border-indigo-700 transition-colors">
              <i className={`fas fa-sync-alt ${isRefreshSpinning ? 'spin-once' : ''}`}></i>
              <span className="hidden sm:inline">刷新圖片</span>
            </button>
          )}
          <GameTimer startTime={startTime} />
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-xs font-medium flex-shrink-0">{currentIndex + 1} / {totalCount}</span>
      </div>

      <div className="landscape:grid landscape:grid-cols-5 landscape:gap-5">
        <div className="landscape:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-snug mb-4 whitespace-pre-line break-words">
            {formatText(questionText)}
          </h3>
          {data.question_img && (
            <div className="mb-5 flex justify-center bg-gray-50 dark:bg-gray-700 rounded-xl p-2 border border-gray-100 dark:border-gray-600">
              <LoadingImage
                src={data.question_img}
                onClick={() => setIsLightboxOpen(true)}
                className={`w-auto rounded shadow-sm object-contain cursor-zoom-in hover:opacity-80 transition-opacity ${hasOptionImages ? 'max-h-40' : 'max-h-60'} landscape:max-h-48`}
                alt="Question"
                minHeight="min-h-[120px]"
                refreshKey={imgRefreshKey}
              />
            </div>
          )}
        </div>

        <div className="landscape:col-span-3">
          <div className={`grid gap-3 mb-4 ${hasOptionImages ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {shuffledData.map((item, idx) => {
              const isSelected = idx === selectedIdx;
              let cls = "border-gray-100 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30";
              if (showAnswer) {
                if (isSelected && isAnswerCorrect) {
                  cls = "border-green-500 bg-green-50 dark:bg-green-900/40 ring-2 ring-green-200 dark:ring-green-700";
                } else if (isSelected && !isAnswerCorrect) {
                  cls = "border-red-400 bg-red-50 dark:bg-red-900/40 ring-2 ring-red-200 dark:ring-red-700";
                } else {
                  cls = "border-gray-100 dark:border-gray-700 opacity-40";
                }
              }
              return (
                <button key={`${currentIndex}-${idx}`} disabled={showAnswer}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleOptionClick(idx, item);
                  }}
                  className={`text-left p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${cls}`}>
                  <div className="flex items-start w-full mb-1 text-left">
                    <span className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex items-center justify-center mr-2 mt-0.5 text-[10px] font-black shrink-0 dark:text-gray-200">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-200 break-words whitespace-pre-line">
                      {formatText(item.text)}
                    </span>
                  </div>
                  {item.img && (
                    <div className="mt-1 w-full flex justify-center bg-white dark:bg-gray-100 rounded p-1">
                      <LoadingImage
                        src={item.img}
                        className="max-h-24 md:max-h-32 object-contain"
                        alt="Option"
                        minHeight="min-h-[80px]"
                        refreshKey={imgRefreshKey}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block text-center text-xs text-gray-400 dark:text-gray-500 mb-2">
            💡 小提示：按 <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">A</kbd>/<kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">B</kbd>/<kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">C</kbd>/<kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">D</kbd> 或 <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">1-4</kbd> 可快速作答
          </div>
        </div>
      </div>

      {mySkipCards > 0 && !showAnswer && !isWrongBookMode && (
        <button onClick={onUseSkipCard} className="mt-4 w-full py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800">
          使用跳題卡 (剩餘 {mySkipCards})
        </button>
      )}

      <ImageLightbox src={data.question_img} isOpen={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} />
    </div>
  );
}

function LeaderboardScreen({ onBack, leaderboardData, userName, loadingRank }) {
  const [formFilter, setFormFilter] = useState('All');

  const { daily: dailyAll, weeklyRank: weeklyAll } = useMemo(
    () => computeRankings(leaderboardData, userName, null),
    [leaderboardData, userName]
  );

  // 🆕 每人「當前 form」對照表(以最新記錄為準)
  const formMap = useMemo(
    () => buildStudentFormMap(leaderboardData?.records),
    [leaderboardData]
  );

  const filterByForm = useCallback((rows) => {
    if (formFilter === 'All') return rows;
    return rows.filter(r => resolveStudentForm(r.name, formMap) === formFilter);
  }, [formFilter, formMap]);

  const daily = useMemo(() => filterByForm(dailyAll), [dailyAll, filterByForm]);
  const weeklyRank = useMemo(() => filterByForm(weeklyAll), [weeklyAll, filterByForm]);

  const lbFormTabs = [
    { id: 'All', label: '全校' },
    { id: '4',   label: 'F.4' },
    { id: '5',   label: 'F.5' },
    { id: '6',   label: 'F.6' },
  ];

  return (
    <div className="w-full max-w-4xl px-4 pb-10">
      <div className="glass-panel p-6 rounded-2xl shadow-xl text-center relative">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2 mb-4">
          <i className="fas fa-chart-line text-indigo-600 dark:text-indigo-400"></i> 排行榜 (Top 20)
        </h2>

        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {lbFormTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFormFilter(tab.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
                formFilter === tab.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                  : 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 text-white p-3 font-bold flex justify-between items-center">
              <span>📅 每日最強</span><span className="text-xs opacity-75">今日戰況</span>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loadingRank && !leaderboardData
                ? <div className="p-4 text-center text-gray-600 dark:text-gray-400"><i className="fas fa-spinner fa-spin mr-1"></i>排行榜載入中...</div>
                : <LeaderboardTable rows={daily} type="daily" currentUserName={userName} emptyMsg="今天還沒人挑戰！" />
              }
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 text-white p-3 font-bold flex justify-between items-center">
              <span>⚡ 本週最強</span><span className="text-xs opacity-75">本週累積答對</span>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loadingRank && !leaderboardData
                ? <div className="p-4 text-center text-gray-600 dark:text-gray-400"><i className="fas fa-spinner fa-spin mr-1"></i>連線中...</div>
                : <LeaderboardTable rows={weeklyRank} type="weekly" currentUserName={userName} emptyMsg="本週還沒有人答題！" />
              }
            </div>
          </div>
        </div>

        <button onClick={onBack} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 font-bold py-3 px-8 rounded-xl shadow transition-colors">
          <i className="fas fa-home mr-2"></i> 回到主頁
        </button>
      </div>
    </div>
  );
}

function StatsScreen({ onBack, userName, leaderboardData, wrongBookCount, wrongBook }) {
  const [timeRange, setTimeRange] = useState(7);
  const isTeacherUser = isTeacher(userName);
  const [selectedStudent, setSelectedStudent] = useState('');

  const allStudents = useMemo(() => {
    if (!isTeacherUser) return [];
    const users = leaderboardData?.users || [];
    return users
      .map(u => String(u[0] || '').trim())
      .filter(name => name && name !== '訪客 (未登入)' && !isTeacher(name))
      .sort((a, b) => (String(shortenName(a) || '')).localeCompare(String(shortenName(b) || '')));
  }, [leaderboardData, isTeacherUser]);

  const viewingUser = isTeacherUser && selectedStudent ? selectedStudent : userName;

  const records = useMemo(
    () => getStudentRecords(leaderboardData?.records, viewingUser),
    [leaderboardData, viewingUser]
  );
  const user = useMemo(() => findUser(leaderboardData, viewingUser), [leaderboardData, viewingUser]);

  const { totalAttempts, totalCorrect, totalQuestions, avgAccuracy } = useMemo(() => {
    let totalCorrect = 0, totalQuestions = 0;
    for (let i = 0; i < records.length; i++) {
      const st = parseScoreTotal(records[i]);
      if (!st) continue;
      totalCorrect += st.score;
      totalQuestions += st.total;
    }
    const avg = totalQuestions > 0
      ? Math.max(0, Math.min(100, (totalCorrect / totalQuestions * 100)))
      : 0;
    return {
      totalAttempts: records.length,
      totalCorrect,
      totalQuestions,
      avgAccuracy: avg
    };
  }, [records]);

const chapterStats = useMemo(() => computeChapterStats(records, wrongBook), [records, wrongBook]);
  const weakSpots = useMemo(
    () => chapterStats
      .filter(c => c.reliability !== 'low')
      .slice() // 避免修改原陣列
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3),
    [chapterStats]
  );
  const growthData = useMemo(() => computeDailyBestBattle(records, timeRange), [records, timeRange]);

  const levelInfo = getLevelInfo(user?.totalQuestions || 0);
  const totalQ = user?.totalQuestions || 0;

  return (
    <div className="w-full max-w-5xl px-4 pb-10">
      <div className="glass-panel p-4 md:p-6 rounded-2xl shadow-xl">
       <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors">
              <i className="fas fa-arrow-left"></i>
              <span className="hidden sm:inline">返回</span>
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <i className="fas fa-chart-line text-indigo-600 dark:text-indigo-400"></i>
              {selectedStudent ? `${shortenName(selectedStudent)} 的學習統計` : '我的學習統計'}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {shortenName(viewingUser)}
            </span>
            {isTeacherUser && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">查看學生：</span>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                >
                  <option value="">我自己的統計</option>
                  {allStudents.map((student, i) => (
                    <option key={i} value={student}>{shortenName(student)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {totalAttempts === 0 && (
          <div className="mb-6 p-6 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
            <i className="fas fa-rocket text-4xl text-indigo-400 dark:text-indigo-300 mb-3"></i>
            <p className="text-indigo-700 dark:text-indigo-300 font-bold">你還沒有練習記錄！</p>
            <p className="text-indigo-500 dark:text-indigo-400 text-sm mt-1">完成第一局練習後，這裡就會顯示詳細統計。</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPICard icon="✏️" label="總答題數" value={Math.round(totalQuestions)} color="blue" />
          <KPICard icon="🎯" label="平均正確率"
            value={totalQuestions > 0 ? `${avgAccuracy.toFixed(1)}%` : '—'}
            color={avgAccuracy >= 80 ? 'green' : avgAccuracy >= 60 ? 'orange' : 'red'} />
          <KPICard icon="📝" label="練習次數" value={totalAttempts} color="purple" />
          <KPICard icon="⭐" label="當前等級" value={`Lv.${levelInfo.level}`}
            sub={levelInfo.title.replace(/^Lv\.\d+\s*/, '')} color="orange" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <i className="fas fa-bullseye text-indigo-500"></i>總體答題概況
            </h3>
            <div className="flex items-center justify-around flex-wrap gap-4">
              <DonutChart correct={Math.round(totalCorrect)} total={Math.round(totalQuestions)} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-gray-700 dark:text-gray-200">答對 <b>{Math.round(totalCorrect)}</b> 題</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-300"></span>
                  <span className="text-gray-700 dark:text-gray-200">答錯 <b>{Math.round(totalQuestions - totalCorrect)}</b> 題</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <i className="fas fa-book-bookmark text-red-500"></i>
                  <span className="text-gray-600 dark:text-gray-300 text-xs">錯題簿：<b>{wrongBookCount}</b> 題待複習</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <i className="fas fa-gamepad text-purple-500"></i>遊戲化進度
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{levelInfo.title}</span>
                  <span className="text-gray-500 dark:text-gray-400">{levelInfo.currentExp}/{levelInfo.expNeeded} XP</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                       style={{ width: `${levelInfo.progressPercent}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-right">
                  距離 Lv.{levelInfo.level + 1} 還差 {levelInfo.questionsToNextLevel} 題
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-lg border border-yellow-100 dark:border-yellow-800">
                  <div className="text-xl">🪙</div>
                  <div className="text-yellow-700 dark:text-yellow-400 font-bold text-base">{user?.coins || 0}</div>
                  <div className="text-yellow-600 dark:text-yellow-300 text-[10px]">金幣</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                  <div className="text-xl">🛡️</div>
                  <div className="text-blue-700 dark:text-blue-400 font-bold text-base">{user?.shields || 0}</div>
                  <div className="text-blue-600 dark:text-blue-300 text-[10px]">護盾</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg border border-green-100 dark:border-green-800">
                  <div className="text-xl">🃏</div>
                  <div className="text-green-700 dark:text-green-400 font-bold text-base">{user?.skipCards || 0}</div>
                  <div className="text-green-600 dark:text-green-300 text-[10px]">跳題卡</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <i className="fas fa-award text-amber-500"></i>成就徽章
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACHIEVEMENT_TIERS.map(a => {
              const unlocked = totalQ >= a.target;
              const pct = Math.min(100, Math.round(totalQ / a.target * 100));
              return (
                <div key={a.id} className={`p-3 rounded-xl border text-center transition-all ${
                  unlocked
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 dark:border-amber-700 shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-70'
                }`}>
                  <div className={`text-3xl mb-1 ${unlocked ? '' : 'grayscale opacity-40'}`}>{a.icon}</div>
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-200">{a.label}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{a.desc}</div>
                  {unlocked ? (
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                      ✓ 已解鎖
                    </span>
                  ) : (
                    <div>
                      <div className="w-full bg-gray-200 dark:bg-slate-500 rounded-full h-1.5 mt-1">
                        <div className="bg-amber-400 h-1.5 rounded-full" style={{width: `${pct}%`}}></div>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{totalQ}/{a.target}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
            <i className="fas fa-compass text-green-500"></i>知識點掌握圖譜
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
            ※ 每格代表一個章節；<b>格內數字 = 正確率</b>，<b>顏色深淺 = 可信度</b>。範圍越窄的練習（如只選 Ch.5）提供越可靠的章節資訊（1.0 分）；一次選 10 章平均分則每章僅 0.1 分。
          </p>

          {chapterStats.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
              還沒有練習紀錄，快去答題累積資料！
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <ChapterMasteryGrid data={chapterStats} />
              </div>
              <div className="md:w-60 flex-shrink-0">
                <h4 className="font-bold text-sm text-red-600 dark:text-red-400 mb-2">
                  <i className="fas fa-exclamation-triangle mr-1"></i>需要加強的章節（Top 3）
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                  ※ 僅列出可信度「中」或「高」的章節，避免被低可信度資料誤導
                </p>
                {weakSpots.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                    <i className="fas fa-check-circle text-green-500 mr-1"></i>
                    目前尚未累積足夠可信的章節資料。請多做「單一章節」的專注練習！
                  </div>
                ) : (
                  <div className="space-y-2">
                    {weakSpots.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">{w.chapter}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            ≈{w.total} 題 · 可信度 {w.reliability === 'high' ? '高' : '中'}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 w-12 text-right">{w.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <i className="fas fa-chart-line text-indigo-500"></i>成長曲線
            </h3>
            <div className="flex gap-1">
              {[7, 30].map(d => (
                <button key={d} onClick={() => setTimeRange(d)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                    timeRange === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-500'
                  }`}>
                  過去 {d} 天
                </button>
              ))}
            </div>
          </div>
          <LineChart data={growthData} />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
            💡 每個資料點顯示當日所有練習中<b>最高戰況分數</b>，懸停可查看正確率與練習次數
          </p>
        </div>

        <button onClick={onBack} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>返回主頁
        </button>


      </div>
    </div>
  );
}

function TeacherStatsScreen({ onBack, leaderboardData, currentUserName }) {
  const [sortBy, setSortBy] = useState('todayQuestions');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedForm, setSelectedForm] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [trendDays, setTrendDays] = useState(14);

  const todayStr = useMemo(() => getHKDateString(), []);
  const weekStartStr = useMemo(() => getWeekStartHK(), []);

  const studentsData = useMemo(() => {
    const records = leaderboardData?.records || [];
    const users   = leaderboardData?.users   || [];
    // 🆕 每人「當前 form」(以最新一筆記錄為準)
    const formMap = buildStudentFormMap(records);
    const map = new Map();  // key = normalizeNameForMatch

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rawName = String(u[0] || '').trim();
      if (!rawName || isTeacher(rawName)) continue;
      const key = normalizeNameForMatch(rawName);
      if (!key) continue;

      // form 優先用最新記錄,退回 Users 表名字
      const form = resolveStudentForm(rawName, formMap) || getStudentForm(rawName);
      const totalQ = parseInt(u[1]) || 0;

      const existing = map.get(key);
      if (existing) {
        // Users 表若殘留新舊兩列 → 合併,保留較新資料
        existing.totalQuestions = Math.max(existing.totalQuestions, totalQ);
        if (form) existing.form = form;
        if (u[2] && (!existing.lastLogin || String(u[2]) > String(existing.lastLogin))) {
          existing.lastLogin = u[2];
        }
        continue;
      }

      map.set(key, {
        name: shortenName(rawName), rawName: rawName,
        form: form,
        totalQuestions: totalQ,
        lastLogin: u[2] || null,
        records: [],
        totalCorrect: 0, totalAttempted: 0, attempts: 0,
        todayQuestions: 0, todayCorrect: 0, todayAttempts: 0,
        weekQuestions: 0, weekCorrect: 0, weekAttempts: 0,
        lastPracticeDate: null,
        activeDaysSet: new Set()
      });
    }

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const rawName = String(r[1] || '').trim();
      if (!rawName || rawName === '訪客 (未登入)' || rawName === 'Guest') continue;
      if (isTeacher(rawName)) continue;
      const mode = String(r[6] || '').toLowerCase();
      if (!mode.includes('mc')) continue;

      const key = normalizeNameForMatch(rawName);
      if (!key) continue;
      let s = map.get(key);
      if (!s) {
        // 只在記錄中出現(未在 Users 表)→ 用最新記錄的 form 與顯示名
        const info = formMap.get(key);
        const displayRaw = (info && info.displayName) || rawName;
        s = {
          name: shortenName(displayRaw), rawName: displayRaw,
          form: (info && info.form) || getStudentForm(rawName),
          totalQuestions: 0, lastLogin: null, records: [],
          totalCorrect: 0, totalAttempted: 0, attempts: 0,
          todayQuestions: 0, todayCorrect: 0, todayAttempts: 0,
          weekQuestions: 0, weekCorrect: 0, weekAttempts: 0,
          lastPracticeDate: null, activeDaysSet: new Set()
        };
        map.set(key, s);
      }
      const st = parseScoreTotal(r);
      if (!st) continue;

      s.records.push(r);
      s.totalCorrect   += st.score;
      s.totalAttempted += st.total;
      s.attempts       += 1;

      const recDateStr = extractRecordDateStr(r);
      if (recDateStr) {
        if (!s.lastPracticeDate || recDateStr > s.lastPracticeDate) {
          s.lastPracticeDate = recDateStr;
        }
        s.activeDaysSet.add(recDateStr);

        if (recDateStr === todayStr) {
          s.todayQuestions += st.total;
          s.todayCorrect   += st.score;
          s.todayAttempts  += 1;
        }
        if (recDateStr >= weekStartStr) {
          s.weekQuestions += st.total;
          s.weekCorrect   += st.score;
          s.weekAttempts  += 1;
        }
      }
    }

    const out = [];
    map.forEach(s => {
      const acc = s.totalAttempted > 0
        ? Math.max(0, Math.min(100, (s.totalCorrect / s.totalAttempted * 100))) : 0;
      const todayAcc = s.todayQuestions > 0
        ? Math.round(s.todayCorrect / s.todayQuestions * 100) : 0;
      const weekAcc = s.weekQuestions > 0
        ? Math.round(s.weekCorrect / s.weekQuestions * 100) : 0;
      const wbAll = leaderboardData?.wrongBookAll || {};
      const studentWrongBook = wbAll[s.rawName] || {};
      out.push({
        ...s, accuracy: acc, todayAcc, weekAcc,
        activeDaysCount: s.activeDaysSet.size,
        chapterStats: computeChapterStats(s.records, studentWrongBook)
      });
    });
    return out;
  }, [leaderboardData, todayStr, weekStartStr]);

  const filteredStudentsData = useMemo(() => {
    if (selectedForm === 'All') return studentsData;
    return studentsData.filter(s => s.form === selectedForm);
  }, [studentsData, selectedForm]);

  const totalStudents = filteredStudentsData.length;
  const activeStudents = filteredStudentsData.filter(s => s.attempts > 0).length;
  const inactiveStudents = useMemo(
    () => filteredStudentsData.filter(s => s.attempts === 0), [filteredStudentsData]);

  /* 🆕 今日數據 */
  const todayActive = useMemo(
    () => filteredStudentsData.filter(s => s.todayAttempts > 0), [filteredStudentsData]);
  const todayNotPracticed = useMemo(
    () => filteredStudentsData.filter(s => s.todayAttempts === 0 && s.attempts > 0), [filteredStudentsData]);
  const todayTotalQuestions = todayActive.reduce((sum, s) => sum + s.todayQuestions, 0);
  const todayAvgAcc = todayActive.length > 0
    ? todayActive.reduce((sum, s) => sum + (s.todayQuestions > 0 ? s.todayCorrect / s.todayQuestions * 100 : 0), 0) / todayActive.length
    : 0;
  const todayTotalAttempts = todayActive.reduce((sum, s) => sum + s.todayAttempts, 0);

  const laggingStudents = useMemo(() => {
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayTime = new Date(ty, tm - 1, td).getTime();
    return filteredStudentsData.filter(s => {
      if (!s.lastPracticeDate || s.attempts === 0) return false;
      const [ly, lm, ld] = s.lastPracticeDate.split('-').map(Number);
      if (!ly) return false;
      const diff = Math.floor((todayTime - new Date(ly, lm - 1, ld).getTime()) / 86400000);
      return diff >= 3;
    });
  }, [filteredStudentsData, todayStr]);

  const activeStudentsWithData = useMemo(
    () => filteredStudentsData.filter(s => s.totalAttempted > 0), [filteredStudentsData]);
  const classAvgAcc = activeStudentsWithData.length > 0
    ? activeStudentsWithData.reduce((sum, s) => sum + s.accuracy, 0) / activeStudentsWithData.length : 0;
  const totalAttemptsClass = filteredStudentsData.reduce((sum, s) => sum + s.attempts, 0);

  /* 🆕 每日趨勢資料（依當前 form 篩選） */
  const dailyTrendData = useMemo(() => {
    const filteredKeys = new Set(filteredStudentsData.map(s => normalizeNameForMatch(s.rawName)));
    const records = (leaderboardData?.records || []).filter(r => {
      return filteredKeys.has(normalizeNameForMatch(String(r[1] || '')));
    });
    return computeDailyTrend(records, trendDays);
  }, [leaderboardData, filteredStudentsData, trendDays]);

  const distData = useMemo(() => {
    const bins = CLASS_DIST_BINS.map(b => ({ ...b, count: 0 }));
    for (let i = 0; i < activeStudentsWithData.length; i++) {
      const acc = activeStudentsWithData[i].accuracy;
      for (let j = 0; j < bins.length; j++) {
        const b = bins[j];
        if (acc >= b.min && acc < b.max) { b.count++; break; }
      }
    }
    let mx = 1;
    for (let i = 0; i < bins.length; i++) if (bins[i].count > mx) mx = bins[i].count;
    return bins.map(b => ({
      label: b.label, value: Math.round(b.count / mx * 100),
      valueLabel: `${b.count} 人`, color: b.color
    }));
  }, [activeStudentsWithData]);

  const classChapterStats = useMemo(() => {
    const allRecords = [];
    for (let i = 0; i < filteredStudentsData.length; i++) {
      const rs = filteredStudentsData[i].records;
      for (let j = 0; j < rs.length; j++) allRecords.push(rs[j]);
    }
    return computeChapterStats(allRecords);
  }, [filteredStudentsData]);

  const weakestChapters = useMemo(() =>
    classChapterStats.filter(c => c.reliability !== 'low').slice()
      .sort((a, b) => a.accuracy - b.accuracy).slice(0, 5), [classChapterStats]);

  const allChapters = useMemo(() => classChapterStats.map(c => c.chapter), [classChapterStats]);

  const sortedStudents = useMemo(() => {
    const arr = filteredStudentsData.slice();
    arr.sort((a, b) => {
      let av, bv;
      if (sortBy === 'name') { av = a.name; bv = b.name; }
      else if (sortBy === 'totalQ')         { av = a.totalQuestions;  bv = b.totalQuestions; }
      else if (sortBy === 'attempts')       { av = a.attempts;        bv = b.attempts; }
      else if (sortBy === 'todayQuestions') { av = a.todayQuestions;  bv = b.todayQuestions; }
      else if (sortBy === 'weekQuestions')  { av = a.weekQuestions;   bv = b.weekQuestions; }
      else                                   { av = a.accuracy;        bv = b.accuracy; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [filteredStudentsData, sortBy, sortDir]);

  const handleSort = useCallback((col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir(col === 'name' ? 'asc' : 'desc'); }
  }, [sortBy]);

  const SortIcon = ({ col }) => sortBy !== col
    ? <i className="fas fa-sort text-gray-300 dark:text-gray-600 ml-1"></i>
    : <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} text-indigo-500 ml-1`}></i>;

  if (selectedStudent) {
    return <StatsScreen onBack={() => setSelectedStudent(null)} userName={selectedStudent}
                        leaderboardData={leaderboardData} wrongBookCount={0} />;
  }

  const todayParticipationRate = totalStudents > 0
    ? Math.round(todayActive.length / totalStudents * 100) : 0;

  return (
    <div className="w-full max-w-6xl px-4 pb-10">
      <div className="glass-panel p-4 md:p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 flex-wrap gap-2">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-chalkboard-teacher text-amber-600 dark:text-amber-400"></i>
            教師儀表板
          </h2>
          <span className="text-xs md:text-sm bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full font-bold">
            <i className="fas fa-user-tie mr-1"></i>{shortenName(currentUserName)}
          </span>
        </div>

        {/* 班級篩選 */}
        <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
          {FORM_TABS.map(form => (
            <button key={form.id} onClick={() => setSelectedForm(form.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedForm === form.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-slate-600'
              }`}>
              {selectedForm === form.id && <i className="fas fa-check-circle"></i>}
              {form.label}
            </button>
          ))}
        </div>

        {/* 🆕 板塊 1：今日學習動態（最高優先級，預設展開） */}
        <CollapsibleSection
          title={`今日學習動態（${todayStr}）`}
          icon="fa-calendar-day" iconColor="text-amber-500"
          badge={`${todayActive.length}/${totalStudents} 人活躍`}
          badgeColor={todayParticipationRate >= 50 ? 'green' : todayParticipationRate >= 25 ? 'orange' : 'red'}
          defaultOpen={true}
          hint="今日的即時數據，幫助你追蹤每位學生今天的完成情況。建議每天課前/課後各看一次。">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPICard icon="🟢" label="今日活躍學生"
              value={`${todayActive.length}`}
              sub={`參與率 ${todayParticipationRate}%`}
              color={todayParticipationRate >= 50 ? 'green' : todayParticipationRate >= 25 ? 'orange' : 'red'} />
            <KPICard icon="📝" label="今日總答題數" value={todayTotalQuestions} color="blue" />
            <KPICard icon="🔁" label="今日總練習局數" value={todayTotalAttempts} color="purple" />
            <KPICard icon="🎯" label="今日平均正確率"
              value={todayActive.length > 0 ? `${todayAvgAcc.toFixed(1)}%` : '—'}
              color={todayAvgAcc >= 75 ? 'green' : todayAvgAcc >= 60 ? 'orange' : 'red'} />
          </div>

          {/* 今日已練習名單 */}
          {todayActive.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                <i className="fas fa-circle-check"></i>
                今日已練習（{todayActive.length} 人，按今日題數排序）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {todayActive.slice().sort((a, b) => b.todayQuestions - a.todayQuestions).map((s, i) => (
                  <button key={i} onClick={() => setSelectedStudent(s.rawName)}
                    title={`點擊查看 ${s.name} 的詳細統計`}
                    className="text-xs bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-md border border-green-200 dark:border-green-800 transition flex items-center gap-1.5">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-mono bg-white dark:bg-green-900/60 px-1.5 rounded text-[10px]">{s.todayQuestions}題</span>
                    <span className={`font-mono text-[10px] ${s.todayAcc >= 80 ? 'text-green-600' : s.todayAcc >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {s.todayAcc}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 今日尚未練習（曾經練習過但今天還沒做） */}
          {todayNotPracticed.length > 0 && (
            <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-1">
                <i className="fas fa-clock"></i>
                今日尚未練習（{todayNotPracticed.length} 人，建議提醒）
              </div>
              <div className="flex flex-wrap gap-1">
                {todayNotPracticed.slice(0, 30).map((s, i) => (
                  <span key={i} className="text-xs bg-white dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800">
                    {s.name}
                  </span>
                ))}
                {todayNotPracticed.length > 30 && (
                  <span className="text-xs text-orange-600 dark:text-orange-400">…等 {todayNotPracticed.length} 人</span>
                )}
              </div>
            </div>
          )}

          {todayActive.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
              <i className="fas fa-moon mr-1"></i>今天還沒有學生開始練習
            </div>
          )}
        </CollapsibleSection>

        {/* 🆕 板塊 2：每日活躍趨勢圖 */}
        <CollapsibleSection
          title="每日活躍趨勢"
          icon="fa-chart-line" iconColor="text-blue-500"
          defaultOpen={true}
          hint="每日活躍學生數與答題量的雙軸折線。線條若往下走 → 全班動力下降；只題數下降但人數穩定 → 部分學生在減少練習量。"
          headerExtra={
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {[7, 14, 30].map(d => (
                <button key={d} onClick={(e) => { e.stopPropagation(); setTrendDays(d); }}
                  className={`px-2 py-0.5 text-[11px] rounded font-medium transition ${
                    trendDays === d ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>{d}天</button>
              ))}
            </div>
          }>
          <DailyTrendChart data={dailyTrendData} />
        </CollapsibleSection>

        {/* 板塊 3：班級概覽 KPI */}
        <CollapsibleSection
          title="班級總覽"
          icon="fa-gauge-high" iconColor="text-indigo-500"
          defaultOpen={true}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard icon="👥" label="學生總數" value={totalStudents} color="blue" />
            <KPICard icon="✅" label="累計活躍學生"
              value={`${activeStudents}/${totalStudents}`} color="green"
              sub={`參與率 ${totalStudents > 0 ? Math.round(activeStudents / totalStudents * 100) : 0}%`} />
            <KPICard icon="🎯" label="班級平均正確率"
              value={activeStudentsWithData.length > 0 ? `${classAvgAcc.toFixed(1)}%` : '—'}
              color={classAvgAcc >= 75 ? 'green' : classAvgAcc >= 60 ? 'orange' : 'red'} />
            <KPICard icon="📚" label="累計總答題" value={totalAttemptsClass} color="purple" />
          </div>
        </CollapsibleSection>

        {/* 板塊 4：需要關注的學生 */}
        {(inactiveStudents.length > 0 || laggingStudents.length > 0) && (
          <CollapsibleSection
            title="需要關注的學生"
            icon="fa-bell" iconColor="text-red-500"
            badge={`${inactiveStudents.length + laggingStudents.length} 人`}
            badgeColor="red" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inactiveStudents.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-user-xmark text-red-500"></i>
                    <span className="font-bold text-red-700 dark:text-red-300 text-sm">尚未開始（{inactiveStudents.length} 人）</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {inactiveStudents.slice(0, 30).map((s, i) => (
                      <span key={i} className="text-xs bg-white dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                        {s.name}
                      </span>
                    ))}
                    {inactiveStudents.length > 30 && <span className="text-xs text-red-600 dark:text-red-400">…等 {inactiveStudents.length} 人</span>}
                  </div>
                </div>
              )}
              {laggingStudents.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-exclamation-circle text-yellow-500"></i>
                    <span className="font-bold text-yellow-700 dark:text-yellow-300 text-sm">
                      連續 3 天以上未練習（{laggingStudents.length} 人）
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {laggingStudents.map((s, i) => (
                      <span key={i} className="text-xs bg-white dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-800">
                        {s.name} ({s.lastPracticeDate || '—'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 板塊 5：班級正確率分布 */}
        <CollapsibleSection
          title="班級正確率分布"
          icon="fa-chart-column" iconColor="text-purple-500"
          defaultOpen={false}
          hint="若分布集中在低分區 → 全班普遍偏低；若兩端都有 → 分化嚴重，建議分層教學。">
          {activeStudentsWithData.length === 0
            ? <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">暫無足夠數據</div>
            : <BarChart data={distData} />}
        </CollapsibleSection>

        {/* 板塊 6：教學熱點 */}
        <CollapsibleSection
          title="教學熱點：全班最弱章節"
          icon="fa-fire" iconColor="text-red-500"
          badge={weakestChapters.length > 0 ? `Top ${weakestChapters.length}` : null}
          badgeColor="red" defaultOpen={false}
          hint="優先在課堂上重點講解這些章節（僅列出可信度「中」或「高」的章節）。">
          {weakestChapters.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">暫無足夠可信的章節資料</div>
          ) : (
            <div className="space-y-2">
              {weakestChapters.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                  <span className="text-2xl flex-shrink-0">{['🔥','⚠️','💡','📌','🎯'][i]}</span>
                  <div className="flex-1">
                    <div className="font-bold text-gray-700 dark:text-gray-200">{c.chapter}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      累計作答 ≈{c.total} 題 · 可信度 {c.reliability === 'high' ? '高' : '中'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{c.accuracy}%</div>
                    <div className="text-[10px] text-red-500 dark:text-red-300">平均正確率</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* 板塊 7：章節掌握矩陣 */}
        <CollapsibleSection
          title="章節掌握矩陣"
          icon="fa-th" iconColor="text-indigo-500"
          defaultOpen={false}
          hint="紅色方格 = 該學生在此章節較弱；可左右滑動查看，點「查看」進入單一學生統計。">
          <div className="flex gap-3 mb-3 text-xs flex-wrap">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-500"></span>≥80%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-400"></span>60-80%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400"></span>&lt;60%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-200 dark:bg-slate-500"></span>無數據</span>
          </div>
          <MasteryMatrix students={sortedStudents} chapters={allChapters}
                         selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} />
        </CollapsibleSection>

        {/* 🆕 板塊 8：學生名單（新增「今日 / 本週」欄位） */}
        <CollapsibleSection
          title="學生名單與表現"
          icon="fa-users" iconColor="text-green-500"
          badge={`共 ${totalStudents} 位`} badgeColor="green"
          defaultOpen={true}
          hint="點擊欄位標題可排序。「今日題數」是追蹤每天完成進度的最關鍵欄位。">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700 text-xs">
                  <th className="text-left py-2 px-2 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('name')}>
                    學生<SortIcon col="name" />
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:text-indigo-500 bg-amber-50 dark:bg-amber-900/20" onClick={() => handleSort('todayQuestions')}>
                    今日題數<SortIcon col="todayQuestions" />
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('weekQuestions')}>
                    本週題數<SortIcon col="weekQuestions" />
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('totalQ')}>
                    累計題數<SortIcon col="totalQ" />
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('accuracy')}>
                    總正確率<SortIcon col="accuracy" />
                  </th>
                  <th className="text-right py-2 px-2">最後練習</th>
                  <th className="text-center py-2 px-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-gray-400 dark:text-gray-500 py-6">暫無學生數據</td></tr>
                ) : sortedStudents.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-600/50">
                    <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-100">{s.name}</td>
                    <td className="py-2 px-2 text-right bg-amber-50/50 dark:bg-amber-900/10">
                      {s.todayQuestions > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">{s.todayQuestions}</span>
                          <span className={`text-[10px] font-mono ${s.todayAcc >= 80 ? 'text-green-600' : s.todayAcc >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {s.todayAcc}%
                          </span>
                        </div>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {s.weekQuestions > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-purple-700 dark:text-purple-300 font-mono">{s.weekQuestions}</span>
                          <span className="text-[10px] text-gray-500">{s.weekAttempts} 局</span>
                        </div>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300 font-mono">{s.totalQuestions}</td>
                    <td className="py-2 px-2 text-right">
                      {s.attempts > 0 ? (
                        <span className={`font-bold ${s.accuracy >= 80 ? 'text-green-600 dark:text-green-400' : s.accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          {s.accuracy.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-[11px] text-gray-500 dark:text-gray-400">
                      {s.lastPracticeDate ? (() => {
                        const [ty, tm, td] = todayStr.split('-').map(Number);
                        const [ly, lm, ld] = s.lastPracticeDate.split('-').map(Number);
                        if (!ly) return '—';
                        const diff = Math.round((new Date(ty,tm-1,td) - new Date(ly,lm-1,ld)) / 86400000);
                        if (diff === 0) return <span className="text-green-600 dark:text-green-400 font-bold">今天</span>;
                        if (diff === 1) return '昨天';
                        if (diff < 7) return `${diff} 天前`;
                        if (diff < 30) return `${Math.floor(diff/7)} 週前`;
                        return <span className="text-red-500">{Math.floor(diff/30)} 月前</span>;
                      })() : <span className="text-red-400">未開始</span>}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button onClick={() => setSelectedStudent(s.rawName)}
                        className="text-[10px] px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition">
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* 🆕 板塊：班級易錯題排行榜（數據來源：各學生雲端錯題本） */}
        <CollapsibleSection
          title="班級易錯題 Top 10"
          icon="fa-skull" iconColor="text-red-500"
          defaultOpen={false}
          hint="統計全班（或所選年級）所有同學的錯題本，找出最多人共同擁有的易錯題，讓老師一鍵掌握全班共同弱點。">
          {(() => {
            const wrongBookMap = leaderboardData?.wrongBookMap || {};
            // wrongBookMap 結構：{ studentName: { questionId: { question, wrongCount, ... }, ... }, ... }
            // 若後端沒有 wrongBookMap，嘗試從 users 陣列讀取（兼容舊格式）
            const countMap = {};
            const usersArr = leaderboardData?.users || [];
            // 嘗試從 leaderboardData.wrongBookAll（如有）讀取
            const wbAll = leaderboardData?.wrongBookAll || wrongBookMap;
            Object.entries(wbAll).forEach(([studentName, wb]) => {
              if (!wb || typeof wb !== 'object') return;
              // 只計算當前 formFilter 的學生
              const form = getStudentForm(studentName);
              if (selectedForm !== 'All' && form !== selectedForm) return;
              Object.entries(wb).forEach(([qId, entry]) => {
                if (!entry || !entry.question) return;
                if (!countMap[qId]) {
                  countMap[qId] = {
                    question: entry.question,
                    totalWrong: 0,
                    studentCount: 0,
                    students: []
                  };
                }
                countMap[qId].totalWrong += (entry.wrongCount || 1);
                countMap[qId].studentCount += 1;
                countMap[qId].students.push(shortenName(studentName));
              });
            });
            const sorted = Object.values(countMap)
              .sort((a, b) => b.studentCount - a.studentCount || b.totalWrong - a.totalWrong)
              .slice(0, 10);
            if (sorted.length === 0) {
              return (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                  <i className="fas fa-book-open text-3xl mb-2 block"></i>
                  暫無數據（需要後端傳回 wrongBookAll 欄位）
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {sorted.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow ${i === 0 ? 'bg-red-600' : i === 1 ? 'bg-red-500' : i === 2 ? 'bg-red-400' : 'bg-gray-400'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug mb-1">
                        {item.question && formatText(item.question.title || item.question.question || '(無題目文字)')}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-red-600 dark:text-red-400 font-bold">
                          <i className="fas fa-users mr-1"></i>{item.studentCount} 位同學
                        </span>
                        <span>・總錯 {item.totalWrong} 次</span>
                        {item.question?.category && (
                          <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                            {item.question.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CollapsibleSection>

        <button onClick={onBack} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>返回主頁
        </button>
      </div>
    </div>
  );
}

const ERROR_TAGS = [
  { id: 'careless',  label: '#粗心大意', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700' },
  { id: 'concept',   label: '#概念模糊', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700' },
  { id: 'vocab',     label: '#名詞忘記', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
  { id: 'diagram',   label: '#圖表看不懂', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  { id: 'trap',      label: '#題目陷阱', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
];

const SPACED_REP_DAYS = 7; // 超過幾天算記憶衰退

function WrongBookScreen({ onBack, onStartReview, wrongBook, onUpdateNote, questionPool = [] }) {
  const questionById = useMemo(() => {
    const map = {};
    for (const q of questionPool) {
      const id = getQuestionId(q);
      if (id) map[id] = q;
    }
    return map;
  }, [questionPool]);

  const [expanded, setExpanded] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [filterChapter, setFilterChapter] = useState('all');
  const [filterSort, setFilterSort]     = useState('recent');   // recent | wrongCount | addedAt
  const [deathMatchMode, setDeathMatchMode] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const now = Date.now();

  const allEntries = useMemo(() => {
    return Object.entries(wrongBook)
      .map(([id, data]) => ({ id, ...data }));
  }, [wrongBook]);

  // 所有章節清單（用於篩選器）
  const chapters = useMemo(() => {
    const set = new Set();
    allEntries.forEach(e => {
      const q = questionById[e.id];
      const cat = q ? (q.category || '') : '';
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [allEntries]);

  // 魔王題（死穴題）：wrongCount >= 3 或 correctStreak === 0（且至少答錯過一次）
  const deathMatchEntries = useMemo(() => {
    return allEntries.filter(e => e.wrongCount >= 3 || (e.correctStreak === 0 && e.wrongCount > 0));
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    let list = deathMatchMode ? deathMatchEntries : allEntries;

    if (filterChapter !== 'all') {
      list = list.filter(e => (questionById[e.id]?.category || '') === filterChapter);
    }

    if (filterSort === 'wrongCount') {
      list = [...list].sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));
    } else if (filterSort === 'addedAt') {
      list = [...list].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    } else {
      // recent: 最近答錯的在前
      list = [...list].sort((a, b) => (b.lastWrongAt || b.addedAt || 0) - (a.lastWrongAt || a.addedAt || 0));
    }
    return list;
  }, [allEntries, deathMatchEntries, deathMatchMode, filterChapter, filterSort]);

  const handleExpandToggle = (id) => {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next) {
      const entry = wrongBook[next];
      setNoteInput(entry ? (entry.note || '') : '');
      setEditingNoteId(null);
    }
  };

  const handleSaveNote = (id) => {
    const entry = wrongBook[id];
    if (!entry || !onUpdateNote) return;
    onUpdateNote(id, noteInput, entry.tags || []);
    setEditingNoteId(null);
  };

  const handleToggleTag = (entryId, tagId) => {
    const entry = wrongBook[entryId];
    if (!entry || !onUpdateNote) return;
    const currentTags = entry.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    onUpdateNote(entryId, entry.note || '', newTags);
  };

  const isDecayed = (entry) => {
    const lastReview = entry.lastReviewAt || entry.addedAt || 0;
    return (now - lastReview) > SPACED_REP_DAYS * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="w-full max-w-3xl px-4 pb-10">
      <div className="glass-panel p-6 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-book-bookmark text-red-500 dark:text-red-400"></i>
            錯題簿
            <span className="ml-2 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-1 rounded-full">
              共 {allEntries.length} 題
            </span>
            {deathMatchMode && (
              <span className="text-sm bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                💀 魔王模式
              </span>
            )}
          </h2>
        </div>

        {/* Rule hint */}
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 mb-3 text-sm text-indigo-700 dark:text-indigo-300">
          <i className="fas fa-info-circle mr-1"></i>
          規則：連續答對 <span className="font-bold">{CONFIG.WRONG_BOOK_MASTERY_THRESHOLD}</span> 次後，題目會自動從錯題簿中移除。若答錯則進度歸零。
        </div>

        <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <i className="fas fa-cloud text-green-500"></i>
          <span>錯題簿已啟用雲端同步，換裝置登入後也能繼續複習</span>
        </div>

        {allEntries.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-smile-beam text-5xl text-green-400 dark:text-green-500 mb-4"></i>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-1">錯題簿空空如也～</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">繼續練習時，答錯的題目會自動加入這裡。</p>
          </div>
        ) : (
          <>
            {/* ── 篩選工具列 ── */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              {/* 章節篩選 */}
              <select
                value={filterChapter}
                onChange={e => setFilterChapter(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="all">📚 所有章節</option>
                {chapters.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>

              {/* 排序 */}
              <select
                value={filterSort}
                onChange={e => setFilterSort(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="recent">🕐 最近答錯</option>
                <option value="wrongCount">🔢 答錯次數多</option>
                <option value="addedAt">📅 最早加入</option>
              </select>

              {/* 魔王模式切換 */}
              <button
                onClick={() => setDeathMatchMode(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${
                  deathMatchMode
                    ? 'bg-red-600 text-white border-red-700 shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
              >
                💀 弱點突破模式 {deathMatchMode ? `(${deathMatchEntries.length} 題)` : ''}
              </button>
            </div>

            {/* 顯示筆數提示 */}
            {filteredEntries.length !== allEntries.length && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                顯示 {filteredEntries.length} / {allEntries.length} 題
              </div>
            )}

            {/* ── 主要操作按鈕 ── */}
            <button
              onClick={() => onStartReview(deathMatchMode ? deathMatchEntries.map(e => questionById[e.id]).filter(Boolean) : null)}
              className={`w-full mb-4 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                deathMatchMode
                  ? 'bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-800 hover:to-rose-700'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
              }`}
            >
              <i className={`fas ${deathMatchMode ? 'fa-skull' : 'fa-book-open'}`}></i>
              <span>{deathMatchMode ? `💀 開始魔王題特訓（${deathMatchEntries.length} 題）` : `開始複習錯題（${filteredEntries.length} 題）`}</span>
              <i className="fas fa-arrow-right"></i>
            </button>

            {/* ── 題目列表 ── */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
              {filteredEntries.map((entry, idx) => {
                const decayed = isDecayed(entry);
                return (
                  <div key={entry.id} className={`bg-white dark:bg-gray-800 border rounded-lg overflow-hidden transition-all ${
                    entry.wrongCount >= 3 ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-start p-3 gap-2">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                            {questionById[entry.id]?.category || '—'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            entry.wrongCount >= 3
                              ? 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300 font-bold'
                              : 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                          }`}>
                            答錯 {entry.wrongCount} 次{entry.wrongCount >= 3 ? ' 💀' : ''}
                          </span>
                          <span className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                            進度 {entry.correctStreak || 0}/{CONFIG.WRONG_BOOK_MASTERY_THRESHOLD} ⭐
                          </span>
                          {decayed && (
                            <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                              ⚠️ 超過 {SPACED_REP_DAYS} 天未複習
                            </span>
                          )}
                          {/* 已選標籤預覽 */}
                          {(entry.tags || []).map(tid => {
                            const t = ERROR_TAGS.find(x => x.id === tid);
                            return t ? (
                              <span key={tid} className={`text-[10px] px-2 py-0.5 rounded-full border ${t.color}`}>{t.label}</span>
                            ) : null;
                          })}
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 break-words line-clamp-2">
                          {formatText((() => { const q = questionById[entry.id]; return q ? (q.title || q.question) : null; })() || '(題目已從題庫移除)')}
                        </p>
                        {/* 筆記預覽（非展開狀態）*/}
                        {entry.note && expanded !== entry.id && (
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 italic truncate">
                            📝 {entry.note}
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleExpandToggle(entry.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded flex-shrink-0">
                        <i className={`fas fa-chevron-${expanded === entry.id ? 'up' : 'down'}`}></i>
                      </button>
                    </div>

                    <AnimatePresence>
                      {expanded === entry.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
                          <div className="p-3 text-sm space-y-3">
                            {/* 選項與答案 */}
                            {questionById[entry.id] && resolveOptions(questionById[entry.id]).length > 0 && (
                              <div className="space-y-1">
                                {resolveOptions(questionById[entry.id]).map((opt, i) => (
                                  <div key={i} className={`flex items-start gap-2 ${i === resolveCorrectIndex(questionById[entry.id].correctIndex) ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                                    <span className="flex-shrink-0">{String.fromCharCode(65 + i)}.</span>
                                    <span className="break-words">{formatText(opt)}{i === resolveCorrectIndex(questionById[entry.id].correctIndex) && ' ✓'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {questionById[entry.id]?.explanation && (
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-300">
                                <i className="fas fa-lightbulb mr-1"></i>
                                {formatText(questionById[entry.id].explanation)}
                              </div>
                            )}

                            {/* ── 錯誤類型標籤 ── */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">🏷️ 錯誤類型：</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ERROR_TAGS.map(tag => {
                                  const active = (entry.tags || []).includes(tag.id);
                                  return (
                                    <button
                                      key={tag.id}
                                      onClick={() => handleToggleTag(entry.id, tag.id)}
                                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                                        active
                                          ? tag.color + ' ring-2 ring-offset-1 ring-current'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-slate-500'
                                      }`}
                                    >
                                      {tag.label} {active ? '✓' : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* ── 我的筆記 ── */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">📝 我的筆記：</p>
                              {editingNoteId === entry.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    placeholder="例：把 Mitosis 跟 Meiosis 搞混了！或：看漏了 NOT 這個字"
                                    rows={3}
                                    className="w-full text-xs border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleSaveNote(entry.id)}
                                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                                      💾 儲存筆記
                                    </button>
                                    <button onClick={() => setEditingNoteId(null)}
                                      className="px-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
                                      取消
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => { setEditingNoteId(entry.id); setNoteInput(entry.note || ''); }}
                                  className={`w-full text-xs rounded-lg px-3 py-2 cursor-pointer border transition-all ${
                                    entry.note
                                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                      : 'bg-gray-100 dark:bg-gray-700 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-500'
                                  }`}
                                >
                                  {entry.note || '點擊新增筆記…'}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <button onClick={onBack} className="w-full mt-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> 返回主頁
        </button>
      </div>
    </div>
  );
}

const ITEM_COLOR_CLASSES = {
  blue:   { border: 'border-blue-100 dark:border-blue-800',     btn: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800',     badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  purple: { border: 'border-purple-100 dark:border-purple-800', btn: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800', badge: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  green:  { border: 'border-green-100 dark:border-green-800',   btn: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800',   badge: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  orange: { border: 'border-orange-100 dark:border-orange-800', btn: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800', badge: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  red:    { border: 'border-red-100 dark:border-red-800',       btn: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800',             badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  yellow: { border: 'border-yellow-100 dark:border-yellow-800', btn: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800', badge: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  pink:   { border: 'border-pink-100 dark:border-pink-800',     btn: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800',         badge: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
  indigo: { border: 'border-indigo-100 dark:border-indigo-800', btn: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800', badge: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' }
};

function ShopScreen({ onBack, userName, leaderboardData, fetchLeaderboard, isOnline }) {
  const toast = useToast();
  const [buying, setBuying] = useState(false);

  // 🆕 [C5 修復] 用 ref 做同步鎖，避免快速雙擊在 setState 生效前送出第二次請求
  const buyingRef = useRef(false);

  const user = findUser(leaderboardData, userName) || { coins: 0, shields: 0, doubleXP: 0, skipCards: 0 };
  const isAccountReady = !!leaderboardData;

  const getOwned = (item) => user[item.userField] || 0;

  const handleBuy = async (item) => {
    // 🆕 [C5 修復] 同步鎖：第一行就攔截重複呼叫
    if (buyingRef.current) {
      console.log('[Shop] 上一筆購買還在進行中，已攔截重複點擊');
      return;
    }

    if (!isOnline) return toast("目前離線中，無法購買！請檢查網路連線後再試。", "warning", 4000);
    if (!isAccountReady) return toast("帳號資料還在載入,請稍候幾秒再購買。", "info", 3000);
    if (user.coins < item.price) return toast("金幣不足！多答對幾題再來吧。", "warning", 3000);
    if (item.maxOwn && getOwned(item) >= item.maxOwn) return toast(item.maxOwnMsg, "warning", 4000);

    // 🆕 立即鎖定（同步生效），再更新 UI 狀態
    buyingRef.current = true;
    setBuying(true);

    try {
      const result = await api.buyItem({ name: getCanonicalName(userName), item: item.id, cost: item.price });
      if (result.success || result.result === "success") {
        await fetchLeaderboard();
        toast("🎉 購買成功！裝備已放入背包。", "success", 3000);
      } else {
        toast("購買失敗：" + (result.error || result.message || "餘額不足或伺服器發生錯誤"), "error", 4000);
      }
    } catch (e) {
      console.error(e);
      toast("連線失敗,請確保 Apps Script 已發佈最新版本。", "error", 4000);
    } finally {
      // 🆕 同時釋放 ref 鎖與 UI 狀態
      buyingRef.current = false;
      setBuying(false);
    }
  };

  return (
    <div className="w-full max-w-2xl px-4 pb-10">
      <div className="glass-panel p-6 rounded-2xl shadow-xl relative">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-store text-indigo-600 dark:text-indigo-400"></i> 生物補給站
          </h2>
          <div className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-full font-bold flex items-center gap-2">
            <i className="fas fa-coins text-yellow-500 dark:text-yellow-400"></i>
            {isAccountReady ? `${user.coins} 金幣` : <span className="text-xs"><i className="fas fa-spinner fa-spin mr-1"></i>載入中</span>}
          </div>
        </div>

        {!isAccountReady && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-indigo-700 dark:text-indigo-300">
            <i className="fas fa-info-circle mr-1"></i>帳號資料還在載入，商品預覽可以先瀏覽；資料載入完成後即可購買。
          </div>
        )}

        <div className="flex gap-4 mb-6 text-sm flex-wrap">
          {SHOP_ITEMS.map(item => {
            const c = ITEM_COLOR_CLASSES[item.color] || ITEM_COLOR_CLASSES.blue;
            const owned = getOwned(item);
            const countText = item.maxOwn
              ? `${owned}/${item.maxOwn}`
              : `${owned}${item.unit ? ' ' + item.unit : ''}`;
            return (
              <div key={item.id} className={`${c.badge} px-3 py-1 rounded-lg font-medium shadow-sm`}>
                {item.badgeLabel}: {item.icon} {countText}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {SHOP_ITEMS.map(item => {
            const c = ITEM_COLOR_CLASSES[item.color] || ITEM_COLOR_CLASSES.blue;
            const isOverLimit = item.maxOwn && getOwned(item) >= item.maxOwn;
            const isBroke = isAccountReady && user.coins < item.price;
            const disabled = buying || isOverLimit || isBroke || !isOnline || !isAccountReady;
            return (
              <div key={item.id} className={`border-2 ${c.border} bg-white dark:bg-gray-800 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between`}>
                <div>
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{item.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{item.desc}</p>
                </div>
                <button onClick={() => handleBuy(item)} disabled={disabled}
                  className={`w-full py-2 rounded-lg font-bold transition flex justify-center items-center gap-2 ${
                    disabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : c.btn
                  }`}>
                  {buying ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-coins"></i>} {item.price} 購買
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={onBack} disabled={buying} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
          <i className="fas fa-arrow-left mr-2"></i> 返回大廳
        </button>
      </div>
    </div>
  );
}
