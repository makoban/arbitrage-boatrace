import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock } from "lucide-react";
import { Link, useParams } from "wouter";

export default function OddsAnalysis() {
  const params = useParams();
  const { date, stadium, race } = params as { date: string; stadium: string; race: string };
  const [oddsType, setOddsType] = useState("quinella");

  const { data: oddsHistory, isLoading } = trpc.boatrace.getOddsHistory.useQuery({
    raceDate: date,
    stadiumCode: stadium,
    raceNumber: parseInt(race),
    oddsType,
  });

  const { data: beforeInfo } = trpc.boatrace.getBeforeInfo.useQuery({
    raceDate: date,
    stadiumCode: stadium,
    raceNumber: parseInt(race),
  });

  const { data: weatherInfo } = trpc.boatrace.getWeatherInfo.useQuery({
    raceDate: date,
    stadiumCode: stadium,
    raceNumber: parseInt(race),
  });

  const { data: stadiums } = trpc.boatrace.getStadiums.useQuery();
  const stadiumName = stadiums?.find((s: any) => s.code === stadium)?.name || stadium;

  // オッズの変動を計算
  const oddsChanges = useMemo(() => {
    if (!oddsHistory || oddsHistory.length < 2) return [];

    const latest = oddsHistory[oddsHistory.length - 1];
    const previous = oddsHistory[oddsHistory.length - 2];

    if (!latest?.odds || !previous?.odds) return [];

    return Object.entries(latest.odds).map(([combination, currentOdds]) => {
      const prevOdds = previous.odds[combination] || currentOdds;
      const change = (currentOdds as number) - (prevOdds as number);
      const changePercent = prevOdds ? ((change / (prevOdds as number)) * 100).toFixed(1) : "0";

      return {
        combination,
        currentOdds,
        prevOdds,
        change,
        changePercent,
        trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
      };
    }).sort((a, b) => (a.currentOdds as number) - (b.currentOdds as number));
  }, [oddsHistory]);

  // アービトラージ検知（オッズの歪み）
  const arbitrageOpportunities = useMemo(() => {
    if (!oddsChanges.length) return [];

    // 急激なオッズ変動を検知（10%以上の変動）
    return oddsChanges.filter((odds) => Math.abs(parseFloat(odds.changePercent)) >= 10);
  }, [oddsChanges]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/races">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {stadiumName} {race}R
          </h1>
          <p className="text-muted-foreground">
            {new Date(date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* アービトラージ警告 */}
      {arbitrageOpportunities.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              オッズ変動アラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {arbitrageOpportunities.slice(0, 5).map((opp) => (
                <div
                  key={opp.combination}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-mono">{opp.combination}</span>
                  <span
                    className={
                      opp.trend === "up" ? "odds-up" : opp.trend === "down" ? "odds-down" : ""
                    }
                  >
                    {opp.prevOdds as number} → {opp.currentOdds as number} ({opp.changePercent}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* オッズタブ */}
      <Tabs value={oddsType} onValueChange={setOddsType}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="win">単勝</TabsTrigger>
          <TabsTrigger value="place">複勝</TabsTrigger>
          <TabsTrigger value="quinella">2連複</TabsTrigger>
          <TabsTrigger value="exacta">2連単</TabsTrigger>
        </TabsList>

        <TabsContent value={oddsType} className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 現在のオッズ */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">現在のオッズ</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">読み込み中...</div>
                ) : oddsChanges.length > 0 ? (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {oddsChanges.map((odds) => (
                      <div
                        key={odds.combination}
                        className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30"
                      >
                        <span className="font-mono text-sm">{odds.combination}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{(odds.currentOdds as number).toFixed(1)}</span>
                          {odds.trend === "up" && (
                            <TrendingUp className="h-4 w-4 text-red-400" />
                          )}
                          {odds.trend === "down" && (
                            <TrendingDown className="h-4 w-4 text-green-400" />
                          )}
                          {odds.trend === "stable" && (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    オッズデータがありません
                  </div>
                )}
              </CardContent>
            </Card>

            {/* オッズ履歴 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  収集履歴
                </CardTitle>
              </CardHeader>
              <CardContent>
                {oddsHistory && oddsHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {oddsHistory
                      .slice()
                      .reverse()
                      .map((record: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {new Date(record.scraped_at).toLocaleTimeString("ja-JP")}
                          </span>
                          <span>
                            {Object.keys(record.odds || {}).length}件
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    履歴データがありません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 直前情報 */}
      {beforeInfo && Array.isArray(beforeInfo) && beforeInfo.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">直前情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {beforeInfo.map((entry: any, index: number) => (
                <div key={index} className="text-center">
                  <div
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold lane-${entry.lane || index + 1}`}
                  >
                    {entry.lane || index + 1}
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="font-medium">{entry.racer_name || entry.name || "-"}</div>
                    <div className="text-muted-foreground">
                      展示: {entry.exhibition_time || "-"}
                    </div>
                    <div className="text-muted-foreground">
                      チルト: {entry.tilt || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {weatherInfo && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">天候:</span>{" "}
                    {weatherInfo.weather || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">風向:</span>{" "}
                    {weatherInfo.wind_direction || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">風速:</span>{" "}
                    {weatherInfo.wind_speed || "-"}m
                  </div>
                  <div>
                    <span className="text-muted-foreground">波高:</span>{" "}
                    {weatherInfo.wave_height || "-"}cm
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
