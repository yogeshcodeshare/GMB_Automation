"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const ToastContext = createContext<(msg: string) => void>(() => {});

/** Feedback for every action — bottom-center dark pill, auto-dismiss ~2.4s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 2400);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div className="fixed bottom-6 left-1/2 z-[600] max-w-[90vw] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-1 rounded-chip bg-bg-nav px-5 py-[11px] text-center text-[13px] font-semibold text-white shadow-toast duration-200">
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): (msg: string) => void {
  return useContext(ToastContext);
}
