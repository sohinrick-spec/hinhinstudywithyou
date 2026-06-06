/* ============================================================================
 * 【區塊 5】CUSTOM HOOKS
 * ============================================================================ */

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem(CONFIG.STORAGE.darkMode) === 'true'; }
    catch (e) { return false; }
  });
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem(CONFIG.STORAGE.darkMode, isDark ? 'true' : 'false');
    } catch (e) {}
  }, [isDark]);
  return [isDark, setIsDark];
}

/* 🆕 共用 Hook：偵測 <html> 上的 dark class 變化，供圖表元件使用 */
function useDarkModeClass() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const sync = () => setIsDark(html.classList.contains('dark'));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return isDark;
}

function usePersistedUser() {
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem(CONFIG.STORAGE.username) || "";
    } catch (e) { return ""; }
  });

  const setAndPersist = useCallback((name) => {
    const finalName = name || "";
    setUserName(finalName);
    try {
      if (finalName && finalName !== "訪客 (未登入)") {
        localStorage.setItem(CONFIG.STORAGE.username, finalName);
      } else {
        localStorage.removeItem(CONFIG.STORAGE.username);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (userName && userName !== "訪客 (未登入)") document.body.classList.add('logged-in');
    else document.body.classList.remove('logged-in');
  }, [userName]);

  return [userName, setAndPersist];
}

function useWrongBook(userName, leaderboardData, isOnline, refetchLeaderboard) {
  const storageKey = useMemo(() => {
    if (!userName || userName === "訪客 (未登入)") return null;
    return CONFIG.STORAGE.wrongBookPrefix + userName;
  }, [userName]);

  const [wrongBook, setWrongBook] = useState({});
  const pendingOpsRef = useRef([]);
  const hasSyncedFromCloudRef = useRef(false);

  useEffect(() => {
    hasSyncedFromCloudRef.current = false;
    if (!storageKey) {
      setWrongBook({});
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setWrongBook(raw ? JSON.parse(raw) : {});
    } catch (e) {
      setWrongBook({});
    }
  }, [storageKey]);

  useEffect(() => {
    if (!userName || userName === "訪客 (未登入)") return;
    if (!leaderboardData || leaderboardData.wrongBook === undefined) return;

    const cloudBook = leaderboardData.wrongBook || {};

    // 🆕 [跨裝置同步修復] 以雲端為唯一真實來源(single source of truth)
    //     只額外保留「真正還沒上傳成功的離線新增」,避免把
    //     「其他裝置已刪除/掌握的題目」誤認為「本地離線新增」而留下來
    const pendingAdds = {};
    for (let i = 0; i < pendingOpsRef.current.length; i++) {
      const op = pendingOpsRef.current[i];
      if (op && op.action === 'wrongbook_add' && op.questionId && op.questionData) {
        // 若雲端已經有同 ID(代表這筆其實已上傳成功,只是 ack 沒回來)就跳過
        if (cloudBook[op.questionId]) continue;

        pendingAdds[op.questionId] = {
          question: op.questionData,
          correctStreak: 0,
          wrongCount: 1,
          addedAt: Date.now(),
          lastWrongAt: Date.now()
        };
      }
    }

    // 🆕 對雲端題目做完整性檢查:若雲端版殘缺但本地有完整版,保留本地的 question 欄位
    //     (進度/次數仍以雲端為準,避免兩台裝置進度衝突)
    setWrongBook(prev => {
      const merged = {};
      const cloudIds = Object.keys(cloudBook);
      for (let i = 0; i < cloudIds.length; i++) {
        const id = cloudIds[i];
        const cloudEntry = cloudBook[id];
        const localEntry = prev ? prev[id] : null;

        const cloudQ = cloudEntry.question;
        const localQ = localEntry ? localEntry.question : null;

        let finalQuestion = cloudQ;
        if (localQ && isQuestionComplete(localQ) && !isQuestionComplete(cloudQ)) {
          finalQuestion = localQ;
        }
        merged[id] = { ...cloudEntry, question: finalQuestion };
      }

      // 疊加真正待上傳的離線新增
      return { ...merged, ...pendingAdds };
    });

    hasSyncedFromCloudRef.current = true;
  }, [leaderboardData, userName]);

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(wrongBook)); }
    catch (e) {}
  }, [wrongBook, storageKey]);

  const sendOp = useCallback(async (action, extra) => {
    if (!userName || userName === "訪客 (未登入)") return;
    const body = { action, name: getCanonicalName(userName), ...extra };

    if (!isOnline) {
      pendingOpsRef.current.push(body);
      return;
    }
    try {
      await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.warn("錯題簿同步失敗，排進佇列:", e);
      pendingOpsRef.current.push(body);
    }
  }, [userName, isOnline]);

  useEffect(() => {
    if (!isOnline || !userName || userName === "訪客 (未登入)") return;
    if (pendingOpsRef.current.length === 0) return;

    const queue = pendingOpsRef.current.slice();
    pendingOpsRef.current = [];

    Promise.all(queue.map(op =>
      fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(op)
      }).catch(() => { pendingOpsRef.current.push(op); })
    )).then(() => {
      if (refetchLeaderboard && pendingOpsRef.current.length === 0) {
        setTimeout(refetchLeaderboard, 1500);
      }
    });
  }, [isOnline, userName, refetchLeaderboard]);

  const addWrong = useCallback((question) => {
    const id = getQuestionId(question);
    if (!id || !userName || userName === "訪客 (未登入)") return;

    // 🆕 深拷貝，避免後續題庫物件被修改影響錯題簿
    let snapshot;
    try {
      snapshot = JSON.parse(JSON.stringify(question));
    } catch (e) {
      snapshot = { ...question };
    }

    // 🆕 存入前驗證完整性，若殘缺直接警告（不寫入錯題簿）
    if (!isQuestionComplete(snapshot)) {
      console.warn('[WrongBook] 題目資料不完整，跳過加入錯題簿:', snapshot);
      return;
    }

    setWrongBook(prev => {
      const existing = prev[id];
      const keptQuestion = existing && isQuestionComplete(existing.question)
        ? existing.question
        : snapshot;
      return {
        ...prev,
        [id]: {
          question: keptQuestion,
          correctStreak: 0,
          wrongCount: existing ? (existing.wrongCount || 0) + 1 : 1,
          addedAt: existing ? existing.addedAt : Date.now(),
          lastWrongAt: Date.now(),
          note: existing ? (existing.note || '') : '',        // 🆕 自訂筆記
          tags: existing ? (existing.tags || []) : []         // 🆕 錯誤類型標籤
        }
      };
    });
    sendOp('wrongbook_add', { questionId: id, questionData: snapshot });
}, [userName, sendOp]);

  const recordReviewAnswer = useCallback((question, isCorrect) => {
    const id = getQuestionId(question);
    if (!id) return { removed: false, newStreak: 0 };

    // 🆕 用 ref 在 setState callback 外捕獲結果,避免把 wrongBook 列入依賴
    //     這樣 callback 不會在每次答題後重建,FlashCard 也不會被迫重新 render
    let info = { removed: false, newStreak: 0 };

    setWrongBook(prev => {
      const entry = prev[id];
      if (!entry) {
        info = { removed: false, newStreak: 0 };
        return prev;
      }

      if (isCorrect) {
        const newStreak = (entry.correctStreak || 0) + 1;
        if (newStreak >= CONFIG.WRONG_BOOK_MASTERY_THRESHOLD) {
          info = { removed: true, newStreak };
          const { [id]: _, ...rest } = prev;
          return rest;
        } else {
          info = { removed: false, newStreak };
          return {
            ...prev,
            [id]: { ...entry, correctStreak: newStreak, lastReviewAt: Date.now() }
          };
        }
      } else {
        info = { removed: false, newStreak: 0 };
        return {
          ...prev,
          [id]: { ...entry, correctStreak: 0, lastReviewAt: Date.now(), lastWrongAt: Date.now() }
        };
      }
    });

    sendOp('wrongbook_review', {
      questionId: id,
      isCorrect,
      threshold: CONFIG.WRONG_BOOK_MASTERY_THRESHOLD
    });

    return info;
  }, [sendOp]);

  const removeFromBook = useCallback((questionId) => {
    setWrongBook(prev => {
      const { [questionId]: _, ...rest } = prev;
      return rest;
    });
    sendOp('wrongbook_remove', { questionId });
  }, [sendOp]);

  const updateNote = useCallback((questionId, note, tags) => {
    setWrongBook(prev => {
      const entry = prev[questionId];
      if (!entry) return prev;
      return { ...prev, [questionId]: { ...entry, note, tags } };
    });
    // 🆕 筆記只存本地，不同步雲端（節省 API 配額）
  }, []);

  const count = Object.keys(wrongBook).length;
  return { wrongBook, count, addWrong, recordReviewAnswer, removeFromBook, updateNote };
}

