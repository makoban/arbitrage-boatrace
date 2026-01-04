import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Clock, CheckCircle, AlertTriangle, Server } from "lucide-react";

export default function DataMonitor() {
  const { data: stats, isLoading, refetch } = trpc.boatrace.getCollectionStats.useQuery(
    undefined,
    { refetchInterval: 30000 } // 30秒ごとに更新
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "未収集";
    return new Date(dateStr).toLocaleString("ja-JP");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">データ収集監視</h1>
          <p className="text-muted-foreground mt-1">
            各データソースの収集状況をリアルタイムで監視
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary hover:underline"
        >
          更新
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
      ) : (
        <>
          {/* 概要カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  レース数
                </CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.races?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  本日: {stats?.todayRaces?.toLocaleString() || 0}件
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  オッズ収集
                </CardTitle>
                <Database className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.odds?.toLocaleString() || 0}
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
                <Clock className="h-4 w-4 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.results?.toLocaleString() || 0}
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
                <Server className="h-4 w-4 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {stats?.latestOdds
                    ? new Date(stats.latestOdds).toLocaleTimeString("ja-JP")
                    : "未収集"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  オッズ収集時刻
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 詳細テーブル */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">データソース別状況</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>データソース</th>
                    <th>件数</th>
                    <th>最終更新</th>
                    <th>状態</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium">レース情報</td>
                    <td>{stats?.races?.toLocaleString() || 0}</td>
                    <td className="text-sm">-</td>
                    <td>
                      {stats?.races ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          正常
                        </span>
                      ) : (
                        <span className="badge-warning flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          未収集
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">オッズ履歴</td>
                    <td>{stats?.odds?.toLocaleString() || 0}</td>
                    <td className="text-sm">{formatDate(stats?.latestOdds)}</td>
                    <td>
                      {stats?.odds ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          正常
                        </span>
                      ) : (
                        <span className="badge-warning flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          未収集
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">レース結果</td>
                    <td>{stats?.results?.toLocaleString() || 0}</td>
                    <td className="text-sm">-</td>
                    <td>
                      {stats?.results ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          正常
                        </span>
                      ) : (
                        <span className="badge-warning flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          未収集
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* 収集設定 */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">収集設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">オッズ収集</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">通常間隔</span>
                      <span>10分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">対象オッズ</span>
                      <span>2連単・2連複・単勝・複勝</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">3連単・3連複</span>
                      <span className="badge-warning">対象外</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">運用時間</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">稼働時間</span>
                      <span>8:00〜21:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">稼働日</span>
                      <span>レース開催日のみ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">開催チェック</span>
                      <span>毎朝自動確認</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
