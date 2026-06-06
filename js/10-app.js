function BiologyFlashcardApp() {

  const toast = useToast();
  const [gameState, setGameState] = useState('start');
  const [userName, setUserName]   = usePersistedUser();
  const [isGuest, setIsGuest]     = useState(false);
  const [isDark, setIsDark]       = useDarkMode();

  /* 🆕 任務功能：當前正在做的任務、查看中的成績單 */
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [viewingAssignment, setViewingAssignment] = useState(null);

  /* 🆕 限時任務（speedrun）狀態 */
  const [speedrunRemainingMs, setSpeedrunRemainingMs] = useState(0);
  const speedrunEndedRef = useRef(false);

  const { isOnline, justReconnected } = useOnlineStatus();

  const [lastScope, setLastScope] = useState('');

  // 🆕 [H2 修復] 記錄最近一次成績上傳完成的時間戳，用於週榜去重
  const [currentRunSubmittedAt, setCurrentRunSubmittedAt] = useState(null);

  const [isWrongBookMode, setIsWrongBookMode] = useState(false);
  const [currentWrongStreak, setCurrentWrongStreak] = useState(0);
  const wrongBookRemovedRef = useRef(0);

  // 🆕 累計答對題目數（錯題本×2）— 以雲端為唯一真實來源
  const [cumulativeCorrect, setCumulativeCorrect] = useState(0);

  // 🆕 每日任務進度（純前端，每日重置）
  const [dailyQuestStats, setDailyQuestStats] = useState(() => {
    const today = getHKDateString();
    const saved = JSON.parse(localStorage.getItem('bio_daily_quest_' + today) || 'null');
    return saved || { date: today, todayTotal: 0, hadPerfect: false, wrongRemoved: 0, claimed: {} };
  });
  const saveDailyQuestStats = useCallback((stats) => {
    const today = getHKDateString();
    const toSave = { ...stats, date: today };
    setDailyQuestStats(toSave);
    localStorage.setItem('bio_daily_quest_' + today, JSON.stringify(toSave));
  }, []);

  const [settings, setSettings] = useState({
    enableCore: true,
    selectedChapters: [...ALL_CHAPTERS],
    enableElective: false,
    selectedElectives: [],
    count: CONFIG.QUESTIONS_PER_SESSION,
    showHints: true
  });

  const [questions, setQuestions]   = useState([]);
  const [currentIndex, setIndex]    = useState(0);
  const [results, setResults]       = useState([]);
  const [timerStart, setTimerStart] = useState(0);
  const [timerMs, setTimerMs]       = useState(0);
const [mySkipCards, setMySkipCards] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showComboEffect, setShowComboEffect] = useState(null); // null | 3 | 5

  const { pool: questionPool, error: questionError, reload: reloadQuestions } = useQuestionPool();
  const { data: leaderboardData, loading: loadingRank, refetch: refetchLeaderboard } = useLeaderboard(userName);

  const { wrongBook, count: wrongBookCount, addWrong, recordReviewAnswer, removeFromBook, updateNote } =
    useWrongBook(userName, leaderboardData, isOnline, refetchLeaderboard);
  const [debugInfo, setDebugInfo] = useState({ error: null });

  const pendingQueueRef = useRef([]);
  const [pendingSubmitCount, setPendingSubmitCount] = useState(0);

  useImagePreload(questions, currentIndex, CONFIG.PRELOAD_AHEAD);

  // 🆕 [C1 修復] 把 pendingSubmitCount 暴露給版本檢查系統
  useEffect(() => {
    window.__APP_PENDING_SUBMITS__ = pendingSubmitCount;
  }, [pendingSubmitCount]);

  const { tabSwitchCount, recordAnswerTime, resetAntiCheat, getCheatReport } =
    useAntiCheat(gameState, currentIndex, isWrongBookMode);

  /* 🆕 memoize 當前使用者，避免多處重複查找 */
  const currentUser = useMemo(() => findUser(leaderboardData, userName), [leaderboardData, userName]);

  /* ============================================================
   * 🆕 限時任務 (speedrun) 邏輯 — 必須放喺所有 state 宣告之後！
   * ============================================================ */

  const isSpeedrun = !!(activeAssignment && activeAssignment.taskType === 'speedrun');
  const speedrunTargetCorrect = isSpeedrun ? Number(activeAssignment.targetCorrect || 0) : 0;
  const speedrunTimeLimitMs   = isSpeedrun ? Number(activeAssignment.timeLimitMin || 0) * 60000 : 0;

  // 即時計算當前正確題數（給限時任務用）
  const currentCorrectCount = useMemo(
    () => results.filter(r => r.isCorrect).length,
    [results]
  );

  // 限時任務的結算函式（先宣告，後面 useEffect 先用得到）
  const finishSpeedrun = useCallback((success) => {
    const timeUsed = Date.now() - timerStart;
    setTimerMs(timeUsed);

    const finalResults = results;
    const correctCnt = finalResults.filter(r => r.isCorrect).length;

    const parts = [];
    if (settings.enableCore && settings.selectedChapters.length > 0) {
      parts.push(settings.selectedChapters.map(c => `Ch.${c}`).join(', '));
    }
    if (settings.enableElective && settings.selectedElectives.length > 0) {
      parts.push(settings.selectedElectives.join(', '));
    }
    const scopeStr = activeAssignment ? activeAssignment.scope : parts.join(' | ');
    setLastScope(scopeStr);

    if (success) {
      toast(`🏆 達標！在時限內答對 ${correctCnt} 題！`, "success", 4000);
    } else {
      toast(`⏱️ 時間到！本次答對 ${correctCnt}/${speedrunTargetCorrect} 題`,
            correctCnt >= speedrunTargetCorrect ? "success" : "warning", 4000);
    }

    if (userName && !isGuest && userName !== "訪客 (未登入)" && activeAssignment) {
      api.submitAssignment({
        assignmentId: activeAssignment.id,
        studentName: userName,
        score: correctCnt,
        total: finalResults.length,
        timeMs: timeUsed,
        speedrunSuccess: success,
        targetCorrect: speedrunTargetCorrect
      }).then(() => {
        setTimeout(refetchLeaderboard, 1500);
      }).catch(err => console.warn('限時任務提交失敗:', err));
    }

    setGameState('result');
  }, [timerStart, results, settings, activeAssignment, userName, isGuest,
      speedrunTargetCorrect, toast, refetchLeaderboard]);

  // 限時任務倒數 + 時間到自動結束
  useEffect(() => {
    if (gameState !== 'playing' || !isSpeedrun) {
      speedrunEndedRef.current = false;
      return;
    }

    speedrunEndedRef.current = false;
    setSpeedrunRemainingMs(speedrunTimeLimitMs);

    const tick = setInterval(() => {
      const remaining = speedrunTimeLimitMs - (Date.now() - timerStart);
      setSpeedrunRemainingMs(Math.max(0, remaining));

      if (remaining <= 0 && !speedrunEndedRef.current) {
        speedrunEndedRef.current = true;
        clearInterval(tick);
        finishSpeedrun(false);
      }
    }, 250);

    return () => clearInterval(tick);
  }, [gameState, isSpeedrun, timerStart, speedrunTimeLimitMs, finishSpeedrun]);

  // 達到目標答對數立即結束
  useEffect(() => {
    if (gameState !== 'playing' || !isSpeedrun) return;
    if (speedrunEndedRef.current) return;
    if (speedrunTargetCorrect > 0 && currentCorrectCount >= speedrunTargetCorrect) {
      speedrunEndedRef.current = true;
      finishSpeedrun(true);
    }
  }, [gameState, isSpeedrun, currentCorrectCount, speedrunTargetCorrect, finishSpeedrun]);

  /* ============================================================
   * 以下保持原本所有邏輯不變
   * ============================================================ */

  /* 🆕 從 leaderboardData 衍生「待辦任務 / 已交任務」（依目標過濾） */
  const myAssignments = useMemo(() => {
    if (!leaderboardData) return { pending: [], submitted: [], submissionMap: {} };
    const all = leaderboardData.assignments || [];
    const subs = leaderboardData.mySubmissions || [];

    const isTeacherViewer = isTeacher(userName);
    const myForm    = getStudentForm(userName);
    const myShortLC = shortenName(userName).toLowerCase();

    const targeted = isTeacherViewer ? all : all.filter(a => {
      if (a.targetStudents && Array.isArray(a.targetStudents) && a.targetStudents.length > 0) {
        return a.targetStudents.some(t =>
          shortenName(String(t || '')).toLowerCase() === myShortLC
        );
      }
      if (a.targetForm && a.targetForm !== 'All' && String(a.targetForm) !== String(myForm)) {
        return false;
      }
      return true;
    });

    const submittedIds = new Set(subs.map(s => s.assignmentId));
    const submissionMap = {};
    for (let i = 0; i < subs.length; i++) submissionMap[subs[i].assignmentId] = subs[i];

    return {
      pending: targeted.filter(a => !submittedIds.has(a.id)),
      submitted: targeted.filter(a => submittedIds.has(a.id)),
      submissionMap
    };
  }, [leaderboardData, userName]);

  // 從雲端同步累計答對題目數
  useEffect(() => {
    if (!userName || userName === "訪客 (未登入)") {
      setCumulativeCorrect(0);
      return;
    }
    if (leaderboardData && typeof leaderboardData.cumulativeCorrect === 'number') {
      setCumulativeCorrect(leaderboardData.cumulativeCorrect);
    }
  }, [userName, leaderboardData]);

  useEffect(() => {
    if (!isWrongBookMode) return;
    const q = questions[currentIndex];
    if (!q) return;
    const id = getQuestionId(q);
    if (id && wrongBook[id]) {
      setCurrentWrongStreak(wrongBook[id].correctStreak || 0);
    } else {
      setCurrentWrongStreak(0);
    }
  }, [currentIndex, isWrongBookMode, questions, wrongBook]);

  useEffect(() => {
    if (!isOnline) return;
    if (pendingQueueRef.current.length === 0) return;

    const queue = pendingQueueRef.current.slice();
    pendingQueueRef.current = [];
    setPendingSubmitCount(0);

    let succeeded = 0;
    let failed = 0;

    Promise.all(queue.map(async (payload) => {
      try {
        await api.submitGame(payload);
        succeeded++;
      } catch (e) {
        failed++;
        pendingQueueRef.current.push(payload);
      }
    })).then(() => {
      setPendingSubmitCount(pendingQueueRef.current.length);
      if (succeeded > 0) {
        toast(`已成功補送 ${succeeded} 筆成績到雲端！`, "success", 4000);
        setTimeout(refetchLeaderboard, 2000);
      }
      if (failed > 0) {
        toast(`有 ${failed} 筆成績仍待重送，下次連線時會再嘗試`, "warning", 4000);
      }
    });
  }, [isOnline, toast, refetchLeaderboard]);

  const filterPool = useCallback(() => {
    const out = [];
    for (let i = 0; i < questionPool.length; i++) {
      const q = questionPool[i];
      const cat = q.category || "";
      const isElective = cat.toUpperCase().startsWith("E");
      if (isElective) {
        if (!settings.enableElective) continue;
        const code = cat.split(' ')[0].toUpperCase();
        if (settings.selectedElectives.includes(code)) out.push(q);
        continue;
      }
      const m = cat.match(/Ch\.(\d+)/);
      if (m) {
        if (!settings.enableCore) continue;
        if (settings.selectedChapters.includes(parseInt(m[1]))) out.push(q);
      }
    }
    return out;
  }, [questionPool, settings]);

  const startSession = useCallback((assignment = null) => {
    if (!questionPool || questionPool.length === 0) {
      return toast("題庫是空的或還在載入！請稍等或檢查網路連線。", "warning", 4000);
    }

    let selected;
    let count;

    if (assignment) {
      const tokens = assignment.scope.split('|')
        .flatMap(p => p.split(',').map(s => s.trim().toUpperCase()))
        .filter(Boolean);
      const filtered = questionPool.filter(q => {
        const cat = (q.category || '').toUpperCase();
        return tokens.some(tok => {
          // 將 tok 中的點轉義（例如 CH.2 變成 CH\.2）
          const escapedTok = tok.replace(/\./g, '\\.');
          // 使用正則表達式，(?![0-9]) 代表「後面不能緊接著數字」
          // 這樣 CH.2 就不會配對到 CH.27
          const regex = new RegExp(escapedTok + '(?![0-9])');
          return regex.test(cat);
        });
      });
      if (filtered.length === 0) {
        return toast(`找不到符合範圍「${assignment.scope}」的題目！請聯絡老師。`, "warning", 4000);
      }
      count = Math.min(assignment.questionCount || 20, filtered.length);
      selected = shuffleArray(filtered).slice(0, count);
      setActiveAssignment(assignment);
    } else {
      const filtered = filterPool();
      if (filtered.length === 0) {
        return toast("沒有符合條件的題目！請嘗試選擇更多章節。", "warning", 4000);
      }
      count = Math.min(settings.count, filtered.length);
      selected = shuffleArray(filtered).slice(0, count);
      setActiveAssignment(null);

      // 🆕 間隔重複：暗中植入錯題簿題目（最多 2~3 題）
      const wrongEntries = Object.values(wrongBook).filter(e =>
        e.question && isQuestionComplete(e.question)
      );
      if (wrongEntries.length > 0) {
        // 優先選 correctStreak 較低（尚未掌握）的錯題
        const sortedWrong = wrongEntries
          .slice()
          .sort((a, b) => (a.correctStreak || 0) - (b.correctStreak || 0));

        const maxInject = Math.min(3, Math.floor(count / 5), sortedWrong.length);
        // 每 5 題最多插 1 題，上限 3 題，且不超過錯題簿數量
        const injectCount = maxInject >= 1
          ? Math.max(1, maxInject)
          : 0;

        if (injectCount > 0) {
          // 取優先度最高的 injectCount 題，並標記來源
          const toInject = sortedWrong
            .slice(0, injectCount)
            .map(e => ({ ...e.question, _fromWrongBook: true }));

          // 從 selected 尾端移除同等數量，避免總題數超標
          const trimmed = selected.slice(0, count - injectCount);

          // 打散插入位置（不集中在最後）
          const combined = trimmed.slice();
          toInject.forEach(q => {
            const pos = Math.floor(Math.random() * (combined.length + 1));
            combined.splice(pos, 0, q);
          });
          selected = combined;
        }
      }
    }

    setQuestions(selected);
    setIndex(0);
    setResults([]);
    setIsWrongBookMode(false);
    wrongBookRemovedRef.current = 0;

    setMySkipCards(currentUser?.skipCards || 0);

    const preloadEnd = Math.min(CONFIG.PRELOAD_AHEAD, selected.length);
    for (let i = 0; i < preloadEnd; i++) {
      const urls = collectImageUrls(selected[i]);
      for (let j = 0; j < urls.length; j++) preloadImage(urls[j]);
    }

    resetAntiCheat();
    setTimerStart(Date.now());
    setGameState('playing');
  }, [questionPool, filterPool, settings, currentUser, toast, resetAntiCheat]);

  const startWrongBookSession = useCallback((customQuestions = null) => {
    // 魔王模式傳入 customQuestions（死穴題列表），否則用全部錯題
    const rawQuestions = customQuestions
      ? customQuestions.filter(Boolean)
      : Object.values(wrongBook).map(e => e.question).filter(Boolean);

    if (rawQuestions.length === 0) {
      return toast(customQuestions ? "目前沒有符合條件的死穴題！答錯 3 次以上的題目才會出現。" : "錯題簿是空的，快去練習累積錯題吧！", "info", 3000);
    }
    const qs = shuffleArray(rawQuestions);
    setQuestions(qs);
    setIndex(0);
    setResults([]);
    setIsWrongBookMode(true);
    wrongBookRemovedRef.current = 0;
    setTimerStart(Date.now());
    setGameState('playing');
    toast(
      customQuestions
        ? `💀 魔王特訓開始！共 ${qs.length} 題死穴題，連續答對 ${CONFIG.WRONG_BOOK_MASTERY_THRESHOLD} 次才能消滅！`
        : `開始複習 ${qs.length} 題錯題！連續答對 ${CONFIG.WRONG_BOOK_MASTERY_THRESHOLD} 次即可移除。`,
      "info", 4000
    );
  }, [wrongBook, toast]);

  const submitGameResult = useCallback(async (finalResults, timeUsed, scopeStr) => {
    if (isGuest || userName === "訪客 (未登入)") return;
    if (isWrongBookMode) return;

    const hasDoubleXP = currentUser ? currentUser.doubleXP > 0 : false;

    let correct = 0;
    for (let i = 0; i < finalResults.length; i++) if (finalResults[i].isCorrect) correct++;

    const payload = {
      name: getCanonicalName(userName),
      score: correct,
      total: finalResults.length,
      time: timeUsed,
      doubleXPActive: hasDoubleXP,
      scope: scopeStr
    };

    if (!isOnline) {
      pendingQueueRef.current.push(payload);
      setPendingSubmitCount(pendingQueueRef.current.length);
      toast("目前離線中，成績已暫存,網路恢復後會自動上傳！", "info", 5000);
      return;
    }

    try {
      await api.submitGame(payload);
      setCurrentRunSubmittedAt(Date.now());
      setTimeout(refetchLeaderboard, 2000);
    } catch (e) {
      console.error("提交失敗:", e);
      pendingQueueRef.current.push(payload);
      setPendingSubmitCount(pendingQueueRef.current.length);
      toast("成績上傳失敗，已加入重試佇列,連線恢復後會自動重送。", "warning", 5000);
    }
  }, [isGuest, userName, isWrongBookMode, currentUser, isOnline, toast, refetchLeaderboard]);

  const handleQuestionSubmit = useCallback((isCorrect, selectedOption, selectedOrigIdx) => {
    recordAnswerTime();

    const currentQ = questions[currentIndex];
    const isSkipped = isCorrect === null;
    const newResults = [
      ...results,
      { detail: currentQ, isCorrect: isSkipped ? false : isCorrect, userAnswer: selectedOption, userSelectedIndex: selectedOrigIdx, skipped: isSkipped }
    ];
    setResults(newResults);

    if (!isSkipped && isCorrect) {
      const increment = isWrongBookMode ? 2 : 1;
      setCumulativeCorrect(prev => prev + increment);

      // 🆕 Combo 機制
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      if (newCombo === 3 || newCombo === 5) {
        setShowComboEffect(newCombo);
        setTimeout(() => setShowComboEffect(null), 1800);
      }

      if (isWrongBookMode && userName && userName !== "訪客 (未登入)" && !isGuest) {
        fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'add_cumulative',
            name: getCanonicalName(userName),
            increment: 2
          })
        }).catch(err => console.warn('[cumulative sync] 失敗:', err));
      }
    }

