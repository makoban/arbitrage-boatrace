import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function RacerStats() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">レーサー検索</h1>
        <p className="text-muted-foreground">レーサーの成績データを検索</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">準備中</h2>
          <p className="text-muted-foreground">
            レーサー検索機能は現在開発中です。
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            今後のアップデートで追加予定です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