function useLeaderboard(userName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = userName && userName !== "訪客 (未登入)"
        ? `${CONFIG.GOOGLE_SCRIPT_URL}?user=${encodeURIComponent(userName)}`
        : CONFIG.GOOGLE_SCRIPT_URL;
      const res = await fetch(url);
      const text = await res.text();
      setData(JSON.parse(text));
    } catch (e) {
      console.error("❌ [Leaderboard] 抓取失敗:", e);
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, error, refetch };
}

function useQuestionPool() {
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api.fetchQuestions()
      .then(data => {
        if (!Array.isArray(data)) throw new Error("題庫格式異常");
        setPool(data);
      })
      .catch(err => {
        console.error("載入題庫失敗:", err);
        setError(err.message || String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { pool, loading, error, reload };
}

function useGoogleSignIn(userName, onSignIn) {
  const toast = useToast();
  useEffect(() => {
    if (userName) return;
    let attempts = 0;
    let timer;
    const tryInit = () => {
      attempts++;
      if (attempts > CONFIG.GOOGLE_SIGNIN_MAX_ATTEMPTS) {
        clearInterval(timer);
        console.warn("Google Sign-In 載入失敗：超過最大嘗試次數");
        toast("Google 登入服務載入失敗，請檢查網路或廣告攔截器後重新整理頁面", "warning", 6000);
        return;
      }

      const btn = document.getElementById("googleSignInDiv");
      if (!window.google || !btn) return;

      window.google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        hosted_domain: CONFIG.ALLOWED_EMAIL_DOMAIN.replace('@', ''),
        auto_select: true,
        callback: (response) => {
          const payload = decodeJwtResponse(response.credential);
          if (payload.email && payload.email.endsWith(CONFIG.ALLOWED_EMAIL_DOMAIN)) {
            onSignIn(payload.name);
            if (window.google) window.google.accounts.id.cancel();
          } else {
            toast(`登入失敗：請使用學校的 ${CONFIG.ALLOWED_EMAIL_DOMAIN} 帳號登入`, "error", 5000);
            window.google.accounts.id.revoke(payload.email, () => {});
          }
        }
      });
      window.google.accounts.id.renderButton(btn, { theme: "outline", size: "large", width: "100%", text: "continue_with" });
      window.google.accounts.id.prompt();
      clearInterval(timer);
    };
    timer = setInterval(tryInit, 100);
    return () => clearInterval(timer);
  }, [userName, onSignIn, toast]);
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, justReconnected };
}

