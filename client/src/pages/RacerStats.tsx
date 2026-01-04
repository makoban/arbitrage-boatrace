import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, TrendingUp, Award, Target } from "lucide-react";

export default function RacerStats() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedRacer, setSelectedRacer] = useState<number | null>(null);

  const { data: periods } = trpc.boatrace.getPeriods.useQuery();
  
  // 検索クエリを解析
  const searchParams = useMemo(() => {
    if (searchQuery.length < 2) return null;
    const isNumber = /^\d+$/.test(searchQuery);
    return {
      racerNo: isNumber ? searchQuery : undefined,
      name: !isNumber ? searchQuery : undefined,
      period: selectedPeriod && selectedPeriod !== 'all' ? parseInt(selectedPeriod) : undefined,
      limit: 50,
    };
  }, [searchQuery, selectedPeriod]);

  const { data: searchResults, isLoading: searching } = trpc.boatrace.searchRacerStats.useQuery(
    searchParams || {},
    { enabled: !!searchParams }
  );

  const { data: racerDetail } = trpc.boatrace.getRacerDetail.useQuery(
    { racerId: selectedRacer!, period: selectedPeriod || undefined },
    { enabled: !!selectedRacer }
  );

  const racerList = searchResults?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">レーサー検索</h1>
        <p className="text-muted-foreground mt-1">
          2002年〜2026年の期別成績データから検索
        </p>
      </div>

      {/* 検索フォーム */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                レーサー名・登録番号
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="名前または番号で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">期</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="すべての期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての期</SelectItem>
                  {periods?.map((period: any) => (
                    <SelectItem key={period.period} value={period.period.toString()}>
                      {period.period}期 ({period.count}件)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPeriod("");
                  setSelectedRacer(null);
                }}
              >
                リセット
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 検索結果 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">検索結果</CardTitle>
          </CardHeader>
          <CardContent>
            {searching ? (
              <div className="text-center py-4 text-muted-foreground">検索中...</div>
            ) : racerList.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {racerList.map((racer: any, index: number) => (
                  <button
                    key={`${racer.racer_no}-${racer.data_period}-${index}`}
                    onClick={() => setSelectedRacer(parseInt(racer.racer_no))}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedRacer === parseInt(racer.racer_no)
                        ? "bg-primary/20 border border-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{racer.name_kanji}</div>
                          <div className="text-sm text-muted-foreground">
                            #{racer.racer_no} / {racer.data_period}期
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {racer.win_rate?.toFixed(2) || "-"}%
                        </div>
                        <div className="text-xs text-muted-foreground">勝率</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="text-center py-4 text-muted-foreground">
                該当するレーサーが見つかりません
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                2文字以上入力して検索してください
              </div>
            )}
          </CardContent>
        </Card>

        {/* レーサー詳細 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">レーサー詳細</CardTitle>
          </CardHeader>
          <CardContent>
            {racerDetail ? (
              <div className="space-y-6">
                {/* 基本情報 */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{racerDetail.racer_name}</h3>
                    <p className="text-muted-foreground">
                      登録番号: {racerDetail.racer_id} / {racerDetail.branch}支部
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {racerDetail.rank}級 / {racerDetail.period}期
                    </p>
                  </div>
                </div>

                {/* 成績サマリー */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="stats-card">
                    <div className="stats-card-title flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      勝率
                    </div>
                    <div className="stats-card-value text-primary">
                      {racerDetail.win_rate?.toFixed(2) || "-"}%
                    </div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card-title flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      2連対率
                    </div>
                    <div className="stats-card-value text-accent">
                      {racerDetail.quinella_rate?.toFixed(2) || "-"}%
                    </div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card-title flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      3連対率
                    </div>
                    <div className="stats-card-value">
                      {racerDetail.trifecta_rate?.toFixed(2) || "-"}%
                    </div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card-title">出走回数</div>
                    <div className="stats-card-value">
                      {racerDetail.total_races?.toLocaleString() || "-"}
                    </div>
                  </div>
                </div>

                {/* コース別成績 */}
                {racerDetail.courseStats && racerDetail.courseStats.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">コース別成績</h4>
                    <div className="grid grid-cols-6 gap-2">
                      {racerDetail.courseStats.map((course: any) => (
                        <div
                          key={course.course}
                          className={`text-center p-2 rounded lane-${course.course}`}
                        >
                          <div className="text-xs opacity-80">{course.course}コース</div>
                          <div className="font-bold">{course.win_rate?.toFixed(1) || "-"}%</div>
                          <div className="text-xs opacity-80">{course.races || 0}走</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                左のリストからレーサーを選択してください
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
