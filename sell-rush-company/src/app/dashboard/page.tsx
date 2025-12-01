'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Package, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SalesSummary {
  totalSales: number
  totalOrders: number
  totalProducts: number
}

interface RecentProduct {
  id: string
  name: string
  updated_at?: string | null
  created_at: string
}

interface SalesData {
  date: string
  sales: number
}

interface OrderData {
  date: string
  orders: number
}

interface PopularProduct {
  name: string
  views: number
}

/**
 * 直近30日の売上推移データを生成（仮データ）
 * 将来的には product_events や orders テーブルから実データを取得
 */
function generateSalesData(): SalesData[] {
  const data: SalesData[] = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // 仮データ：ランダムな売上（10000〜50000円）
    const sales = Math.floor(Math.random() * 40000) + 10000
    
    data.push({
      date: date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
      sales,
    })
  }
  
  return data
}

/**
 * 直近30日の注文数推移データを生成（仮データ）
 */
function generateOrderData(): OrderData[] {
  const data: OrderData[] = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // 仮データ：ランダムな注文数（0〜10件）
    const orders = Math.floor(Math.random() * 11)
    
    data.push({
      date: date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
      orders,
    })
  }
  
  return data
}

/**
 * 人気商品TOP5データを生成（仮データ）
 */
function generatePopularProducts(): PopularProduct[] {
  // 仮データ：商品名と閲覧数
  const products = [
    { name: '商品A', views: 245 },
    { name: '商品B', views: 189 },
    { name: '商品C', views: 156 },
    { name: '商品D', views: 132 },
    { name: '商品E', views: 98 },
  ]
  
  return products
}

/**
 * ダッシュボードページ
 * 自社商品の売上サマリーを表示
 */
