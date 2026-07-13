/* ============================================================================
 * 🆕 老師任務管理畫面
 * ============================================================================ */
function AssignmentAdminScreen({ onBack, leaderboardData, currentUserName, onViewReport, onRefresh }) {
  const toast = useToast();
  const [title, setTitle] = useState('本週任務');
  const [count, setCount] = useState(20);
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  // 🆕 自動循環設定
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  // 🆕 任務類型
  const [taskType, setTaskType] = useState('standard');         // standard | speedrun
  const [timeLimitMin, setTimeLimitMin] = useState(10);         // 限時（分鐘）
  const [targetCorrect, setTargetCorrect] = useState(15);       // 目標答對題數

  /* 🆕 範圍選擇器（仿主頁 UI） */
  const [enableCore, setEnableCore]             = useState(true);
  const [selectedChapters, setSelectedChapters] = useState([25]);
  const [enableElective, setEnableElective]     = useState(false);
  const [selectedElectives, setSelectedElectives] = useState([]);

 /* 🆕 目標學生選擇 */
  const [targetType, setTargetType]               = useState('All'); // All | F4 | F5 | F6 | Individual
  const [selectedStudents, setSelectedStudents]   = useState([]);
  const [studentSearch, setStudentSearch]         = useState('');
  const [studentFormFilter, setStudentFormFilter] = useState('All'); // 🆕 'All' | '4' | '5' | '6'

  /* 🆕 本地 assignments 狀態（樂觀更新用，立刻反映到 UI） */
  const [localAssignments, setLocalAssignments] = useState(
    () => (leaderboardData && leaderboardData.assignments) || []
  );

  /* 🆕 編輯模式：null = 建立新任務；object = 正在編輯現有任務 */
  const [editingAssignment, setEditingAssignment] = useState(null);

  /* 當雲端資料更新時同步本地狀態 */
  useEffect(() => {
    if (leaderboardData && leaderboardData.assignments) {
      setLocalAssignments(leaderboardData.assignments);
    }
  }, [leaderboardData]);

  const assignments = localAssignments;

  /* 全校學生清單（排除訪客與老師） */
  const allStudents = useMemo(() => {
    const users = (leaderboardData && leaderboardData.users) || [];
    return users
      .map(u => String(u[0] || '').trim())
      .filter(n => n && n !== '訪客 (未登入)' && !isTeacher(n))
      .sort();
  }, [leaderboardData]);

  /* 依年級分組學生（顯示用）*/
  const studentsByForm = useMemo(() => {
    const groups = { '4': [], '5': [], '6': [], 'other': [] };
    for (let i = 0; i < allStudents.length; i++) {
      const s = allStudents[i];
      const f = getStudentForm(s);
      if (f === '4' || f === '5' || f === '6') groups[f].push(s);
      else groups.other.push(s);
    }
    return groups;
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    let list = allStudents;

    // 🆕 先依年級過濾
    if (studentFormFilter !== 'All') {
      list = list.filter(s => getStudentForm(s) === studentFormFilter);
    }

    // 再依關鍵字過濾
    if (studentSearch.trim()) {
      const kw = studentSearch.toLowerCase();
      list = list.filter(s =>
        String(s).toLowerCase().includes(kw) ||
        shortenName(s).toLowerCase().includes(kw)
      );
    }
    return list;
  }, [allStudents, studentSearch, studentFormFilter]);

  const toggleChapter = useCallback((num) => {
    setSelectedChapters(prev =>
      prev.includes(num) ? prev.filter(c => c !== num) : [...prev, num].sort((a, b) => a - b)
    );
  }, []);

  const toggleElective = useCallback((code) => {
    setSelectedElectives(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code].sort()
    );
  }, []);

  const toggleStudent = useCallback((name) => {
    setSelectedStudents(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  }, []);

  const selectFormStudents = useCallback((form) => {
    const list = studentsByForm[form] || [];
    setSelectedStudents(prev => {
      const set = new Set(prev);
      for (let i = 0; i < list.length; i++) set.add(list[i]);
      return Array.from(set);
    });
  }, [studentsByForm]);

  const buildScope = () => {
    const parts = [];
    if (enableCore && selectedChapters.length > 0) {
      parts.push(selectedChapters.map(c => `Ch.${c}`).join(','));
    }
    if (enableElective && selectedElectives.length > 0) {
      parts.push(selectedElectives.join(','));
    }
    return parts.join('|');
  };

  const buildTargetDesc = () => {
    if (targetType === 'All') return '全校';
    if (targetType === 'F4') return '中四 (F.4)';
    if (targetType === 'F5') return '中五 (F.5)';
    if (targetType === 'F6') return '中六 (F.6)';
    if (targetType === 'Individual') return `${selectedStudents.length} 位指定學生`;
    return '全校';
  };

  const handleCreate = async () => {
    if (!title.trim()) return toast('請輸入任務標題', 'warning', 3000);
    const scopeStr = buildScope();
    if (!scopeStr) return toast('請至少選擇一個章節或選修單元', 'warning', 3000);
    const cnt = Number(count);
    if (!cnt || cnt < 1 || cnt > 100) return toast('題數必須介於 1-100', 'warning', 3000);
    if (targetType === 'Individual' && selectedStudents.length === 0) {
      return toast('請至少選擇一位學生', 'warning', 3000);
    }

    let targetForm = 'All';
    let targetStudentList = [];
    if (targetType === 'F4') targetForm = '4';
    else if (targetType === 'F5') targetForm = '5';
    else if (targetType === 'F6') targetForm = '6';
    else if (targetType === 'Individual') targetStudentList = selectedStudents;

    setCreating(true);
    try {
      const result = await api.createAssignment({
        title: title.trim(),
        scope: scopeStr,
        questionCount: cnt,
        dueDate,
        createdBy: currentUserName,
        targetForm,
        targetStudents: targetStudentList,
        recurrence,
        recurrenceEndDate,
        // 🆕 任務類型欄位
        taskType,
        timeLimitMin: taskType === 'speedrun' ? Number(timeLimitMin) : null,
        targetCorrect: taskType === 'speedrun' ? Number(targetCorrect) : null
      });
      if (result.success) {
        toast(`🎉 任務成功！派給：${buildTargetDesc()}`, 'success', 4000);

        /* 🆕 樂觀更新：立即把新任務加進本地清單 */
        const optimistic = {
          id: result.id || `tmp_${Date.now()}`,
          title: title.trim(),
          scope: scopeStr,
          questionCount: cnt,
          dueDate,
          createdBy: currentUserName,
          targetForm,
          targetStudents: targetStudentList,
          active: true
        };
        setLocalAssignments(prev => [optimistic, ...prev]);

        // 重置表單
        setTitle('本週任務');
        setSelectedChapters([25]);
        setSelectedElectives([]);
        setEnableCore(true);
        setEnableElective(false);
        setCount(20);
        setDueDate('');
        setTargetType('All');
        setSelectedStudents([]);
        setRecurrence('none');         // 🆕
        setRecurrenceEndDate('');      // 🆕

        // 🆕 延遲拉雲端資料（給 Google Sheets 寫入時間）
        setTimeout(() => onRefresh(), 1800);
      } else {
        toast('任務失敗：' + (result.error || '未知錯誤'), 'error', 4000);
      }
    } catch (e) {
      console.error(e);
      toast('任務失敗，請檢查網路或 Apps Script 部署', 'error', 4000);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (a) => {
    if (!confirm(`確定要停用任務「${a.title}」嗎？\n停用後學生將看不到此任務。`)) return;
    try {
      await api.toggleAssignment(a.id, false);
      toast('已停用任務', 'info', 2500);

      /* 🆕 樂觀更新：立即從本地清單移除 */
      setLocalAssignments(prev => prev.filter(x => x.id !== a.id));

      setTimeout(() => onRefresh(), 1500);
    } catch (e) {
      toast('操作失敗', 'error', 3000);
    }
  };

  /* 🆕 點擊「編輯」：把該任務資料填入表單 */
  const handleEdit = (a) => {
    setEditingAssignment(a);
    setTitle(a.title || '');
    setCount(a.questionCount || 20);
    setDueDate(a.dueDate ? String(a.dueDate).slice(0, 10) : '');
    setRecurrence(a.recurrence || 'none');
    setRecurrenceEndDate(a.recurrenceEndDate ? String(a.recurrenceEndDate).slice(0, 10) : '');
    setTaskType(a.taskType || 'standard');
    setTimeLimitMin(a.timeLimitMin || 10);
    setTargetCorrect(a.targetCorrect || 15);

    // 解析 scope → 章節 + 選修
    const scopeParts = (a.scope || '').split('|');
    const chapters = (scopeParts[0] || '')
      .split(',').map(c => parseInt(c.replace('Ch.', ''), 10)).filter(n => !isNaN(n));
    const electives = (scopeParts[1] || '').split(',').filter(Boolean);
    setEnableCore(chapters.length > 0);
    setSelectedChapters(chapters.length > 0 ? chapters : [25]);
    setEnableElective(electives.length > 0);
    setSelectedElectives(electives);

    // 解析 targetType
    if (a.targetStudents && Array.isArray(a.targetStudents) && a.targetStudents.length > 0) {
      setTargetType('Individual'); setSelectedStudents(a.targetStudents);
    } else if (a.targetForm === '4') { setTargetType('F4'); setSelectedStudents([]); }
    else if (a.targetForm === '5') { setTargetType('F5'); setSelectedStudents([]); }
    else if (a.targetForm === '6') { setTargetType('F6'); setSelectedStudents([]); }
    else { setTargetType('All'); setSelectedStudents([]); }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* 🆕 取消編輯：重置表單回預設 */
  const cancelEdit = () => {
    setEditingAssignment(null);
    setTitle('本週任務'); setCount(20); setDueDate('');
    setTargetType('All'); setSelectedStudents([]);
    setRecurrence('none'); setRecurrenceEndDate('');
    setTaskType('standard'); setTimeLimitMin(10); setTargetCorrect(15);
    setSelectedChapters([25]); setSelectedElectives([]);
    setEnableCore(true); setEnableElective(false);
  };

  /* 🆕 更新現有任務 */
  const handleUpdate = async () => {
    if (!title.trim()) return toast('請輸入任務標題', 'warning', 3000);
    const scopeStr = buildScope();
    if (!scopeStr) return toast('請至少選擇一個章節或選修單元', 'warning', 3000);
    const cnt = Number(count);
    if (!cnt || cnt < 1 || cnt > 100) return toast('題數必須介於 1-100', 'warning', 3000);
    if (targetType === 'Individual' && selectedStudents.length === 0)
      return toast('請至少選擇一位學生', 'warning', 3000);

    let targetForm = 'All', targetStudentList = [];
    if (targetType === 'F4') targetForm = '4';
    else if (targetType === 'F5') targetForm = '5';
    else if (targetType === 'F6') targetForm = '6';
    else if (targetType === 'Individual') targetStudentList = selectedStudents;

    setCreating(true);
    try {
      const result = await api.updateAssignment({
        assignmentId: editingAssignment.id,
        title: title.trim(), scope: scopeStr, questionCount: cnt,
        dueDate, targetForm, targetStudents: targetStudentList,
        recurrence, recurrenceEndDate, taskType,
        timeLimitMin: taskType === 'speedrun' ? Number(timeLimitMin) : null,
        targetCorrect: taskType === 'speedrun' ? Number(targetCorrect) : null
      });
      if (result.success) {
        toast('✅ 任務已更新！', 'success', 3000);
        setLocalAssignments(prev => prev.map(x =>
          x.id === editingAssignment.id
            ? { ...x, title: title.trim(), scope: scopeStr, questionCount: cnt,
                dueDate, targetForm, targetStudents: targetStudentList }
            : x
        ));
        cancelEdit();
        setTimeout(() => onRefresh(), 1800);
      } else {
        toast('更新失敗：' + (result.error || '未知錯誤'), 'error', 4000);
      }
    } catch (e) {
      console.error(e);
      toast('更新失敗，請檢查網路或 Apps Script 部署', 'error', 4000);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-3xl px-4 pb-10">
      <div className="glass-panel p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-paper-plane text-pink-500"></i>任務管理
          </h2>
          <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 px-3 py-1 rounded-full font-bold">
            <i className="fas fa-user-tie mr-1"></i>{shortenName(currentUserName)}
          </span>
        </div>

        <div className={`mb-6 p-4 rounded-xl border ${editingAssignment ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800'}`}>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            {editingAssignment
              ? <><i className="fas fa-edit text-blue-500"></i>編輯任務：{editingAssignment.title}</>
              : <><i className="fas fa-plus-circle text-pink-500"></i>建立新任務</>}
          </h3>

          {/* 任務標題 / 題數 / 截止日 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">任務標題</label>
              <input className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
                placeholder="例：第三週 Ch.25 練習" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">題數</label>
              <input type="number" min="1" max="100"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
                value={count} onChange={e => setCount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">截止日期 <span className="text-gray-400">(選填)</span></label>
              <input type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm"
                value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* 🆕 自動循環設定 */}
          <div className="mb-3 border rounded-xl p-3 bg-white dark:bg-gray-800 border-cyan-200 dark:border-cyan-800">
            <label className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2 mb-2">
              <i className="fas fa-repeat text-cyan-500"></i>自動循環
              <span className="text-xs font-normal text-gray-400">（系統會自動派發新一輪任務）</span>
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[
                { id: 'none',    label: '不循環', icon: '🚫' },
                { id: 'daily',   label: '每日',   icon: '📅' },
                { id: 'weekly',  label: '每週',   icon: '🗓️' },
                { id: 'monthly', label: '每月',   icon: '📆' }
              ].map(opt => (
                <button key={opt.id} onClick={() => setRecurrence(opt.id)}
                  className={`text-xs py-2 px-3 rounded-md transition-all font-medium flex items-center gap-1 ${
                    recurrence === opt.id
                      ? 'bg-cyan-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-cyan-100 dark:hover:bg-gray-600'
                  }`}>
                  <span>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
            {recurrence !== 'none' && (
              <div className="mt-2 pt-2 border-t border-cyan-200">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">
                  循環結束日 <span className="text-gray-400">(選填，留白則持續循環)</span>
                </label>
                <input type="date"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} />
                <div className="mt-2 text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 p-2 rounded">
                  <i className="fas fa-info-circle mr-1"></i>
                  系統將每{recurrence === 'daily' ? '日' : recurrence === 'weekly' ? '週' : '月'}自動建立同樣設定的新任務
                  {recurrenceEndDate && `，至 ${recurrenceEndDate} 為止`}
                </div>
              </div>
            )}
          </div>

          {/* 🆕 任務類型選擇 */}
          <div className="mb-3 border rounded-xl p-3 bg-white dark:bg-gray-800 border-rose-200 dark:border-rose-800">
            <label className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2 mb-2">
              <i className="fas fa-flag-checkered text-rose-500"></i>任務類型
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              <button onClick={() => setTaskType('standard')}
                className={`flex-1 min-w-[140px] text-left p-3 rounded-lg border-2 transition-all ${
                  taskType === 'standard'
                    ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-400 dark:border-rose-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-rose-200'
                }`}>
                <div className="font-bold text-sm text-gray-800 dark:text-gray-100">📝 標準練習</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">完成指定題數即可</div>
              </button>
              <button onClick={() => setTaskType('speedrun')}
                className={`flex-1 min-w-[140px] text-left p-3 rounded-lg border-2 transition-all ${
                  taskType === 'speedrun'
                    ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-400 dark:border-rose-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-rose-200'
                }`}>
                <div className="font-bold text-sm text-gray-800 dark:text-gray-100">⏱️ 限時答對</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">在時限內答對指定題數</div>
              </button>
            </div>

            {taskType === 'speedrun' && (
              <div className="mt-2 pt-2 border-t border-rose-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">時間限制（分鐘）</label>
                  <input type="number" min="1" max="120" value={timeLimitMin}
                    onChange={e => setTimeLimitMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">目標答對題數</label>
                  <input type="number" min="1" max="100" value={targetCorrect}
                    onChange={e => setTargetCorrect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
                </div>
                <div className="col-span-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                  <i className="fas fa-stopwatch mr-1"></i>
                  學生需在 <b>{timeLimitMin} 分鐘</b>內答對 <b>{targetCorrect} 題</b>才算過關
                </div>
              </div>
            )}
          </div>

          {/* 🆕 範圍選擇器（核心課題） */}
          <div className={`mb-3 border rounded-xl p-3 transition-all ${enableCore ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-700' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
            <label className="flex items-center justify-between cursor-pointer mb-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={enableCore}
                  onChange={(e) => setEnableCore(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"/>
                <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">核心課題 (Core)</span>
              </div>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full">
                Ch.{CONFIG.CHAPTER_RANGE.start} - {CONFIG.CHAPTER_RANGE.end}
              </span>
            </label>
            {enableCore && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs ${selectedChapters.length < 1 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    已選: {selectedChapters.length} 課
                  </span>
                  <div className="space-x-2">
                    <button onClick={() => setSelectedChapters([...ALL_CHAPTERS])} className="text-xs text-indigo-600 hover:underline">全選</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setSelectedChapters([])} className="text-xs text-gray-500 hover:underline">清空</button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {ALL_CHAPTERS.map(num => (
                    <button key={num} onClick={() => toggleChapter(num)}
                      className={`text-xs py-1.5 rounded-md transition-all ${
                        selectedChapters.includes(num)
                          ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200'
                      }`}>
                      Ch.{num}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 🆕 範圍選擇器（選修單元） */}
          <div className={`mb-3 border rounded-xl p-3 transition-all ${enableElective ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
            <label className="flex items-center justify-between cursor-pointer mb-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={enableElective}
                  onChange={(e) => setEnableElective(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"/>
                <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">選修單元 (Elective)</span>
              </div>
              <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                {CONFIG.ELECTIVES.join(', ')}
              </span>
            </label>
            {enableElective && (
              <div className="mt-2 pt-2 border-t border-green-200/50">
                <div className="flex gap-2 flex-wrap">
                  {CONFIG.ELECTIVES.map(code => (
                    <button key={code} onClick={() => toggleElective(code)}
                      className={`text-sm py-2 px-4 rounded-md transition-all font-medium ${
                        selectedElectives.includes(code)
                          ? 'bg-green-600 text-white shadow-md transform scale-105'
                          : 'bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-gray-700'
                      }`}>
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 🆕 目標學生選擇 */}
          <div className="mb-3 border rounded-xl p-3 bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800">
            <label className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2 mb-2">
              <i className="fas fa-bullseye text-amber-500"></i>任務對象
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[
                { id: 'All', label: '全校' },
                { id: 'F4',  label: '中四 (F.4)' },
                { id: 'F5',  label: '中五 (F.5)' },
                { id: 'F6',  label: '中六 (F.6)' },
                { id: 'Individual', label: '個別學生' }
              ].map(opt => (
                <button key={opt.id} onClick={() => setTargetType(opt.id)}
                  className={`text-xs py-2 px-3 rounded-md transition-all font-medium ${
                    targetType === opt.id
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {targetType === 'Individual' && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  placeholder="🔍 搜尋學生姓名..."
                  className="w-full px-3 py-1.5 mb-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />

                {/* 🆕 年級過濾頁籤 */}
                <div className="flex gap-1 mb-2 flex-wrap">
                  {[
                    { id: 'All', label: '全部', count: allStudents.length },
                    { id: '4',   label: '中四同學', count: studentsByForm['4'].length },
                    { id: '5',   label: '中五同學', count: studentsByForm['5'].length },
                    { id: '6',   label: '中六同學', count: studentsByForm['6'].length }
                  ].map(f => (
                    <button key={f.id} onClick={() => setStudentFormFilter(f.id)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition-all flex items-center gap-1 ${
                        studentFormFilter === f.id
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-600'
                      }`}>
                      {f.label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        studentFormFilter === f.id
                          ? 'bg-white/30'
                          : 'bg-white dark:bg-gray-800'
                      }`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 🆕 快捷操作（依當前過濾結果操作）*/}
                <div className="flex gap-2 flex-wrap mb-2 text-xs items-center">
                  <button
                    onClick={() => {
                      setSelectedStudents(prev => {
                        const set = new Set(prev);
                        for (let i = 0; i < filteredStudents.length; i++) set.add(filteredStudents[i]);
                        return Array.from(set);
                      });
                    }}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded hover:bg-green-200 font-medium">
                    <i className="fas fa-check-double mr-1"></i>全選當前 {filteredStudents.length} 人
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStudents(prev => {
                        const removeSet = new Set(filteredStudents);
                        return prev.filter(s => !removeSet.has(s));
                      });
                    }}
                    className="px-2 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200">
                    取消當前
                  </button>
                  <button onClick={() => setSelectedStudents([])} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200">
                    全部清空
                  </button>
                  <span className={`ml-auto px-2 py-1 rounded font-bold ${selectedStudents.length === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    已選 {selectedStudents.length} 人
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 gap-1 p-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                  {filteredStudents.length === 0 ? (
                    <div className="col-span-full text-center text-gray-400 text-xs py-4">沒有符合的學生</div>
                  ) : filteredStudents.map(s => (
                    <button key={s} onClick={() => toggleStudent(s)}
                      className={`text-left text-xs px-2 py-1 rounded transition-all truncate ${
                        selectedStudents.includes(s)
                          ? 'bg-amber-500 text-white font-bold'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}>
                      {selectedStudents.includes(s) && <i className="fas fa-check mr-1"></i>}
                      {shortenName(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              <i className="fas fa-info-circle mr-1"></i>
              此任務將派給：<b>{buildTargetDesc()}</b>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {editingAssignment && (
              <button onClick={cancelEdit} disabled={creating}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-lg transition flex items-center justify-center gap-2">
                <i className="fas fa-times"></i>取消編輯
              </button>
            )}
            <button onClick={editingAssignment ? handleUpdate : handleCreate} disabled={creating}
              className={`flex-1 py-2.5 disabled:opacity-50 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 ${editingAssignment ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600' : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'}`}>
              {creating
                ? <><i className="fas fa-spinner fa-spin"></i>{editingAssignment ? '更新中...' : '建立中...'}</>
                : editingAssignment
                  ? <><i className="fas fa-save"></i>儲存更新</>
                  : <><i className="fas fa-paper-plane"></i>派發任務</>}
            </button>
          </div>
        </div>

        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <i className="fas fa-list text-indigo-500"></i>已派發的任務
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
            {assignments.length} 份
          </span>
          <button onClick={() => onRefresh()} title="手動刷新"
            className="ml-auto text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded">
            <i className="fas fa-sync-alt mr-1"></i>刷新
          </button>
        </h3>

        {assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <i className="fas fa-inbox text-3xl mb-2"></i>
            <p className="text-sm">尚未建立任何任務</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {assignments.map(a => {
              let targetLabel = '全校';
              if (a.targetStudents && Array.isArray(a.targetStudents) && a.targetStudents.length > 0) {
                targetLabel = `${a.targetStudents.length} 位指定學生`;
              } else if (a.targetForm && a.targetForm !== 'All') {
                targetLabel = `中${{'4':'四','5':'五','6':'六'}[a.targetForm] || a.targetForm}`;
              }
              return (
                <div key={a.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 dark:text-gray-100 truncate">{a.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">
                      <span className="font-mono truncate max-w-xs" title={a.scope}>
                        {formatScopeShort(a.scope)}
                      </span>
                      <span>· {a.questionCount} 題</span>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        <i className="fas fa-bullseye mr-0.5"></i>{targetLabel}
                      </span>
                      {a.dueDate && (
                        <span className="text-red-500">
                          <i className="fas fa-clock mr-0.5"></i>{String(a.dueDate).slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => onViewReport(a)}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded transition">
                      <i className="fas fa-chart-bar mr-1"></i>成績單
                    </button>
                    <button onClick={() => handleEdit(a)} title="編輯此任務"
                      className="px-2 py-1.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 text-xs rounded transition">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleToggle(a)} title="停用此任務"
                      className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-500 hover:text-red-500 text-xs rounded transition">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={onBack} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>返回主頁
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * 🆕 任務成績單畫面
 * ============================================================================ */
function AssignmentReportScreen({ assignment, onBack, leaderboardData }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAssignmentReport(assignment.id)
      .then(d => setReport(d.submissions || []))
      .catch(() => setReport([]))
      .finally(() => setLoading(false));
  }, [assignment.id]);

  const allStudents = useMemo(() => {
    const users = (leaderboardData && leaderboardData.users) || [];
    let candidates = users
      .map(u => String(u[0] || '').trim())
      .filter(n => n && n !== '訪客 (未登入)' && !isTeacher(n));

    // 🆕 依任務目標過濾「應交名單」
    if (assignment.targetStudents && Array.isArray(assignment.targetStudents) && assignment.targetStudents.length > 0) {
      // 個別學生：只保留指派名單中的學生
      const targetSet = new Set(
        assignment.targetStudents.map(t => shortenName(String(t || '')).toLowerCase())
      );
      candidates = candidates.filter(n => targetSet.has(shortenName(n).toLowerCase()));
    } else if (assignment.targetForm && assignment.targetForm !== 'All') {
      // 年級任務：只保留指定年級的學生
      candidates = candidates.filter(n => getStudentForm(n) === String(assignment.targetForm));
    }
    // 全校任務（'All' 或無設定）→ 保留全部，不變
    return candidates;
  }, [leaderboardData, assignment]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl px-4 pb-10">
        <div className="glass-panel p-10 rounded-2xl shadow-xl text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-3"></i>
          <p className="text-gray-600 dark:text-gray-300">成績單載入中...</p>
        </div>
      </div>
    );
  }

  const submittedNames = new Set((report || []).map(r => shortenName(r.studentName).toLowerCase()));
  const notSubmitted = allStudents.filter(n => !submittedNames.has(shortenName(n).toLowerCase()));

  const sorted = (report || []).slice().sort((a, b) => b.accuracy - a.accuracy);
  const avgAcc = sorted.length > 0 ? sorted.reduce((s, r) => s + r.accuracy, 0) / sorted.length : 0;
  const avgTime = sorted.length > 0 ? sorted.reduce((s, r) => s + r.timeMs, 0) / sorted.length : 0;
  const submittedRate = allStudents.length > 0 ? Math.round(sorted.length / allStudents.length * 100) : 0;

  return (
    <div className="w-full max-w-4xl px-4 pb-10">
      <div className="glass-panel p-6 rounded-2xl shadow-xl">
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 flex-wrap">
            <i className="fas fa-clipboard-check text-indigo-500"></i>{assignment.title}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">· 全班成績單</span>
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-mono break-all" title={assignment.scope}>
              {formatScopeShort(assignment.scope, 6)}
            </span> · {assignment.questionCount} 題
            {assignment.dueDate && <span className="ml-2">· 截止 {String(assignment.dueDate).slice(0, 10)}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPICard icon="✅" label="已交人數" value={`${sorted.length}/${allStudents.length}`} sub={`繳交率 ${submittedRate}%`} color={submittedRate >= 80 ? 'green' : submittedRate >= 50 ? 'orange' : 'red'} />
          <KPICard icon="🎯" label="平均正確率" value={`${avgAcc.toFixed(1)}%`} color={avgAcc >= 75 ? 'green' : avgAcc >= 60 ? 'orange' : 'red'} />
          <KPICard icon="⏱️" label="平均用時" value={formatTime(avgTime)} color="blue" />
          <KPICard icon="❌" label="未交人數" value={notSubmitted.length} color={notSubmitted.length === 0 ? 'green' : 'red'} />
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4">
            <i className="fas fa-inbox text-3xl text-gray-400 mb-2"></i>
            <p className="text-gray-500 dark:text-gray-400 text-sm">尚未有學生提交</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar mb-6">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700 text-xs">
                  <th className="text-left py-2 px-2 w-10">#</th>
                  <th className="text-left py-2 px-2">學生</th>
                  <th className="text-right py-2 px-2">分數</th>
                  <th className="text-right py-2 px-2">正確率</th>
                  <th className="text-right py-2 px-2">用時</th>
                  <th className="text-right py-2 px-2">提交時間</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-2 font-bold text-gray-400">{i + 1}</td>
                    <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-100">{shortenName(r.studentName)}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.score}/{r.total}</td>
                    <td className={`py-2 px-2 text-right font-bold ${r.accuracy >= 80 ? 'text-green-600 dark:text-green-400' : r.accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {r.accuracy}%
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">{formatTime(r.timeMs)}</td>
                    <td className="py-2 px-2 text-right text-[11px] text-gray-500">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {notSubmitted.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <div className="font-bold text-red-700 dark:text-red-300 mb-2 text-sm flex items-center gap-1">
              <i className="fas fa-exclamation-circle"></i>尚未繳交（{notSubmitted.length} 人）
            </div>
            <div className="flex flex-wrap gap-1">
              {notSubmitted.map((n, i) => (
                <span key={i} className="text-xs bg-white dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                  {shortenName(n)}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={onBack} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>返回任務管理
        </button>
      </div>
    </div>
  );
}

function resolveOptions(q) {
  if (!q) return [];
  if (Array.isArray(q.options) && q.options.length > 0) return q.options;
  const opts = [];
  // 🆕 掃完 0-7 所有槽位，避免中間 gap（例如 opt_1 為 undefined）導致截斷
  for (let i = 0; i < 8; i++) {
    const v = q[`opt_${i}`];
    if (v !== undefined && v !== null && String(v).length > 0) {
      opts.push(v);
    } else if (opts.length > 0) {
      // 已經收集到選項但遇到空槽，檢查後面是否還有實際選項
      let hasMore = false;
      for (let j = i + 1; j < 8; j++) {
        const v2 = q[`opt_${j}`];
        if (v2 !== undefined && v2 !== null && String(v2).length > 0) { hasMore = true; break; }
      }
      if (!hasMore) break;
      // 若後面還有選項，填入空字串佔位（避免 origIdx 對不上）
      opts.push('');
    }
  }
  return opts;
}

function resolveCorrectIndex(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!isNaN(n)) return n;
  const letter = String(raw).trim().toUpperCase();
  const idx = ['A','B','C','D','E','F'].indexOf(letter);
  return idx >= 0 ? idx : null;
}

/* 🆕 檢查題目物件是否包含答題所需的關鍵欄位
 * 回傳 true 代表資料完整，可用於答題與結算 */
function isQuestionComplete(q) {
  if (!q || typeof q !== 'object') return false;
  const opts = resolveOptions(q);
  if (opts.length < 2) return false;
  // 必須有 correctIndex 可解析，或至少有 answer 欄位
  const ci = resolveCorrectIndex(q.correctIndex);
  if (ci !== null && ci >= 0 && ci < opts.length) return true;
  if (q.answer !== undefined && q.answer !== null && String(q.answer).trim()) return true;
  return false;
}

const ReviewItem = memo(function ReviewItem({ idx, res, isExpanded, onToggle, imgRefreshKey = 0 }) {
  const qData = res.detail;
  const isRight = res.isCorrect;

  const cIdx = resolveCorrectIndex(qData.correctIndex);
  const resolvedOptions = resolveOptions(qData);

  // 🆕 預設提示改為更明確的訊息，方便診斷
  let correctAnsRawText = "⚠️ 題目資料殘缺，無法顯示正確答案";
  let correctAnsImg = null;

  if (cIdx !== null && resolvedOptions.length > 0 && resolvedOptions[cIdx] !== undefined && resolvedOptions[cIdx] !== null) {
    const raw = resolvedOptions[cIdx];
    const txt = String(raw).trim() ? String(raw) : "圖片選項";
    correctAnsRawText = `${String.fromCharCode(65 + cIdx)}. ${txt}`;
    correctAnsImg = qData[`opt_${cIdx}_img`];
  } else if (qData.answer !== undefined && qData.answer !== null && String(qData.answer).trim()) {
    correctAnsRawText = String(qData.answer).trim();
  } else if (cIdx !== null && resolvedOptions.length > 0) {
    correctAnsRawText = `${String.fromCharCode(65 + cIdx)}. 圖片選項`;
    correctAnsImg = qData[`opt_${cIdx}_img`];
  } else {
    // 🆕 開發環境下印出診斷訊息
    if (typeof console !== 'undefined') {
      console.warn('[ReviewItem] 題目資料殘缺:', {
        hasCorrectIndex: 'correctIndex' in qData,
        correctIndex: qData.correctIndex,
        hasAnswer: 'answer' in qData,
        answer: qData.answer,
        optionsCount: resolvedOptions.length,
        allKeys: Object.keys(qData)
      });
    }
  }

  let userOptText = res.userAnswer || "";
  const userOptImg = res.userSelectedIndex !== undefined && res.userSelectedIndex !== null
    ? qData[`opt_${res.userSelectedIndex}_img`]
    : null;
  if (res.userSelectedIndex !== undefined && res.userSelectedIndex !== null) {
    const letter = String.fromCharCode(65 + res.userSelectedIndex);
    const raw = String(userOptText);
    userOptText = `${letter}. ${raw.trim() ? raw : "圖片選項"}`;
  } else {
    userOptText = userOptText || "未作答/跳題";
  }

  return (
    <div className={`${isRight ? 'bg-green-50/30 dark:bg-green-900/10' : 'bg-red-50/30 dark:bg-red-900/10'}`}>
      <button onClick={onToggle} className="w-full p-4 flex items-start gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5 flex-shrink-0 ${
          isRight ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'}`}>
          {idx + 1}
        </span>
        <div className="flex-1 overflow-hidden min-w-0">
          <p className="text-gray-800 dark:text-gray-100 font-medium pr-2 break-words whitespace-pre-line">
            {formatText(qData.title || qData.question)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <i className={`fas ${isRight ? 'fa-check-circle text-green-500 dark:text-green-400' : 'fa-times-circle text-red-500 dark:text-red-400'} text-lg`}></i>
          <i className={`fas fa-chevron-down text-gray-400 dark:text-gray-500 text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-4 pb-4">
              {qData.question_img && (
                <div className="mb-3 flex justify-start">
                  <LoadingImage
                    src={qData.question_img}
                    className="max-h-32 object-contain rounded border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-100 p-1"
                    alt="題目圖片"
                    minHeight="min-h-[80px]"
                    refreshKey={imgRefreshKey}
                  />
                </div>
              )}

              <div className="text-sm mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${isRight
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                  <span className="text-xs opacity-70 block mb-1">你的選擇:</span>
                  <div className="flex flex-col">
                    <span className="font-medium whitespace-pre-line break-words">
                      {formatText(userOptText)}
                      {isRight ? <i className="fas fa-check-circle text-green-500 dark:text-green-400 ml-1.5"></i> : <i className="fas fa-times-circle text-red-500 dark:text-red-400 ml-1.5"></i>}
                    </span>
                    {userOptImg && (
                      <div className="mt-2">
                        <LoadingImage
                          src={userOptImg}
                          className="max-h-20 object-contain rounded bg-white dark:bg-gray-100 p-1 shadow-sm border border-gray-100 dark:border-gray-700"
                          alt="玩家選擇的圖片"
                          minHeight="min-h-[60px]"
                          refreshKey={imgRefreshKey}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {!isRight && (
                  <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                    <span className="text-xs opacity-70 block mb-1">正確答案:</span>
                    <div className="flex flex-col">
                      <span className="font-medium whitespace-pre-line break-words">
                        {formatText(correctAnsRawText)}
                      </span>
                      {correctAnsImg && (
                        <div className="mt-2">
                          <LoadingImage
                            src={correctAnsImg}
                            className="max-h-20 object-contain rounded bg-white dark:bg-gray-100 p-1 shadow-sm border border-gray-100 dark:border-gray-700"
                            alt="正確答案圖片"
                            minHeight="min-h-[60px]"
                            refreshKey={imgRefreshKey}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {qData.hint && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                  <i className="fas fa-info-circle mt-0.5 mr-1.5 text-indigo-400 dark:text-indigo-300"></i>
                  <span className="whitespace-pre-line break-words">{formatText(qData.hint)}</span>
                </p>
              )}

              {(qData.explanation || qData.explanation_img) && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg shadow-sm">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block mb-1">
                    <i className="fas fa-lightbulb text-yellow-500 dark:text-yellow-400 mr-1.5"></i>詳細解釋：
                  </span>
                  {qData.explanation && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed break-words">
                      {formatText(qData.explanation)}
                    </p>
                  )}
                  {qData.explanation_img && (
                    <div className="mt-2">
                      <LoadingImage
                        src={qData.explanation_img}
                        className="max-h-40 object-contain rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-100 p-1"
                        alt="解釋圖片"
                        minHeight="min-h-[100px]"
                        refreshKey={imgRefreshKey}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function ResultScreen({ results, onRestart, totalTime, leaderboardData, userName, loadingRank, debugInfo, isGuest, pendingSubmitCount, scope, isWrongBookMode, wrongBookRemovedCount, currentRunSubmittedAt }) {
  const [showDebug, setShowDebug] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [imgRefreshKey, setImgRefreshKey] = useState(0);
  const [isImgRefreshSpinning, setIsImgRefreshSpinning] = useState(false);

  const handleRefreshAllImages = useCallback(() => {
    setImgRefreshKey(k => k + 1);
    setIsImgRefreshSpinning(true);
    setTimeout(() => setIsImgRefreshSpinning(false), 600);
  }, []);

  const toggleItem = useCallback((idx) => {
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  }, []);

  const correctCount = useMemo(() => results.filter(r => r.isCorrect).length, [results]);
  const percentage   = Math.round((correctCount / results.length) * 100);
  const isRecorded   = userName && !isGuest && userName !== "訪客 (未登入)" && !isWrongBookMode;

  const { daily, weeklyRank, currentStreak } = useMemo(() => {
  const todayStr = getHKDateString();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yesterdayStr = getHKDateString(yest);
  const safeName = userName ? userName.trim() : "Guest";

  const currentRunRecord = isRecorded ? (() => {
    const total = results.length;
    const bp = calculateBattlePoint(correctCount, total, totalTime, scope || '');
    return { name: safeName, acc: percentage, time: totalTime, score: correctCount, total, scope: scope || '', battlePoint: bp };
  })() : null;

  let myStreak = 1;
  const me = findUser(leaderboardData, safeName);
  if (me) {
    const lastStr = safeDateStr(me.lastLogin);
    if (lastStr === todayStr)         myStreak = me.storedStreak;
    else if (lastStr === yesterdayStr) myStreak = me.storedStreak + 1;
    else                               myStreak = 1;
  }

  // 🆕 [H2 修復] 把 currentRunSubmittedAt 一併傳入,讓週榜可以精準去重
  const { daily, weeklyRank } = computeRankings(
    leaderboardData,
    safeName,
    currentRunRecord,
    currentRunSubmittedAt
  );

  return { daily, weeklyRank, currentStreak: myStreak };
}, [leaderboardData, userName, percentage, totalTime, isRecorded, results, scope, correctCount, currentRunSubmittedAt]);

  return (
    <div className="w-full max-w-4xl px-4 pb-20 relative">
      <div className="glass-panel p-8 rounded-2xl shadow-xl text-center">

        <button onClick={() => setShowDebug(!showDebug)}
          className="absolute bottom-4 right-4 text-xs text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400" title="數據診斷">
          <i className="fas fa-bug"></i>
        </button>
        {showDebug && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDebug(false)}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto text-left border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">數據診斷報告</h3>
              <pre className="text-xs bg-gray-100 dark:bg-gray-900 dark:text-gray-200 p-4 rounded overflow-x-auto">
                {JSON.stringify({
                  frontendDate: getHKDateString(),
                  userName, hasLeaderboardData: !!leaderboardData,
                  streak: currentStreak, currentRankList: daily,
                  pendingSubmitCount, isWrongBookMode,
                  debugInfo
                }, null, 2)}
              </pre>
              <button onClick={() => setShowDebug(false)} className="mt-4 bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-500 text-white px-4 py-2 rounded">關閉</button>
            </div>
          </div>
        )}

        <div className="mb-8">
          {isWrongBookMode ? (
            <>
              <div className="inline-block p-4 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
                <i className="fas fa-book-bookmark text-4xl text-red-600 dark:text-red-400"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">錯題簿複習完成！</h2>
              {wrongBookRemovedCount > 0 && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4 mb-4 text-green-700 dark:text-green-300">
                  <i className="fas fa-trophy mr-2"></i>
                  太棒了！本次有 <span className="font-bold text-lg">{wrongBookRemovedCount}</span> 題已完全掌握，從錯題簿移除！
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                💡 錯題簿模式不計入排行榜與經驗值，專注練習你的弱點！
              </p>
            </>
          ) : (
            <>
              <div className="inline-block p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/50 mb-4">
                <i className="fas fa-trophy text-4xl text-yellow-600 dark:text-yellow-400"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">練習完成！</h2>

              {pendingSubmitCount > 0 && isRecorded && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4 mb-4 text-sm text-amber-700 dark:text-amber-300">
                  <i className="fas fa-cloud-arrow-up mr-1"></i>
                  目前有 {pendingSubmitCount} 筆成績正在等待網路恢復後自動上傳…
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
              <div className="text-orange-500 dark:text-orange-400 text-sm mb-1">連續登錄</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-300 flex items-center justify-center gap-1">
                <i className="fas fa-fire text-lg"></i> {currentStreak} <span className="text-sm">天</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">得分</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{correctCount}/{results.length}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">準確率</div>
              <div className={`text-2xl font-bold ${percentage >= 80 ? 'text-green-500 dark:text-green-400' : percentage >= 60 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                {percentage}%
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">用時</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatTime(totalTime)}</div>
            </div>
          </div>
        </div>

        <div className="mb-8 text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-clipboard-check text-indigo-600 dark:text-indigo-400 mr-2"></i>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">答題檢討</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">點擊題目查看詳細解釋</span>
              <button
                onClick={handleRefreshAllImages}
                title="重新載入所有圖片"
                className="text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1">
                <i className={`fas fa-sync-alt ${isImgRefreshSpinning ? 'spin-once' : ''}`}></i>
                <span className="hidden sm:inline">刷新圖片</span>
              </button>
              <button
                onClick={() => setExpanded(expanded.size === results.length ? new Set() : new Set(results.map((_, i) => i)))}
                className="text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                {expanded.size === results.length ? '全部收起' : '全部展開'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar">
            {results.map((res, idx) => <ReviewItem key={idx} idx={idx} res={res} isExpanded={expanded.has(idx)} onToggle={() => toggleItem(idx)} imgRefreshKey={imgRefreshKey} />)}
          </div>
        </div>

        {isRecorded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-indigo-600 dark:bg-indigo-700 text-white p-3 font-bold flex justify-between items-center">
                <span>📅 每日最強 (20題MCQ)</span>
                <span className="text-xs opacity-75">取最佳成績</span>
              </div>
              <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                <LeaderboardTable rows={daily} type="daily" currentUserName={userName} emptyMsg="還沒有數據，快來搶第一！" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-purple-600 dark:bg-purple-700 text-white p-3 font-bold flex justify-between items-center">
                <span>⚡ 本週最強</span>
                <span className="text-xs opacity-75">本週累積答對</span>
              </div>
              {loadingRank && weeklyRank.length === 0
                ? <div className="p-4 text-center text-gray-500 dark:text-gray-400"><i className="fas fa-spinner fa-spin mr-1"></i>連線中...</div>
                : <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar"><LeaderboardTable rows={weeklyRank} type="weekly" currentUserName={userName} emptyMsg="本週無數據" /></div>
              }
            </div>
          </div>
        )}

        <button onClick={onRestart} className="bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow transition-colors">
          {isWrongBookMode ? '回到主頁' : '再來一局'}
        </button>
      </div>
    </div>
  );
}

