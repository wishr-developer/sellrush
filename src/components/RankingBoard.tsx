"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Medal, Award } from 'lucide-react'

type RankingItem = {
  referrer: string
  creatorId?: string
  totalSales: number
  estimatedCommission: number
  rank: number
}

interface RankingBoardProps {
  currentUserId?: string
  myRank?: number | null
}

/**
 * リアルタイム・ランキングボード
 * 上位10名の販売者ランキングを表示
 */
export default function RankingBoard({ currentUserId, myRank }: RankingBoardProps) {
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true)

        const response = await fetch("/api/rankings")
        
        if (!response.ok) {
          throw new Error("ランキングの取得に失敗しました")
        }

        const data = await response.json()
        
        if (data.rankings && Array.isArray(data.rankings)) {
          setRankings(data.rankings)
        } else {
          setRankings([])
        }

      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error('ランキングデータの取得エラー:', error)
        }
        setRankings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRankings()

    // リアルタイム更新の設定
    const channel = supabase
      .channel('rankings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // 注文が変更されたらランキングを再取得
          fetchRankings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-zinc-400 text-sm font-bold">{rank}</span>
    }
  }

  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-blue-500/20 border-blue-500/50'
    }
    
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30'
      case 2:
        return 'bg-gray-400/10 border-gray-400/30'
      case 3:
        return 'bg-amber-600/10 border-amber-600/30'
      default:
        return 'bg-zinc-900/50 border-white/10'
    }
  }

  const shortenUserId = (userId: string) => {
    if (userId.includes('@')) {
      // メールアドレスの場合
      const [local, domain] = userId.split('@')
      return `${local.substring(0, 4)}...@${domain.substring(0, 4)}...`
    }
    // UIDの場合
    return `${userId.substring(0, 8)}...`
  }

  if (isLoading) {
    return (
      <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">リアルタイムランキングボード</h2>
        <p className="text-zinc-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">リアルタイムランキングボード</h2>
        <p className="text-zinc-400 text-sm">
          {myRank !== null && myRank !== undefined
            ? `あなたの順位: #${myRank}`
            : "ランキングデータを準備中です"}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-6">リアルタイムランキングボード</h2>
      <div className="space-y-2 md:space-y-3 max-h-[600px] overflow-y-auto">
        {rankings.map((item) => {
          // ユーザーIDマッチング（creator_id ベース）
          const creatorId = item.creatorId || item.referrer
          const isCurrentUser = currentUserId && (
            creatorId === currentUserId || 
            item.referrer === currentUserId ||
            (creatorId.length > 8 && currentUserId.length > 8 && 
             (creatorId.substring(0, 8) === currentUserId.substring(0, 8) ||
              creatorId.includes(currentUserId) ||
              currentUserId.includes(creatorId)))
          )

          const rankStyle = getRankStyle(item.rank, !!isCurrentUser)
          const isTopThree = item.rank <= 3

          return (
            <div
              key={item.creatorId || item.referrer}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-colors ${rankStyle} ${
                isTopThree ? 'shadow-lg' : ''
              }`}
            >
              {/* 順位アイコン */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {getRankIcon(item.rank)}
                {isTopThree && (
                  <span className="text-xs font-bold text-zinc-400 hidden sm:inline">位</span>
                )}
              </div>

              {/* ユーザーID */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm sm:text-base font-medium ${
                  isCurrentUser 
                    ? 'text-blue-400' 
                    : isTopThree 
                      ? 'text-white font-semibold' 
                      : 'text-white'
                }`}>
                  {shortenUserId(item.creatorId || item.referrer)}
                  {isCurrentUser && <span className="ml-2 text-xs text-blue-400">(あなた)</span>}
                </p>
              </div>

              {/* 総売上と推定報酬（モバイルでは縦並び） */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-4 w-full sm:w-auto">
                {/* 総売上 */}
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-zinc-400">総売上</p>
                  <p className={`text-base sm:text-lg font-semibold ${
                    isTopThree ? 'text-yellow-400' : 'text-white'
                  }`}>
                    ¥{item.totalSales.toLocaleString()}
                  </p>
                </div>

                {/* 推定報酬額 */}
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-zinc-400">推定報酬</p>
                  <p className="text-base sm:text-lg font-semibold text-purple-400">
                    ¥{item.estimatedCommission.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        * 報酬額は総売上の30%で計算しています（推定値）
      </p>
    </div>
  )
}

