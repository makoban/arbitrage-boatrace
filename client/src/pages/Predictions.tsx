import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Lightbulb, Target, TrendingUp, CheckCircle, XCircle } from "lucide-react";

export default function Predictions() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [stadiumCode, setStadiumCode] = useState<string>("");

  const { data: stadiums } = trpc.boatrace.getStadiums.useQuery();
  const { data: predictions, isLoading } = trpc.boatrace.getWebPredictions.useQuery({
    raceDate: date,
    stadiumCode: stadiumCode && stadiumCode !== 'all' ? stadiumCode : undefined,
  });

  // 的中率を計算
  const hitRate = predictions?.reduce(
    (acc: any, pred: any) => {
      if (pred.result) {
        acc.total++;
        if (pred.is_hit) acc.hits++;
      }
      return acc;
    },
    { total: 0, hits: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">予想情報</h1>
        <p className="text-muted-foreground mt-1">
          競艇日和・公式予想の収集データと的中率分析
        </p>
      </div>

      {/* フィルター */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">日付</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-input"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">会場</label>
              <Select value={stadiumCode} onValueChange={setStadiumCode}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="すべての会場" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての会場</SelectItem>
                  {stadiums?.map((stadium: any) => (
                    <SelectItem key={stadium.code} value={stadium.code}>
                      {stadium.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDate(today);
                  setStadiumCode("");
                }}
              >
                リセット
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 的中率サマリー */}
      {hitRate && hitRate.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">的中率</p>
                  <p className="text-2xl font-bold text-primary">
                    {((hitRate.hits / hitRate.total) * 100).toFixed(1)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">的中数</p>
                  <p className="text-2xl font-bold text-green-400">{hitRate.hits}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">不的中数</p>
                  <p className="text-2xl font-bold text-red-400">
                    {hitRate.total - hitRate.hits}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 予想一覧 */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            予想一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">読み込み中...</div>
          ) : predictions && predictions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>会場</th>
                    <th>R</th>
                    <th>ソース</th>
                    <th>予想</th>
                    <th>結果</th>
                    <th>的中</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred: any, index: number) => (
                    <tr key={index}>
                      <td>{pred.stadiumName}</td>
                      <td>{pred.race_number}R</td>
                      <td>
                        <span className="badge-info">{pred.source}</span>
                      </td>
                      <td className="font-mono">{pred.prediction}</td>
                      <td className="font-mono">{pred.result || "-"}</td>
                      <td>
                        {pred.result ? (
                          pred.is_hit ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              予想データがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
