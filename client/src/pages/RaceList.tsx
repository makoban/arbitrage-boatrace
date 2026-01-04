import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Trophy } from "lucide-react";

export default function RaceList() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStadium, setSelectedStadium] = useState<string>("all");

  const { data: stadiums } = trpc.boatrace.getStadiums.useQuery();
  const { data: raceDates } = trpc.boatrace.getRaceDates.useQuery({ limit: 30 });
  
  const { data: races, isLoading } = trpc.boatrace.getRaces.useQuery({
    date: selectedDate || undefined,
    stadiumCode: selectedStadium !== "all" ? parseInt(selectedStadium) : undefined,
    limit: 100,
  });

  // レースを会場ごとにグループ化
  const groupedRaces = useMemo(() => {
    if (!races) return {};
    return races.reduce((acc: any, race: any) => {
      const key = `${race.raceDate}-${race.stadiumName}`;
      if (!acc[key]) {
        acc[key] = {
          date: race.raceDate,
          stadium: race.stadiumName,
          stadiumCode: race.stadiumCode,
          races: [],
        };
      }
      acc[key].races.push(race);
      return acc;
    }, {});
  }, [races]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">レース一覧</h1>
        <p className="text-muted-foreground">収集済みのレースデータを閲覧</p>
      </div>

      {/* フィルター */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="日付を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての日付</SelectItem>
                  {raceDates?.map((date: any) => (
                    <SelectItem key={date} value={date}>
                      {new Date(date).toLocaleDateString("ja-JP")}
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
                  {stadiums?.map((stadium: any) => (
                    <SelectItem key={stadium.code} value={String(stadium.code)}>
                      {stadium.name}
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
        <div className="text-center py-8 text-muted-foreground">
          レースデータがありません
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedRaces).map((group: any) => (
            <Card key={`${group.date}-${group.stadiumCode}`} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-4 w-4" />
                  {group.stadium}
                  <span className="text-sm text-muted-foreground ml-2">
                    {new Date(group.date).toLocaleDateString("ja-JP")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {group.races.map((race: any) => (
                    <div
                      key={race.id}
                      className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-center">
                        {race.raceNumber}R
                      </div>
                      {race.result ? (
                        <div className="text-center text-sm mt-1">
                          <Trophy className="h-3 w-3 inline mr-1 text-yellow-500" />
                          {race.result}
                        </div>
                      ) : (
                        <div className="text-center text-xs text-muted-foreground mt-1">
                          未確定
                        </div>
                      )}
                    </div>
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
