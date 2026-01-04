import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Hash, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function RaceList() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [stadiumCode, setStadiumCode] = useState<string>("");

  const { data: stadiums } = trpc.boatrace.getStadiums.useQuery();
  const { data: races, isLoading } = trpc.boatrace.getRacesByDateRange.useQuery({
    startDate,
    endDate,
    stadiumCode: stadiumCode || undefined,
  });

  // レースをグループ化（日付 → 会場）
  const groupedRaces = races?.reduce((acc: any, race: any) => {
    const dateKey = race.race_date;
    if (!acc[dateKey]) {
      acc[dateKey] = {};
    }
    const stadiumKey = race.stadium_code;
    if (!acc[dateKey][stadiumKey]) {
      acc[dateKey][stadiumKey] = {
        stadiumName: race.stadiumName,
        races: [],
      };
    }
    acc[dateKey][stadiumKey].races.push(race);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">レース一覧</h1>
        <p className="text-muted-foreground mt-1">
          日付・会場でフィルタリングしてレースを検索
        </p>
      </div>

      {/* フィルター */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">開始日</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-input"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">終了日</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                  setStartDate(today);
                  setEndDate(today);
                  setStadiumCode("");
                }}
              >
                リセット
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* レース一覧 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
      ) : groupedRaces && Object.keys(groupedRaces).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedRaces)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, stadiums]: [string, any]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {new Date(date).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stadiums).map(([code, stadium]: [string, any]) => (
                    <Card key={code} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-accent" />
                          {stadium.stadiumName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                          {stadium.races
                            .sort((a: any, b: any) => a.race_number - b.race_number)
                            .map((race: any) => (
                              <Link
                                key={race.race_number}
                                href={`/odds/${date}/${code}/${race.race_number}`}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                >
                                  {race.race_number}R
                                </Button>
                              </Link>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          オッズ: {stadium.races.reduce((sum: number, r: any) => sum + (r.odds_count || 0), 0).toLocaleString()}件
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            該当するレースがありません
          </CardContent>
        </Card>
      )}
    </div>
  );
}
