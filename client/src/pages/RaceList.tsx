import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Trophy, ChevronRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

// 会場コードと名前のマッピング
const STADIUM_MAP: Record<string, string> = {
  "01": "桐生", "02": "戸田", "03": "江戸川", "04": "平和島", "05": "多摩川",
  "06": "浜名湖", "07": "蒲郡", "08": "常滑", "09": "津", "10": "三国",
  "11": "びわこ", "12": "住之江", "13": "尼崎", "14": "鳴門", "15": "丸亀",
  "16": "児島", "17": "宮島", "18": "徳山", "19": "下関", "20": "若松",
  "21": "芦屋", "22": "福岡", "23": "唐津", "24": "大村",
};

export default function RaceList() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStadium, setSelectedStadium] = useState<string>("all");

  // TiDB/MySQLのodds_historyからレース一覧を取得
  const { data: raceData, isLoading } = trpc.boatrace.getRacesByDateRange.useQuery({
    startDate: selectedDate || undefined,
    endDate: selectedDate || undefined,
    stadiumCode: selectedStadium !== "all" ? selectedStadium : undefined,
  });

  // 利用可能な日付一覧を取得
  const { data: availableDates } = trpc.boatrace.getAvailableDates.useQuery();

  // レースを会場ごとにグループ化
  const groupedRaces = useMemo(() => {
    if (!raceData) return {};
    return raceData.reduce((acc: any, race: any) => {
      const dateStr = typeof race.race_date === 'string' 
        ? race.race_date.split('T')[0] 
        : new Date(race.race_date).toISOString().split('T')[0];
      const stadiumName = STADIUM_MAP[race.stadium_code] || `場${race.stadium_code}`;
      const key = `${dateStr}-${stadiumName}`;
      if (!acc[key]) {
        acc[key] = {
          date: dateStr,
          stadium: stadiumName,
          stadiumCode: race.stadium_code,
          races: [],
        };
      }
      acc[key].races.push({
        ...race,
        raceDate: dateStr,
      });
      return acc;
    }, {});
  }, [raceData]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">レース一覧</h1>
        <p className="text-muted-foreground">収集済みのレースデータを閲覧・オッズ推移を確認</p>
      </div>

      {/* フィルター */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="日付を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべての日付</SelectItem>
                  {availableDates?.map((date: string) => (
                    <SelectItem key={date} value={date}>
                      {formatDate(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedStadium} onValueChange={setSelectedStadium}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="会場を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての会場</SelectItem>
                  {Object.entries(STADIUM_MAP).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedDate("");
                setSelectedStadium("all");
              }}
            >
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* レース一覧 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
      ) : Object.keys(groupedRaces).length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">レースデータがありません</h2>
            <p className="text-muted-foreground">
              指定した条件に該当するレースデータが見つかりませんでした。
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              日付や会場の条件を変更してお試しください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedRaces).map((group: any) => (
            <Card key={`${group.date}-${group.stadiumCode}`} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-4 w-4" />
                  {group.stadium}
                  <span className="text-sm text-muted-foreground ml-2">
                    {formatDate(group.date)}
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">
                    {group.races.length}R
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {group.races
                    .sort((a: any, b: any) => a.race_number - b.race_number)
                    .map((race: any) => (
                    <Link
                      key={`${race.raceDate}-${race.stadium_code}-${race.race_number}`}
                      href={`/odds/${race.raceDate}/${race.stadium_code}/${race.race_number}`}
                    >
                      <div className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 hover:border-primary border border-transparent transition-all cursor-pointer group">
                        <div className="font-medium text-center flex items-center justify-center gap-1">
                          {race.race_number}R
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-center text-xs text-muted-foreground mt-1">
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {race.odds_count || 0}件
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
