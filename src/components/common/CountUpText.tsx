"use client";

import { useEffect, useRef, useState } from "react";

type CountUpTextProps = {
  from?: number;
  to: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** 小数点以下の桁数（デフォルト 0） */
  decimals?: number;
};

/**
 * 初回マウント時にのみ数値をカウントアップ表示するコンポーネント。
 * ダッシュボードの「生きている感」を演出するために利用する。
 */
export const CountUpText: React.FC<CountUpTextProps> = ({
  from = 0,
  to,
  durationMs = 900,
  prefix,
  suffix,
  className,
  decimals = 0,
}) => {
  const [value, setValue] = useState(from);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let frameId: number;

    const animate = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const currentValue = from + (to - from) * eased;

      setValue(currentValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};