// 🆕 每日任務：累計今日作答題數
    if (!isWrongBookMode) {
      setDailyQuestStats(prev => {
        const updated = { ...prev, todayTotal: (prev.todayTotal || 0) + 1 };
        saveDailyQuestStats(updated);
        return updated;
      });
    }

    if (!isSkipped && !isCorrect) setComboCount(0); // 答錯歸零 combo

    if (isWrongBookMode) {
      const info = recordReviewAnswer(currentQ, isCorrect);
      if (info.removed) {
        wrongBookRemovedRef.current += 1;
        // 🆕 更新錯題消滅進度
        setDailyQuestStats(prev => {
          const updated = { ...prev, wrongRemoved: (prev.wrongRemoved || 0) + 1 };
          saveDailyQuestStats(updated);
          return updated;
        });
        toast(`🎉 已掌握！這題已從錯題簿中移除！\n🪙 +2 金幣  ✨ +2 經驗值`, "success", 3500);

        if (userName && userName !== "訪客 (未登入)" && !isGuest) {
          api.wrongBookReward({ name: userName })
            .then(() => setTimeout(refetchLeaderboard, 2000))
            .catch(() => {});
        }
      } else if (isCorrect) {
        toast(`✅ 答對！進度 ${info.newStreak}/${CONFIG.WRONG_BOOK_MASTERY_THRESHOLD}`, "success", 2000);
      } else {
        toast(`❌ 答錯，進度歸零，繼續加油！`, "warning", 2500);
      }
    } else {
      if (!isSkipped && !isCorrect) addWrong(currentQ);
      // 🆕 若是暗中插入的錯題，答對時同步更新錯題簿進度
      else if (currentQ._fromWrongBook) {
        recordReviewAnswer(currentQ, true);
      }
    }

    if (currentIndex < questions.length - 1) {
      setTimeout(() => setIndex(currentIndex + 1), 300);
    } else {
      setTimeout(() => {
        const timeUsed = Date.now() - timerStart;
        setTimerMs(timeUsed);

        const parts = [];
        if (settings.enableCore && settings.selectedChapters.length > 0) {
          parts.push(settings.selectedChapters.map(c => `Ch.${c}`).join(', '));
        }
        if (settings.enableElective && settings.selectedElectives.length > 0) {
          parts.push(settings.selectedElectives.join(', '));
        }
        const scopeStr = activeAssignment ? activeAssignment.scope : parts.join(' | ');
        setLastScope(scopeStr);

        let correctCnt = 0;
        for (let i = 0; i < newResults.length; i++) if (newResults[i].isCorrect) correctCnt++;
        const acc = correctCnt / newResults.length;

        // 🆕 每日任務：若本局 100% 正確，標記 hadPerfect
        if (!isWrongBookMode && acc === 1) {
          setDailyQuestStats(prev => {
            const updated = { ...prev, hadPerfect: true };
            saveDailyQuestStats(updated);
            return updated;
          });
        }

        if (!isWrongBookMode && userName && !isGuest && userName !== "訪客 (未登入)") {
          const report = getCheatReport(timeUsed, acc);
          setDebugInfo({ cheatReport: report });

          if (report.isSuspicious) {
            const reasonText = report.reasons.map((r, i) => `${i+1}. ${r}`).join('\n');
            toast(
              `🚫 系統偵測到答題異常，本次不記錄成績：\n${reasonText}`,
              "warning",
              8000
            );
            console.warn('[Anti-Cheat] 異常成績被擋:', report);
          } else {
            submitGameResult(newResults, timeUsed, scopeStr);

            if (activeAssignment) {
              api.submitAssignment({
                assignmentId: activeAssignment.id,
                studentName: userName,
                score: correctCnt,
                total: newResults.length,
                timeMs: timeUsed
              }).then(() => {
                toast(`✅ 已提交任務「${activeAssignment.title}」`, "success", 3000);
                setTimeout(refetchLeaderboard, 1500);
              }).catch(err => {
                console.error('提交任務失敗:', err);
                toast('任務成績提交失敗，請檢查網路', 'error', 4000);
              });
            }
          }
        }
        setGameState('result');
      }, 500);
    }
  }, [recordAnswerTime, questions, currentIndex, results, isWrongBookMode, recordReviewAnswer, toast, userName, isGuest, refetchLeaderboard, addWrong, timerStart, settings, getCheatReport, submitGameResult, activeAssignment]);

  const handleUseSkipCard = useCallback(() => {
    if (mySkipCards <= 0) return toast("你的跳題卡不足！請先去商城購買喔。", "warning", 3000);
    const next = mySkipCards - 1;
    setMySkipCards(next);
    api.syncUser({ name: getCanonicalName(userName), skipCards: next }).catch(() => {});
    handleQuestionSubmit(null, "使用跳題卡跳過", null);
  }, [mySkipCards, userName, toast, handleQuestionSubmit]);

  const handleRestart = useCallback(() => {
    setGameState('start');
    setIsWrongBookMode(false);
    if (isGuest) { setUserName(""); setIsGuest(false); }
  }, [isGuest, setUserName]);

  const handleRemoveFromBook = useCallback((questionId) => {
    removeFromBook(questionId);
    toast(`🗑️ 已手動移除！\n🪙 +2 金幣  ✨ +2 經驗值`, "success", 3000);
    if (userName && userName !== "訪客 (未登入)" && !isGuest) {
      api.wrongBookReward({ name: userName })
        .then(() => setTimeout(refetchLeaderboard, 2000))
        .catch(() => {});
    }
  }, [removeFromBook, userName, isGuest, toast, refetchLeaderboard]);

  const canShowWrongBookBtn = gameState === 'start' && userName && userName !== "訪客 (未登入)";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 flex items-center justify-center p-4 relative">

      <NetworkStatusToast isOnline={isOnline} justReconnected={justReconnected} />

      

      <button onClick={() => setIsDark(!isDark)}
        className="fixed top-4 right-4 z-[999] w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-yellow-400 flex items-center justify-center transition-all hover:scale-110">
        {isDark ? <i className="fas fa-sun text-lg"></i> : <i className="fas fa-moon text-lg"></i>}
      </button>

      <button
  onClick={() => setGameState('flipped')}
  title="反轉課堂"
  className="fixed top-[3.75rem] right-4 z-[999] w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all hover:scale-110 text-xl">
  🎬
