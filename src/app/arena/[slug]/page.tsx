import type { Metadata } from "next";
import TournamentLeaderboardClient from "./TournamentLeaderboardClient";

export const metadata: Metadata = {
  title: "Tournament Leaderboard | SELL RUSH",
  description: "トーナメントランキング",
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Tournament Leaderboard Page
 * 
 * トーナメント専用のランキングページ
 * ログイン不要で閲覧可能（パブリックビュー）
 */
export default function TournamentLeaderboardPage() {
  return <TournamentLeaderboardClient />;
}

