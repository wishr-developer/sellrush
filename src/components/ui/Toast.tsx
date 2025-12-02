"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/**
 * トースト通知コンポーネント（個別）
 */
function ToastItem({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // アニメーション用の遅延
    setTimeout(() => setIsVisible(true), 10);

    // 自動クローズ
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300); // アニメーション完了後に削除
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };

  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  return (
    <div
      className={`
        ${colorClass}
        border rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm
        flex items-start gap-3 min-w-[300px] max-w-md
        transition-all duration-300 ease-in-out
        ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * トースト通知コンテナコンポーネント
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // グローバルなトースト管理
    const handleToast = (event: CustomEvent<Omit<Toast, "id">>) => {
      const toast: Toast = {
        ...event.detail,
        id: `toast-${Date.now()}-${Math.random()}`,
      };
      setToasts((prev) => [...prev, toast]);
    };

    window.addEventListener("toast" as any, handleToast as EventListener);

    return () => {
      window.removeEventListener("toast" as any, handleToast as EventListener);
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={handleClose} />
        </div>
      ))}
    </div>
  );
}

/**
 * トースト通知を表示するヘルパー関数
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration?: number
) {
  const event = new CustomEvent("toast", {
    detail: { message, type, duration },
  });
  window.dispatchEvent(event);
}

/**
 * 成功トースト
 */
export function showSuccessToast(message: string, duration?: number) {
  showToast(message, "success", duration);
}

/**
 * エラートースト
 */
export function showErrorToast(message: string, duration?: number) {
  showToast(message, "error", duration);
}

/**
 * 情報トースト
 */
export function showInfoToast(message: string, duration?: number) {
  showToast(message, "info", duration);
}

/**
 * 警告トースト
 */
export function showWarningToast(message: string, duration?: number) {
  showToast(message, "warning", duration);
}

