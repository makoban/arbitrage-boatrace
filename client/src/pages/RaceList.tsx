import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, TrendingUp, ChevronRight, Filter } from "lucide-react";
import { Link } from "wouter";

// 会場コードと名前のマッピング
const STADIUM_MAP: Record<string, string> = {
  "01": "桐生", "02": "戸田", "03": "江戸川", "04": "平和島", "05": "多摩川",
  "06": "浜名湖", "07": "蒲郡", "08": "常滑", "09": "津", "10": "三国",
  "11": "びわこ", "12": "住之江", "13": "尼崎", "14": "鳴門", "15": "丸亀",
  "16": "児島", "17": "宮島", "18": "徳山", "19": "下関", "20": "若松",
  "21": "芦屋", "22": "福岡", "23": "唐津", "24": "大村",
  "1": "桐生", "2": "戸田", "3": "江戸川", "4": "平和島", "5": "多摩川",
  "6": "浜名湖", "7": "蒲郡", "8": "常滑", "9": "津",
};

export default function RaceList() {
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedStadium, setSelectedStadium] = useState<string>("all");

  // 利用可能な日付を取得
  const { data: availableDates } = trpc.boatrace.getAvailableDates.useQuery();

  // レース一覧を取得（odds_historyから）
  const { data: races, isLoading } = trpc.boatrace.getRacesByDateRange.useQuery({
    startDate: selectedDate !== "all" ? selectedDate : undefined,
    endDate: selectedDate !== "all" ? selectedDate : undefined,
    stadiumCode: selectedStadium !== "all" ? selectedStadium : undefined,
  });

  // 会場一覧を取得
  const { data: stadiums } = trpc.boatrace.getStadiums.useQuery();

  // 日付でグループ化
  const racesByDate = useMemo(() => {
    if (!races) return {};
    return races.reduce((acc: Record<string, any[]>, race: any) => {
      const dateStr = typeof race.race_date === 'string' 
        ? race.race_date.split('T')[0] 
        : new Date(race.race_date).toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(race);
      return acc;
    }, {});
  }, [races]);

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

  // 会場名を取得
  const getStadiumName = (code: string | number) => {
    const strCode = String(code).padStart(2, '0');
    return STADIUM_MAP[strCode] || STADIUM_MAP[String(code)] || `場${code}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">レース一覧</h1>
          <p className="text-muted-foreground mt-1">
            オッズデータのあるレースを表示
          </p>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="日付を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての日付</SelectItem>
              {availableDates?.map((date: any) => {
                const dateStr = typeof date === 'string' 
                  ? date.split('T')[0] 
                  : new Date(date).toISOString().split('T')[0];
                return (
                  <SelectItem key={dateStr} value={dateStr}>
                    {formatDate(dateStr)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={selectedStadium} onValueChange={setSelectedStadium}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="会場を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての会場</SelectItem>
              {stadiums?.map((stadium: any) => (
                <SelectItem key={stadium.code} value={String(stadium.code).padStart(2, '0')}>
                  {stadium.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
      ) : !races || races.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>オッズデータのあるレースがありません</p>
            <p className="text-sm mt-2">データ収集が開始されるとここに表示されます</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(racesByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateRaces]) => (
              <Card key={date} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatDate(date)}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({dateRaces.length}レース)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 会場ごとにグループ化 */}
                  {Object.entries(
                    dateRaces.reduce((acc: Record<string, any[]>, race: any) => {
                      const stadiumCode = race.stadium_code;
                      if (!acc[stadiumCode]) {
                        acc[stadiumCode] = [];
                      }
                      acc[stadiumCode].push(race);
                      return acc;
                    }, {})
                  )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([stadiumCode, stadiumRaces]) => (
                      <div key={stadiumCode} className="mb-4 last:mb-0">
                        <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {getStadiumName(stadiumCode)}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {(stadiumRaces as any[])
                            .sort((a, b) => a.race_number - b.race_number)
                            .map((race: any) => {
                              const dateStr = typeof race.race_date === 'string'
                                ? race.race_date.split('T')[0]
                                : new Date(race.race_date).toISOString().split('T')[0];
                              const stadiumCodeStr = String(race.stadium_code).padStart(2, '0');
                              
                              return (
                                <Link
                                  key={`${race.stadium_code}-${race.race_number}`}
                                  href={`/odds/${dateStr}/${stadiumCodeStr}/${race.race_number}`}
                                >
                                  <Button
                                    variant="outline"
                                    className="w-full justify-between hover:bg-primary/10 hover:border-primary"
                                  >
                                    <span className="font-bold">{race.race_number}R</span>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <TrendingUp className="h-3 w-3" />
                                      {race.odds_count}
                                    </span>
                                  </Button>
                                </Link>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* 統計情報 */}
      {races && races.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">表示中のレース数:</span>
                <span className="ml-2 font-bold">{races.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">日付数:</span>
                <span className="ml-2 font-bold">{Object.keys(racesByDate).length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">総オッズ件数:</span>
                <span className="ml-2 font-bold">
                  {races.reduce((sum: number, r: any) => sum + (r.odds_count || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
