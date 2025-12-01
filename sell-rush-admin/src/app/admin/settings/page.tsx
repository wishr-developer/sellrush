"use client";

/**
 * Admin Settings 画面
 * - 現時点では実際の保存処理は行わず、「設定画面っぽい」UI をまとめておく。
 */
export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-wide">設定</h1>
          <p className="text-sm text-zinc-400">
            プラットフォームの基本設定や通知・UI に関する設定の雰囲気をまとめています。
            <br />
            <span className="text-[11px] text-zinc-500">
              ※ 現時点では表示のみであり、値の保存や動作変更は行われません。
            </span>
          </p>
        </header>

        {/* 一般設定 */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">一般設定</h2>
          <p className="text-[11px] text-zinc-500">
            プラットフォーム全体に関わる基本情報です（読み取り専用）。
          </p>
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-400">プラットフォーム名</span>
              <span className="text-zinc-100">SELL RUSH</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">通貨</span>
              <span className="text-zinc-100">JPY（日本円）</span>
            </div>
          </div>
        </section>

        {/* 通知設定 */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">通知設定</h2>
          <p className="text-[11px] text-zinc-500">
            将来的にメール通知や Slack 連携などを制御する想定の領域です。
          </p>
          <div className="mt-2 space-y-3 text-xs">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-[2px] h-3 w-3 rounded border-zinc-700 bg-zinc-900"
                disabled
              />
              <div>
                <p className="text-zinc-100">
                  高リスク Fraud 検知時にメール通知
                </p>
                <p className="text-[11px] text-zinc-500">
                  severity=high の未レビューフラグが発生した際に、運営チームへメールで知らせます。
                  <br />
                  ※ 現時点では UI のみで、通知処理はまだ実装されていません。
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* UI テーマ */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">UI テーマ</h2>
          <p className="text-[11px] text-zinc-500">
            テーマ切り替えのデザインだけ先に用意しています。実際のテーマ変更はまだ行われません。
          </p>
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="theme"
                  defaultChecked
                  disabled
                  className="h-3 w-3 border-zinc-700 bg-zinc-900"
                />
                <span className="text-zinc-100">Dark</span>
              </label>
              <label className="inline-flex items-center gap-1 opacity-60">
                <input
                  type="radio"
                  name="theme"
                  disabled
                  className="h-3 w-3 border-zinc-700 bg-zinc-900"
                />
                <span className="text-zinc-400">Light</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