</button>


{gameState === 'flipped' && (
  <motion.div key="flipped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-gray-900">
    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-600 text-white shadow-md flex-shrink-0">
      <button onClick={() => setGameState('start')}
        className="flex items-center gap-1.5 text-sm font-bold hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
        <i className="fas fa-arrow-left"></i> 返回溫習
      </button>
      <span className="font-bold text-base">🎬 翻轉課堂</span>
    </div>
    <iframe
      src="https://sohinrick-spec.github.io/Sohinflippedclass/FlippedClassroom.html"
      className="flex-1 w-full border-0"
      allow="autoplay; fullscreen"
      title="翻轉課堂"
    />
  </motion.div>
)}

      <AnimatePresence mode="wait">
        {gameState === 'start' && (
          <motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full flex justify-center">
            <StartScreen
              onStart={() => startSession()}
              leaderboardData={leaderboardData}
              userName={userName} setUserName={setUserName}
              isGuest={isGuest} setIsGuest={setIsGuest}
              onShowShop={() => setGameState('shop')}
              onShowLeaderboard={() => setGameState('leaderboard')}
              onShowStats={() => setGameState('stats')}
              onShowTeacherStats={() => setGameState('teacher_stats')}
              onShowAssignmentAdmin={() => setGameState('assignment_admin')}
              onShowWrongBook={() => setGameState('wrongbook')}
              wrongBookCount={wrongBookCount}
              settings={settings} setSettings={setSettings}
              mcqCount={questionPool.length}
              questionLoadError={questionError}
              onReloadQuestions={reloadQuestions}
              myAssignments={myAssignments}
              onStartAssignment={(a) => startSession(a)}
              dailyQuestStats={dailyQuestStats}
              onClaimQuest={(quest) => {
                if (!userName || isGuest) return;
                const updatedClaimed = { ...(dailyQuestStats.claimed || {}), [quest.id]: true };
                const updated = { ...dailyQuestStats, claimed: updatedClaimed };
                saveDailyQuestStats(updated);
                const XP_BONUS = 100;
                api.claimQuestReward({ name: getCanonicalName(userName), coins: quest.reward, xp: XP_BONUS })
  .then((res) => {
    if (res && res.result === 'success') {
      toast(`🎉 任務「${quest.label}」完成！\n🪙 +${quest.reward} 金幣  ✨ +${XP_BONUS} 經驗值`, "success", 3500);
      setTimeout(refetchLeaderboard, 1500);
    } else {
      toast('領取失敗，請稍後再試', 'error', 3000);
    }
  })
  .catch(() => toast('領取失敗，請稍後再試', 'error', 3000));
              }}
            />
          </motion.div>
        )}

        {gameState === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex justify-center">
            <LeaderboardScreen
              onBack={() => setGameState('start')}
              leaderboardData={leaderboardData}
              userName={userName}
              loadingRank={loadingRank}
            />
          </motion.div>
        )}

        {gameState === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex justify-center">
            <StatsScreen
              onBack={() => setGameState('start')}
              userName={userName}
              leaderboardData={leaderboardData}
              wrongBookCount={wrongBookCount}
              wrongBook={wrongBook}
            />
          </motion.div>
        )}

        {gameState === 'teacher_stats' && (
          <motion.div key="teacher_stats" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex justify-center">
            {isTeacher(userName) ? (
              <TeacherStatsScreen
                onBack={() => setGameState('start')}
                leaderboardData={leaderboardData}
                currentUserName={userName}
              />
            ) : (
              <div className="glass-panel p-8 rounded-2xl shadow-xl text-center max-w-md">
                <i className="fas fa-lock text-4xl text-red-500 mb-4"></i>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">權限不足</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">此頁面僅限教師使用。</p>
                <button onClick={() => setGameState('start')} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg">
                  返回主頁
                </button>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'wrongbook' && (
          <motion.div key="wrongbook" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="w-full flex justify-center">
            <WrongBookScreen
              onBack={() => setGameState('start')}
              onStartReview={startWrongBookSession}
              wrongBook={wrongBook}
              onUpdateNote={updateNote}
            />
          </motion.div>
        )}
          
          

        {gameState === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full flex justify-center">
            <ShopScreen
              onBack={() => setGameState('start')}
              userName={userName}
              leaderboardData={leaderboardData}
              fetchLeaderboard={refetchLeaderboard}
              isOnline={isOnline}
            />
          </motion.div>
        )}

        {gameState === 'assignment_admin' && (
          <motion.div key="aadmin" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex justify-center">
            {isTeacher(userName) ? (
              <AssignmentAdminScreen
                onBack={() => setGameState('start')}
                leaderboardData={leaderboardData}
                currentUserName={userName}
                onViewReport={(a) => { setViewingAssignment(a); setGameState('assignment_report'); }}
                onRefresh={refetchLeaderboard}
              />
            ) : (
              <div className="glass-panel p-8 rounded-2xl shadow-xl text-center max-w-md">
                <i className="fas fa-lock text-4xl text-red-500 mb-4"></i>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">權限不足</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">此頁面僅限教師使用。</p>
                <button onClick={() => setGameState('start')} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg">返回主頁</button>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'assignment_report' && viewingAssignment && (
          <motion.div key="areport" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex justify-center">
            <AssignmentReportScreen
              assignment={viewingAssignment}
              onBack={() => setGameState('assignment_admin')}
              leaderboardData={leaderboardData}
            />
          </motion.div>
        )}

        {gameState === 'playing' && questions.length > 0 && (
          <motion.div key="playing" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full max-w-2xl landscape:max-w-5xl">
            <FlashCard
              key={questions[currentIndex]?.id || currentIndex}
              data={questions[currentIndex]}
              onSubmit={handleQuestionSubmit}
              currentIndex={currentIndex}
              totalCount={questions.length}
              startTime={timerStart}
              mySkipCards={mySkipCards}
              onUseSkipCard={handleUseSkipCard}
              isWrongBookMode={isWrongBookMode}
              wrongBookStreak={currentWrongStreak}
              onExitWrongBook={() => setGameState('wrongbook')}
              isSpeedrun={isSpeedrun}
              speedrunRemainingMs={speedrunRemainingMs}
              speedrunTargetCorrect={speedrunTargetCorrect}
              speedrunCurrentCorrect={currentCorrectCount}
              activeAssignmentTitle={activeAssignment ? activeAssignment.title : ''}
              comboCount={comboCount}
              showComboEffect={showComboEffect}
            />
          </motion.div>
        )}

        {gameState === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex justify-center">
            <ResultScreen
              results={results}
              onRestart={handleRestart}
              totalTime={timerMs}
              leaderboardData={leaderboardData}
              userName={userName}
              loadingRank={loadingRank}
              debugInfo={debugInfo}
              isGuest={isGuest}
              pendingSubmitCount={pendingSubmitCount}
              scope={lastScope}
              isWrongBookMode={isWrongBookMode}
              wrongBookRemovedCount={wrongBookRemovedRef.current}
              currentRunSubmittedAt={currentRunSubmittedAt}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function Root() {
  return (
    <ToastProvider>
      <BiologyFlashcardApp />
    </ToastProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
