import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Users, Trophy, ChevronLeft, ChevronRight } from "lucide-react";

// レーサー詳細モーダル
function RacerDetailModal({
  racerNo,
  open,
  onClose,
}: {
  racerNo: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: racer, isLoading } = trpc.racer.getDetail.useQuery(
    { racerNo: racerNo || "" },
    { enabled: !!racerNo && open }
  );

  if (!racerNo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>レーサー詳細</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
        ) : racer ? (
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">選手登録番号</p>
                <p className="text-lg font-bold">{racer.racerNo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">氏名</p>
                <p className="text-lg font-bold">{racer.nameKanji || "-"}</p>
                <p className="text-sm text-muted-foreground">{racer.nameKana || ""}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">支部</p>
                <p className="font-medium">{racer.branch || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">級別</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                  racer.rank === "A1" ? "bg-yellow-500/20 text-yellow-500" :
                  racer.rank === "A2" ? "bg-orange-500/20 text-orange-500" :
                  racer.rank === "B1" ? "bg-blue-500/20 text-blue-500" :
                  "bg-gray-500/20 text-gray-500"
                }`}>
                  {racer.rank || "-"}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">年齢</p>
                <p className="font-medium">{racer.age ? `${racer.age}歳` : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">体重</p>
                <p className="font-medium">{racer.weight ? `${racer.weight}kg` : "-"}</p>
              </div>
            </div>

            {/* 期別成績履歴 */}
            {racer.periodStats && racer.periodStats.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">期別成績履歴</h3>
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>期</th>
                        <th>級別</th>
                        <th>勝率</th>
                        <th>複勝率</th>
                        <th>平均ST</th>
                        <th>出走数</th>
                        <th>1着</th>
                        <th>2着</th>
                      </tr>
                    </thead>
                    <tbody>
                      {racer.periodStats.map((stat: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-medium">
                            {stat.dataYear}年{stat.dataPeriod === 1 ? "前期" : "後期"}
                          </td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              stat.rank === "A1" ? "bg-yellow-500/20 text-yellow-500" :
                              stat.rank === "A2" ? "bg-orange-500/20 text-orange-500" :
                              stat.rank === "B1" ? "bg-blue-500/20 text-blue-500" :
                              "bg-gray-500/20 text-gray-500"
                            }`}>
                              {stat.rank || "-"}
                            </span>
                          </td>
                          <td className="font-medium">{stat.winRate?.toFixed(2) || "-"}</td>
                          <td>{stat.placeRate?.toFixed(1) || "-"}</td>
                          <td>{stat.avgSt?.toFixed(2) || "-"}</td>
                          <td>{stat.raceCount || "-"}</td>
                          <td>{stat.firstCount || "-"}</td>
                          <td>{stat.secondCount || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            レーサー情報が見つかりません
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function RacerStats() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRank, setSelectedRank] = useState<string>("__all__");
  const [selectedBranch, setSelectedBranch] = useState<string>("__all__");
  const [page, setPage] = useState(0);
  const [selectedRacerNo, setSelectedRacerNo] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const pageSize = 20;

  // レーサー統計
  const { data: stats } = trpc.racer.getStats.useQuery();

  // 支部一覧
  const { data: branches } = trpc.racer.getBranches.useQuery();

  // 級別一覧
  const { data: ranks } = trpc.racer.getRanks.useQuery();

  // レーサー検索
  const { data: racers, isLoading } = trpc.racer.search.useQuery({
    query: searchQuery || undefined,
    rank: selectedRank === "__all__" ? undefined : selectedRank,
    branch: selectedBranch === "__all__" ? undefined : selectedBranch,
    limit: pageSize,
    offset: page * pageSize,
  });

  const handleSearch = () => {
    setPage(0);
  };

  const handleRacerClick = (racerNo: string) => {
    setSelectedRacerNo(racerNo);
    setIsDetailOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedRank("__all__");
    setSelectedBranch("__all__");
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">レーサー検索</h1>
        <p className="text-muted-foreground">レーサーの成績データを検索</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              登録レーサー数
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRacers?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ユニーク選手数
            </p>
          </CardContent>
        </Card>

        {stats?.rankCounts?.slice(0, 3).map((item) => (
          <Card key={item.rank} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.rank}級
              </CardTitle>
              <Trophy className={`h-4 w-4 ${
                item.rank === "A1" ? "text-yellow-500" :
                item.rank === "A2" ? "text-orange-500" :
                "text-blue-500"
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {item.count?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                選手数
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 検索フォーム */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">検索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground mb-1 block">
                選手番号 / 氏名
              </label>
              <Input
                placeholder="例: 4444 または 山田"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                級別
              </label>
              <Select value={selectedRank} onValueChange={setSelectedRank}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">すべて</SelectItem>
                  {ranks?.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                支部
              </label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">すべて</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              検索
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">検索結果</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              読み込み中...
            </div>
          ) : racers && racers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>選手番号</th>
                      <th>氏名</th>
                      <th>支部</th>
                      <th>級別</th>
                      <th>勝率</th>
                      <th>複勝率</th>
                      <th>平均ST</th>
                      <th>出走数</th>
                      <th>期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {racers.map((racer, idx) => (
                      <tr
                        key={`${racer.racerNo}-${idx}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRacerClick(racer.racerNo)}
                      >
                        <td className="font-medium text-primary">
                          {racer.racerNo}
                        </td>
                        <td>
                          <div>{racer.nameKanji || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {racer.nameKana || ""}
                          </div>
                        </td>
                        <td>{racer.branch || "-"}</td>
                        <td>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            racer.rank === "A1" ? "bg-yellow-500/20 text-yellow-500" :
                            racer.rank === "A2" ? "bg-orange-500/20 text-orange-500" :
                            racer.rank === "B1" ? "bg-blue-500/20 text-blue-500" :
                            "bg-gray-500/20 text-gray-500"
                          }`}>
                            {racer.rank || "-"}
                          </span>
                        </td>
                        <td className="font-medium">
                          {racer.winRate?.toFixed(2) || "-"}
                        </td>
                        <td>{racer.placeRate?.toFixed(1) || "-"}</td>
                        <td>{racer.avgSt?.toFixed(2) || "-"}</td>
                        <td>{racer.raceCount || "-"}</td>
                        <td className="text-sm text-muted-foreground">
                          {racer.dataYear}年{racer.dataPeriod === 1 ? "前期" : "後期"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ページネーション */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {page * pageSize + 1} - {page * pageSize + racers.length} 件を表示
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    前へ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={racers.length < pageSize}
                  >
                    次へ
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery || selectedRank !== "__all__" || selectedBranch !== "__all__"
                ? "該当するレーサーが見つかりません"
                : "検索条件を入力してください"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* レーサー詳細モーダル */}
      <RacerDetailModal
        racerNo={selectedRacerNo}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