function useImagePreload(questions, currentIndex, ahead = CONFIG.PRELOAD_AHEAD) {
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    const end = Math.min(currentIndex + ahead, questions.length - 1);
    for (let i = currentIndex + 1; i <= end; i++) {
      const urls = collectImageUrls(questions[i]);
      for (let j = 0; j < urls.length; j++) preloadImage(urls[j]);
    }
  }, [questions, currentIndex, ahead]);
}

function useAntiCheat(gameState, currentIndex, isWrongBookMode) {
  const toast = useToast();
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const questionStartTimeRef = useRef(Date.now());
  const perQuestionTimesRef  = useRef([]);
  const hasWarnedRef         = useRef(false);

  useEffect(() => {
    if (gameState !== 'playing' || isWrongBookMode) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount(c => c + 1);
      } else if (CONFIG.ANTI_CHEAT.warnOnTabSwitch && !hasWarnedRef.current) {
        toast('⚠️ 偵測到離開頁面！請勿切換視窗或查閱外部資料，否則本次成績可能不被記錄。', 'warning', 5000);
        hasWarnedRef.current = true;
        setTimeout(() => { hasWarnedRef.current = false; }, 10000);
      }
    };

    const handleBlur = () => {
      if (!document.hidden) setTabSwitchCount(c => c + 1);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, isWrongBookMode, toast]);

  useEffect(() => {
    if (gameState === 'playing') {
      questionStartTimeRef.current = Date.now();
    }
  }, [currentIndex, gameState]);

  const recordAnswerTime = useCallback(() => {
    const elapsed = Date.now() - questionStartTimeRef.current;
    perQuestionTimesRef.current.push(elapsed);
    questionStartTimeRef.current = Date.now();
  }, []);

  const resetAntiCheat = useCallback(() => {
    setTabSwitchCount(0);
    perQuestionTimesRef.current = [];
    questionStartTimeRef.current = Date.now();
    hasWarnedRef.current = false;
  }, []);

  const getCheatReport = useCallback((timeUsed, accuracy) => {
  const reasons = [];
  const AC = CONFIG.ANTI_CHEAT;

  // 🆕 [C3 修復] 拆成兩個獨立條件：時間過短「或」正確率過低都算可疑
  //     原本用 && 只在「又快又錯」時才擋；現在「亂蒙到 50% 但 10 秒答完」也會被擋
  if (timeUsed <= AC.minTimeMs) {
    reasons.push(`整局時間過短（${(timeUsed/1000).toFixed(1)} 秒，低於最低 ${AC.minTimeMs/1000} 秒門檻）`);
  }
  if (accuracy < AC.minAccuracy) {
    reasons.push(`正確率過低（${(accuracy*100).toFixed(1)}%，低於最低 ${AC.minAccuracy*100}% 門檻）`);
  }

  let tooFast = 0;
  const times = perQuestionTimesRef.current;
  for (let i = 0; i < times.length; i++) {
    if (times[i] < AC.minTimePerQuestionMs) tooFast++;
  }
  if (tooFast >= AC.maxTooFastQuestions) {
    reasons.push(`有 ${tooFast} 題在 ${AC.minTimePerQuestionMs}ms 內秒答`);
  }

  if (tabSwitchCount > AC.maxTabSwitches) {
    reasons.push(`遊戲期間切換頁面/視窗 ${tabSwitchCount} 次`);
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    stats: { tabSwitchCount, tooFastCount: tooFast, timeUsed, accuracy }
  };
}, [tabSwitchCount]);

  return { tabSwitchCount, recordAnswerTime, resetAntiCheat, getCheatReport };  // 🆕 補這行
}           

