"use client";

/**
 * Early Access / Waitlist 用の計測イベントを dataLayer に投げるヘルパー。
 * Step4 以降で GA / GTM 設定と接続する前提。
 */
export type EarlyAccessEventName =
  | "early_access_open"
  | "early_access_submit"
  | "early_access_complete";

type EarlyAccessSource = "hero" | "header" | "final";

type EarlyAccessPayload = {
  source?: EarlyAccessSource;
  role?: "influencer" | "brand";
};

export const trackEarlyAccessEvent = (
  event: EarlyAccessEventName,
  payload: EarlyAccessPayload = {},
): void => {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event,
    ...payload,
  });
};


