import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, TrendingUp, Users, AlertTriangle, Clock } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: stats, isLoading } = trpc.boatrace.getCollectionStats.useQuery();
  const { data: todayRaces } = trpc.boatrace.getTodayRaces.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">アービトラージ競艇予想</h1>
        <p className="text-muted-foreground mt-1">
          オッズの歪みを検知し、最適な予想を提供するAIシステム
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              レース数
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.races?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              本日: {stats?.todayRaces?.toLocaleString() || 0}件
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              オッズ収集数
            </CardTitle>
            <Database className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.odds?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              2連単・2連複・単勝・複勝
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              レース結果
            </CardTitle>
            <Activity className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.results?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              払戻金データ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              最終収集
            </CardTitle>
            <Clock className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {isLoading ? "..." : stats?.latestOdds
                ? new Date(stats.latestOdds).toLocaleTimeString("ja-JP")
                : "未収集"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              オッズ収集時刻
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 本日のレース */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              本日のレース
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayRaces && todayRaces.length > 0 ? (
              <div className="space-y-2">
                {todayRaces.slice(0, 10).map((race: any, index: number) => (
                  <Link
                    key={index}
                    href={`/races`}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">
                      {race.stadiumName} {race.raceNumber}R
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {race.result || "未確定"}
                    </span>
                  </Link>
                ))}
                {todayRaces.length > 10 && (
                  <Link
                    href="/races"
                    className="block text-center text-sm text-primary hover:underline mt-2"
                  >
                    すべて表示 ({todayRaces.length}件)
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                本日のレースデータはまだありません
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              システム状態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">データベース</span>
                <span className="badge-success">PostgreSQL接続中</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">収集間隔</span>
                <span className="badge-info">10分ごと</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">対象オッズ</span>
                <span className="badge-success">2連単・2連複・単勝・複勝</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">結果収集</span>
                <span className="badge-info">15分ごと</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/races">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">レース一覧</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/racers">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="font-medium">レーサー検索</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/predictions">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-chart-3" />
              <p className="font-medium">予想情報</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/monitor">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-chart-4" />
              <p className="font-medium">データ監視</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