export default function DashboardPage() {
  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])
  
  // グラフ用データ（実データ or 仮データ）
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [orderData, setOrderData] = useState<OrderData[]>([])
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([])

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        // 現在のユーザーを取得
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 自社の商品IDを取得
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('owner_id', user.id)

        if (!products || products.length === 0) {
          setIsLoading(false)
          // データがない場合は仮データを表示
          setSalesData(generateSalesData())
          setOrderData(generateOrderData())
          setPopularProducts(generatePopularProducts())
          return
        }

        const productIds = products.map((p) => p.id)

        // product_stats から集計データを取得
        const { data: stats } = await supabase
          .from('product_stats')
          .select('revenue_total, order_count')
          .in('product_id', productIds)

        if (stats && stats.length > 0) {
          const totalSales = stats.reduce((sum, stat) => sum + (stat.revenue_total || 0), 0)
          const totalOrders = stats.reduce((sum, stat) => sum + (stat.order_count || 0), 0)
          const totalProducts = products.length

          setSummary({
            totalSales,
            totalOrders,
            totalProducts,
          })
        } else {
          // statsが存在しない場合は0で初期化
          setSummary({
            totalSales: 0,
            totalOrders: 0,
            totalProducts: products.length,
          })
        }
      } catch (error) {
        console.error('売上データの取得に失敗:', error)
        // エラー時は仮データを表示
        setSalesData(generateSalesData())
        setOrderData(generateOrderData())
        setPopularProducts(generatePopularProducts())
      } finally {
        setIsLoading(false)
      }
    }

    const fetchGraphData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 直近30日のイベントから売上推移を集計
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: events } = await supabase
          .from('product_events')
          .select('created_at, event_type, metadata')
          .eq('event_type', 'product_ordered')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })

        if (events && events.length > 0) {
          // 日別に集計
          const dailySales: Record<string, number> = {}
          events.forEach((event) => {
            const date = new Date(event.created_at).toLocaleDateString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
            })
            const revenue = event.metadata?.price * (event.metadata?.quantity || 1) || 0
            dailySales[date] = (dailySales[date] || 0) + revenue
          })

          // 直近30日のデータを生成
          const salesDataArray: SalesData[] = []
          const today = new Date()
          for (let i = 29; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            const dateStr = date.toLocaleDateString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
            })
            salesDataArray.push({
              date: dateStr,
              sales: dailySales[dateStr] || 0,
            })
          }
          setSalesData(salesDataArray)
        } else {
          // データがない場合は仮データを表示
          setSalesData(generateSalesData())
        }

        // 注文数推移（直近30日）
        const { data: orderEvents } = await supabase
          .from('product_events')
          .select('created_at')
          .eq('event_type', 'product_ordered')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })

        if (orderEvents && orderEvents.length > 0) {
          const dailyOrders: Record<string, number> = {}
          orderEvents.forEach((event) => {
            const date = new Date(event.created_at).toLocaleDateString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
            })
            dailyOrders[date] = (dailyOrders[date] || 0) + 1
          })

          const orderDataArray: OrderData[] = []
          const today = new Date()
          for (let i = 29; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            const dateStr = date.toLocaleDateString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
            })
            orderDataArray.push({
              date: dateStr,
              orders: dailyOrders[dateStr] || 0,
            })
          }
          setOrderData(orderDataArray)
        } else {
          setOrderData(generateOrderData())
        }
      } catch (error) {
        console.error('グラフデータの取得に失敗:', error)
        // エラー時は仮データを表示
        setSalesData(generateSalesData())
        setOrderData(generateOrderData())
      }
    }

    const fetchPopularProducts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // product_stats から人気商品TOP5を取得
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .eq('owner_id', user.id)

        if (!products || products.length === 0) {
          setPopularProducts(generatePopularProducts())
          return
        }

        const productIds = products.map((p) => p.id)

        const { data: stats } = await supabase
          .from('product_stats')
          .select('product_id, view_count, order_count')
          .in('product_id', productIds)
          .order('order_count', { ascending: false })
          .limit(5)

        if (stats && stats.length > 0) {
          const popularProductsArray: PopularProduct[] = stats
            .map((stat) => {
              const product = products.find((p) => p.id === stat.product_id)
              return {
                name: product?.name || '不明な商品',
                views: stat.view_count || 0,
              }
            })
            .filter((p) => p.views > 0)

          if (popularProductsArray.length > 0) {
            setPopularProducts(popularProductsArray)
          } else {
            setPopularProducts(generatePopularProducts())
          }
        } else {
          setPopularProducts(generatePopularProducts())
        }
      } catch (error) {
        console.error('人気商品データの取得に失敗:', error)
        setPopularProducts(generatePopularProducts())
      }
    }

    const fetchRecentProducts = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('products')
          .select('id, name, created_at, updated_at')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(5)

        if (error) throw error
        if (data) setRecentProducts(data)
      } catch (error) {
        console.error('最近更新された商品の取得に失敗:', error)
      }
    }

    fetchSalesData()
    fetchGraphData()
    fetchPopularProducts()
    fetchRecentProducts()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[#B0B0B8]">
        <p>読み込み中です…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">ダッシュボード</h1>
        <p className="text-sm text-[#B0B0B8]">自社商品の売上サマリー</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#B0B0B8]">
              総売上
            </CardTitle>
            <DollarSign className="w-4 h-4 text-[#B0B0B8]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ¥{summary.totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-[#B0B0B8] mt-1">全期間の累計売上</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#B0B0B8]">
              注文数
            </CardTitle>
            <Package className="w-4 h-4 text-[#B0B0B8]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{summary.totalOrders}</div>
            <p className="text-xs text-[#B0B0B8] mt-1">全期間の累計注文数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#B0B0B8]">
              登録商品数
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-[#B0B0B8]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{summary.totalProducts}</div>
            <p className="text-xs text-[#B0B0B8] mt-1">現在登録中の商品数</p>
          </CardContent>
        </Card>
      </div>

      {/* 売上推移グラフ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#B0B0B8]">
            売上推移（直近30日）
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
              <XAxis
                dataKey="date"
                stroke="#B0B0B8"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#B0B0B8' }}
              />
              <YAxis
                stroke="#B0B0B8"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#B0B0B8' }}
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#17171C',
                  border: '1px solid #2A2A30',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                }}
                labelStyle={{ color: '#B0B0B8' }}
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '売上']}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 注文数推移グラフ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#B0B0B8]">
              注文数推移（直近30日）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={orderData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                <XAxis
                  dataKey="date"
                  stroke="#B0B0B8"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#B0B0B8' }}
                />
                <YAxis
                  stroke="#B0B0B8"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#B0B0B8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#17171C',
                    border: '1px solid #2A2A30',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                  }}
                  labelStyle={{ color: '#B0B0B8' }}
                  formatter={(value: number) => [`${value}件`, '注文数']}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 人気商品TOP5 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#B0B0B8]">
              人気商品 TOP5
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={popularProducts}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                <XAxis
                  type="number"
                  stroke="#B0B0B8"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#B0B0B8' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#B0B0B8"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#B0B0B8' }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#17171C',
                    border: '1px solid #2A2A30',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                  }}
                  labelStyle={{ color: '#B0B0B8' }}
                  formatter={(value: number) => [`${value}回`, '閲覧数']}
                />
                <Bar
                  dataKey="views"
                  fill="#6B7280"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 最近更新された商品（簡易表示） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#B0B0B8]">
            最近更新された商品
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentProducts.length === 0 ? (
            <p className="text-xs text-[#6B7280]">
              最近更新された商品マスターはありません。
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentProducts.map((p) => {
                const updated = p.updated_at || p.created_at
                const d = new Date(updated)
                const label = `${d.toLocaleDateString('ja-JP', {
                  month: '2-digit',
                  day: '2-digit',
                })} ${d.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between border-t border-[#2A2A30] pt-2 first:border-t-0 first:pt-0"
                  >
                    <span className="truncate text-white max-w-[60%]">{p.name}</span>
                    <span className="text-xs text-[#6B7280]">{label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

