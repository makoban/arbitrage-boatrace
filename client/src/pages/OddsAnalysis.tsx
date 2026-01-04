import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Clock, Trophy, AlertTriangle, BarChart3, Table2 } from "lucide-react";
import { Link, useParams } from "wouter";

// 会場コードと名前のマッピング
const STADIUM_MAP: Record<string, string> = {
  "01": "桐生", "02": "戸田", "03": "江戸川", "04": "平和島", "05": "多摩川",
  "06": "浜名湖", "07": "蒲郡", "08": "常滑", "09": "津", "10": "三国",
  "11": "びわこ", "12": "住之江", "13": "尼崎", "14": "鳴門", "15": "丸亀",
  "16": "児島", "17": "宮島", "18": "徳山", "19": "下関", "20": "若松",
  "21": "芦屋", "22": "福岡", "23": "唐津", "24": "大村",
};

// オッズタイプの表示名
const ODDS_TYPE_LABELS: Record<string, string> = {
  "2t": "2連単",
  "2f": "2連複",
  "win": "単勝",
  "place": "複勝",
  "3t": "3連単",
  "3f": "3連複",
};

export default function OddsAnalysis() {
  const params = useParams();
  const { date, stadium, race } = params as { date: string; stadium: string; race: string };
  const [selectedOddsType, setSelectedOddsType] = useState<string>("2t");
  const [selectedCombination, setSelectedCombination] = useState<string>("all");

  const stadiumName = STADIUM_MAP[stadium] || `場${stadium}`;

  // オッズ履歴を取得
  const { data: oddsHistory, isLoading: oddsLoading } = trpc.boatrace.getOddsHistory.useQuery({
    raceDate: date,
    stadiumCode: stadium,
    raceNumber: parseInt(race),
    oddsType: selectedOddsType !== "all" ? selectedOddsType : undefined,
  });

  // 直前情報を取得
  const { data: beforeInfo } = trpc.boatrace.getBeforeInfo.useQuery({
    raceDate: date,
    stadiumCode: stadium,
    raceNumber: parseInt(race),
  });

  // 水面気象情報を取得
  const { data: weatherInfo } = trpc.boatrace.getWeatherInfo.useQuery({
    raceDate: date,
    stadiumCode: stadium,
    raceNumber: parseInt(race),
  });

  // 利用可能なオッズタイプを抽出
  const availableOddsTypes = useMemo(() => {
    if (!oddsHistory || oddsHistory.length === 0) return [];
    const types = Array.from(new Set(oddsHistory.map((o: any) => o.odds_type)));
    return types.sort();
  }, [oddsHistory]);

  // 利用可能な組み合わせを抽出
  const availableCombinations = useMemo(() => {
    if (!oddsHistory || oddsHistory.length === 0) return [];
    const filtered = selectedOddsType !== "all" 
      ? oddsHistory.filter((o: any) => o.odds_type === selectedOddsType)
      : oddsHistory;
    const combinations = Array.from(new Set(filtered.map((o: any) => o.combination)));
    return combinations.sort();
  }, [oddsHistory, selectedOddsType]);

  // フィルタリングされたオッズデータ
  const filteredOdds = useMemo(() => {
    if (!oddsHistory) return [];
    let filtered = oddsHistory;
    if (selectedOddsType !== "all") {
      filtered = filtered.filter((o: any) => o.odds_type === selectedOddsType);
    }
    if (selectedCombination !== "all") {
      filtered = filtered.filter((o: any) => o.combination === selectedCombination);
    }
    return filtered.sort((a: any, b: any) => 
      new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime()
    );
  }, [oddsHistory, selectedOddsType, selectedCombination]);

  // オッズ推移をグループ化（組み合わせごと）
  const oddsTimeSeries = useMemo(() => {
    if (!filteredOdds || filteredOdds.length === 0) return {};
    return filteredOdds.reduce((acc: any, odds: any) => {
      const key = odds.combination;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        time: new Date(odds.scraped_at),
        value: parseFloat(odds.odds_value),
        minutesToDeadline: odds.minutes_to_deadline,
      });
      return acc;
    }, {});
  }, [filteredOdds]);

  // 最新オッズ一覧
  const latestOdds = useMemo(() => {
    if (!oddsHistory || oddsHistory.length === 0) return [];
    const latestByCombo: Record<string, any> = {};
    oddsHistory.forEach((odds: any) => {
      const key = `${odds.odds_type}-${odds.combination}`;
      if (!latestByCombo[key] || new Date(odds.scraped_at) > new Date(latestByCombo[key].scraped_at)) {
        latestByCombo[key] = odds;
      }
    });
    return Object.values(latestByCombo).sort((a: any, b: any) => {
      if (a.odds_type !== b.odds_type) return a.odds_type.localeCompare(b.odds_type);
      return parseFloat(a.odds_value) - parseFloat(b.odds_value);
    });
  }, [oddsHistory]);

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });
    } catch {
      return dateStr;
    }
  };

  // 時刻フォーマット
  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

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
          <h1 className="text-2xl font-bold">オッズ分析</h1>
          <p className="text-muted-foreground">
            {formatDate(date)} / {stadiumName} / {race}R
          </p>
        </div>
      </div>

      {/* 気象情報 */}
      {weatherInfo && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              水面気象情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">天候</span>
                <p className="font-medium">{weatherInfo.weather || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">気温</span>
                <p className="font-medium">{weatherInfo.temperature ? `${weatherInfo.temperature}℃` : "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">水温</span>
                <p className="font-medium">{weatherInfo.water_temperature ? `${weatherInfo.water_temperature}℃` : "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">風向</span>
                <p className="font-medium">{weatherInfo.wind_direction || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">風速</span>
                <p className="font-medium">{weatherInfo.wind_speed ? `${weatherInfo.wind_speed}m` : "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">波高</span>
                <p className="font-medium">{weatherInfo.wave_height ? `${weatherInfo.wave_height}cm` : "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 直前情報 */}
      {beforeInfo && beforeInfo.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              直前情報（展示タイム）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>枠</th>
                    <th>選手番号</th>
                    <th>展示タイム</th>
                    <th>チルト</th>
                    <th>スタート展示</th>
                    <th>部品交換</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeInfo.map((info: any) => (
                    <tr key={info.lane}>
                      <td className="font-bold text-center">
                        <span className={`inline-block w-6 h-6 rounded text-white text-sm leading-6 ${
                          info.lane === 1 ? "bg-white text-black border" :
                          info.lane === 2 ? "bg-black" :
                          info.lane === 3 ? "bg-red-500" :
                          info.lane === 4 ? "bg-blue-500" :
                          info.lane === 5 ? "bg-yellow-500 text-black" :
                          "bg-green-500"
                        }`}>
                          {info.lane}
                        </span>
                      </td>
                      <td className="text-center">{info.racer_no || "-"}</td>
                      <td className="text-center font-mono">{info.exhibition_time || "-"}</td>
                      <td className="text-center">{info.tilt || "-"}</td>
                      <td className="text-center font-mono">{info.start_exhibition || "-"}</td>
                      <td className="text-sm">{info.parts_changed || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* オッズデータ */}
      <Tabs defaultValue="latest" className="space-y-4">
        <TabsList>
          <TabsTrigger value="latest" className="flex items-center gap-1">
            <Table2 className="h-4 w-4" />
            最新オッズ
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            オッズ推移
          </TabsTrigger>
        </TabsList>

        {/* 最新オッズタブ */}
        <TabsContent value="latest">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                最新オッズ一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oddsLoading ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
              ) : latestOdds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  オッズデータがありません
                </div>
              ) : (
                <div className="space-y-6">
                  {/* オッズタイプ別にグループ化して表示 */}
                  {Object.entries(
                    latestOdds.reduce((acc: Record<string, any[]>, odds: any) => {
                      const type = odds.odds_type;
                      if (!acc[type]) acc[type] = [];
                      acc[type].push(odds);
                      return acc;
                    }, {})
                  ).map(([type, odds]) => (
                    <div key={type}>
                      <h4 className="font-medium mb-2 text-primary">
                        {ODDS_TYPE_LABELS[type] || type}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="data-table w-full">
                          <thead>
                            <tr>
                              <th>組み合わせ</th>
                              <th>オッズ</th>
                              <th>更新時刻</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(odds as any[]).slice(0, 20).map((o: any, idx: number) => (
                              <tr key={idx}>
                                <td className="font-mono font-bold">{o.combination}</td>
                                <td className="font-mono text-right">
                                  {parseFloat(o.odds_value).toFixed(1)}倍
                                </td>
                                <td className="text-sm text-muted-foreground">
                                  {formatTime(o.scraped_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(odds as any[]).length > 20 && (
                          <p className="text-sm text-muted-foreground mt-2 text-center">
                            他 {(odds as any[]).length - 20} 件
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* オッズ推移タブ */}
        <TabsContent value="history">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  オッズ推移
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedOddsType} onValueChange={(v) => {
                    setSelectedOddsType(v);
                    setSelectedCombination("all");
                  }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="オッズ種別" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {availableOddsTypes.map((type: string) => (
                        <SelectItem key={type} value={type}>
                          {ODDS_TYPE_LABELS[type] || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedCombination} onValueChange={setSelectedCombination}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="組み合わせ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {availableCombinations.map((combo: string) => (
                        <SelectItem key={combo} value={combo}>
                          {combo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {oddsLoading ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
              ) : Object.keys(oddsTimeSeries).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  オッズ推移データがありません
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 推移テーブル */}
                  {Object.entries(oddsTimeSeries).slice(0, 10).map(([combo, data]) => (
                    <div key={combo} className="border rounded-lg p-4">
                      <h4 className="font-mono font-bold mb-3 text-lg">{combo}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {(data as any[]).map((point: any, idx: number) => (
                          <div key={idx} className="bg-muted/30 rounded p-2 text-center">
                            <div className="text-xs text-muted-foreground">
                              {point.time.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="font-mono font-bold">
                              {point.value.toFixed(1)}
                            </div>
                            {point.minutesToDeadline && (
                              <div className="text-xs text-muted-foreground">
                                締切{point.minutesToDeadline}分前
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* 変動サマリー */}
                      {(data as any[]).length >= 2 && (
                        <div className="mt-3 flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            初期: <span className="font-mono">{(data as any[])[0].value.toFixed(1)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            最新: <span className="font-mono">{(data as any[])[(data as any[]).length - 1].value.toFixed(1)}</span>
                          </span>
                          <span className={
                            (data as any[])[(data as any[]).length - 1].value > (data as any[])[0].value
                              ? "text-red-500"
                              : (data as any[])[(data as any[]).length - 1].value < (data as any[])[0].value
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }>
                            変動: {(
                              ((data as any[])[(data as any[]).length - 1].value - (data as any[])[0].value) /
                              (data as any[])[0].value * 100
                            ).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {Object.keys(oddsTimeSeries).length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      他 {Object.keys(oddsTimeSeries).length - 10} 件の組み合わせ
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* データ統計 */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">総オッズ件数:</span>
              <span className="ml-2 font-bold">{oddsHistory?.length || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">オッズ種別:</span>
              <span className="ml-2 font-bold">{availableOddsTypes.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">組み合わせ数:</span>
              <span className="ml-2 font-bold">{availableCombinations.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
