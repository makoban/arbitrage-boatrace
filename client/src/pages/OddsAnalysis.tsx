import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { Link, useParams } from "wouter";

export default function OddsAnalysis() {
  const params = useParams();
  const { date, stadium, race } = params as { date: string; stadium: string; race: string };

  return (
    <div className="space-y-6">
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
            {date} / 場{stadium} / {race}R
          </p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">準備中</h2>
          <p className="text-muted-foreground">
            オッズ分析機能は現在開発中です。
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            今後のアップデートで追加予定です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
