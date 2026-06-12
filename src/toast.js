/* ============================================================================
 * 【區塊 4】TOAST SYSTEM
 * ============================================================================ */

const ToastContext = createContext(() => {});

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 right-4 z-[1200] flex flex-col gap-2 items-end pointer-events-none max-w-[90vw]">
        <AnimatePresence>
          {toasts.map(t => {
            const style = TOAST_TYPE_STYLE[t.type] || TOAST_TYPE_STYLE.info;
            return (
              <motion.div
                key={t.id}
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`${style.bg} ${style.border} text-white px-4 py-3 rounded-xl shadow-lg border flex items-start gap-3 pointer-events-auto min-w-[260px] max-w-sm`}
              >
                <i className={`fas ${style.icon} text-lg mt-0.5 flex-shrink-0`}></i>
                <div className="flex-1 text-sm leading-snug whitespace-pre-line">{t.message}</div>
                <button onClick={() => removeToast(t.id)} className="text-white/80 hover:text-white flex-shrink-0">
                  <i className="fas fa-times text-xs"></i>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function useToast() { return useContext(ToastContext); }
