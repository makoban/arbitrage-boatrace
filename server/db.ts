import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, oddsHistory, racerPeriodStats, beforeInfo, weatherInfo, webPredictions, predictionResults, stadiumRankings } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== 競艇データクエリ ==========

// 会場コードと名前のマッピング
export const STADIUM_MAP: Record<string, string> = {
  "01": "桐生",
  "02": "戸田",
  "03": "江戸川",
  "04": "平和島",
  "05": "多摩川",
  "06": "浜名湖",
  "07": "蒲郡",
  "08": "常滑",
  "09": "津",
  "10": "三国",
  "11": "びわこ",
  "12": "住之江",
  "13": "尼崎",
  "14": "鳴門",
  "15": "丸亀",
  "16": "児島",
  "17": "宮島",
  "18": "徳山",
  "19": "下関",
  "20": "若松",
  "21": "芦屋",
  "22": "福岡",
  "23": "唐津",
  "24": "大村",
};

/**
 * オッズ履歴を取得（時系列データ）
 */
export async function getOddsHistory(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
  oddsType?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  // PostgreSQLの場合は直接SQLを実行
  const result = await db.execute(sql`
    SELECT * FROM odds_history 
    WHERE race_date = ${params.raceDate}
    AND stadium_code = ${params.stadiumCode}
    AND race_number = ${params.raceNumber}
    ${params.oddsType ? sql`AND odds_type = ${params.oddsType}` : sql``}
    ORDER BY scraped_at ASC
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * レーサー期別成績を検索
 */
export async function searchRacerStats(params: {
  racerNo?: string;
  name?: string;
  year?: number;
  period?: number;
  branch?: string;
  rank?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  let whereClause = sql`1=1`;
  
  if (params.racerNo) {
    whereClause = sql`${whereClause} AND racer_no = ${params.racerNo}`;
  }
  if (params.name) {
    whereClause = sql`${whereClause} AND (name_kanji LIKE ${`%${params.name}%`} OR name_kana LIKE ${`%${params.name}%`})`;
  }
  if (params.year) {
    whereClause = sql`${whereClause} AND data_year = ${params.year}`;
  }
  if (params.period) {
    whereClause = sql`${whereClause} AND data_period = ${params.period}`;
  }
  if (params.branch) {
    whereClause = sql`${whereClause} AND branch = ${params.branch}`;
  }
  if (params.rank) {
    whereClause = sql`${whereClause} AND rank = ${params.rank}`;
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const result = await db.execute(sql`
    SELECT * FROM racer_period_stats 
    WHERE ${whereClause}
    ORDER BY data_year DESC, data_period DESC, win_rate DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM racer_period_stats WHERE ${whereClause}
  `);

  return {
    data: (result as unknown as any[][])[0] || [],
    total: ((countResult as unknown as any[][])[0])?.[0]?.total || 0,
  };
}

/**
 * 直前情報を取得
 */
export async function getBeforeInfo(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM boatrace_beforeinfo 
    WHERE race_date = ${params.raceDate}
    AND stadium_code = ${params.stadiumCode}
    AND race_number = ${params.raceNumber}
    ORDER BY lane ASC
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * 水面気象情報を取得
 */
export async function getWeatherInfo(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
}) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM boatrace_weather 
    WHERE race_date = ${params.raceDate}
    AND stadium_code = ${params.stadiumCode}
    AND race_number = ${params.raceNumber}
    LIMIT 1
  `);

  return ((result as unknown as any[][])[0])?.[0] || null;
}

/**
 * WEB予想情報を取得
 */
export async function getWebPredictions(params: {
  raceDate: string;
  stadiumCode?: string;
  raceNumber?: number;
  source?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let whereClause = sql`race_date = ${params.raceDate}`;
  
  if (params.stadiumCode) {
    whereClause = sql`${whereClause} AND stadium_code = ${params.stadiumCode}`;
  }
  if (params.raceNumber) {
    whereClause = sql`${whereClause} AND race_number = ${params.raceNumber}`;
  }
  if (params.source) {
    whereClause = sql`${whereClause} AND source = ${params.source}`;
  }

  const result = await db.execute(sql`
    SELECT * FROM web_predictions 
    WHERE ${whereClause}
    ORDER BY stadium_code, race_number, source
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * 予想的中率を計算
 */
export async function getPredictionAccuracy(params: {
  source?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let whereClause = sql`1=1`;
  
  if (params.source) {
    whereClause = sql`${whereClause} AND source = ${params.source}`;
  }
  if (params.startDate) {
    whereClause = sql`${whereClause} AND race_date >= ${params.startDate}`;
  }
  if (params.endDate) {
    whereClause = sql`${whereClause} AND race_date <= ${params.endDate}`;
  }

  const result = await db.execute(sql`
    SELECT 
      source,
      COUNT(*) as total_predictions,
      SUM(CASE WHEN is_hit = 1 THEN 1 ELSE 0 END) as hits,
      ROUND(SUM(CASE WHEN is_hit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as accuracy,
      SUM(payout) as total_payout
    FROM prediction_results 
    WHERE ${whereClause}
    GROUP BY source
    ORDER BY accuracy DESC
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * データ収集統計を取得
 */
export async function getCollectionStats() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date().toISOString().split('T')[0];

  const [oddsCount, racerCount, predictionsCount, beforeInfoCount, weatherCount, rankingsCount] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) as count FROM odds_history`),
    db.execute(sql`SELECT COUNT(*) as count FROM racer_period_stats`),
    db.execute(sql`SELECT COUNT(*) as count FROM web_predictions`),
    db.execute(sql`SELECT COUNT(*) as count FROM boatrace_beforeinfo`),
    db.execute(sql`SELECT COUNT(*) as count FROM boatrace_weather`),
    db.execute(sql`SELECT COUNT(*) as count FROM stadium_rankings_history`),
  ]);

  const [todayOdds, latestOdds] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) as count FROM odds_history WHERE race_date = ${today}`),
    db.execute(sql`SELECT MAX(scraped_at) as latest FROM odds_history`),
  ]);

  return {
    totalOdds: ((oddsCount as unknown as any[][])[0])?.[0]?.count || 0,
    totalRacers: ((racerCount as unknown as any[][])[0])?.[0]?.count || 0,
    totalPredictions: ((predictionsCount as unknown as any[][])[0])?.[0]?.count || 0,
    totalBeforeInfo: ((beforeInfoCount as unknown as any[][])[0])?.[0]?.count || 0,
    totalWeather: ((weatherCount as unknown as any[][])[0])?.[0]?.count || 0,
    totalStadiumRankings: ((rankingsCount as unknown as any[][])[0])?.[0]?.count || 0,
    todayOdds: ((todayOdds as unknown as any[][])[0])?.[0]?.count || 0,
    latestOddsTime: ((latestOdds as unknown as any[][])[0])?.[0]?.latest || null,
  };
}

/**
 * 場状況ランキングを取得
 */
export async function getStadiumRankings() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM stadium_rankings_history 
    WHERE scraped_at = (SELECT MAX(scraped_at) FROM stadium_rankings_history)
    ORDER BY ranking_type, rank
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * オッズの歪みを検知（アービトラージ分析）
 */
export async function detectOddsAnomaly(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
  threshold?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const threshold = params.threshold || 20; // デフォルト20%の変動を異常とみなす

  const result = await db.execute(sql`
    WITH odds_changes AS (
      SELECT 
        combination,
        odds_type,
        odds_value,
        scraped_at,
        LAG(odds_value) OVER (PARTITION BY combination, odds_type ORDER BY scraped_at) as prev_odds,
        minutes_to_deadline
      FROM odds_history
      WHERE race_date = ${params.raceDate}
      AND stadium_code = ${params.stadiumCode}
      AND race_number = ${params.raceNumber}
    )
    SELECT 
      combination,
      odds_type,
      odds_value as current_odds,
      prev_odds,
      scraped_at,
      minutes_to_deadline,
      ROUND(ABS(odds_value - prev_odds) / prev_odds * 100, 2) as change_percent
    FROM odds_changes
    WHERE prev_odds IS NOT NULL
    AND ABS(odds_value - prev_odds) / prev_odds * 100 > ${threshold}
    ORDER BY scraped_at DESC
    LIMIT 50
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * 本日のレース一覧を取得
 */
export async function getTodayRaces() {
  const db = await getDb();
  if (!db) return [];

  const today = new Date().toISOString().split('T')[0];

  const result = await db.execute(sql`
    SELECT DISTINCT 
      race_date,
      stadium_code,
      race_number
    FROM odds_history
    WHERE race_date = ${today}
    ORDER BY stadium_code, race_number
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * 日付範囲でレース一覧を取得
 */
export async function getRacesByDateRange(params: {
  startDate: string;
  endDate: string;
  stadiumCode?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let whereClause = sql`race_date >= ${params.startDate} AND race_date <= ${params.endDate}`;
  
  if (params.stadiumCode && params.stadiumCode !== 'all') {
    whereClause = sql`${whereClause} AND stadium_code = ${params.stadiumCode}`;
  }

  const result = await db.execute(sql`
    SELECT DISTINCT 
      race_date,
      stadium_code,
      race_number,
      COUNT(*) as odds_count
    FROM odds_history
    WHERE ${whereClause}
    GROUP BY race_date, stadium_code, race_number
    ORDER BY race_date DESC, stadium_code, race_number
    LIMIT 500
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * 期別一覧を取得
 */
export async function getPeriods() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT DISTINCT data_period as period, COUNT(*) as count
    FROM racer_period_stats
    GROUP BY data_period
    ORDER BY data_period DESC
  `);

  return (result as unknown as any[][])[0] || [];
}

/**
 * レーサー詳細を取得
 */
export async function getRacerDetail(params: {
  racerId: number;
  period?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  let whereClause = sql`racer_no = ${params.racerId.toString()}`;
  if (params.period && params.period !== 'all') {
    whereClause = sql`${whereClause} AND data_period = ${parseInt(params.period)}`;
  }

  const result = await db.execute(sql`
    SELECT * FROM racer_period_stats
    WHERE ${whereClause}
    ORDER BY data_year DESC, data_period DESC
    LIMIT 1
  `);

  const racer = ((result as unknown as any[][])[0])?.[0];
  if (!racer) return null;

  // コース別成績を取得
  const courseResult = await db.execute(sql`
    SELECT * FROM racer_period_course_stats
    WHERE racer_no = ${params.racerId.toString()}
    AND data_year = ${racer.data_year}
    AND data_period = ${racer.data_period}
    ORDER BY course
  `);

  return {
    racer_id: parseInt(racer.racer_no),
    racer_name: racer.name_kanji,
    branch: racer.branch,
    rank: racer.rank,
    period: racer.data_period,
    win_rate: racer.win_rate,
    quinella_rate: racer.quinella_rate,
    trifecta_rate: racer.trifecta_rate,
    total_races: racer.total_races,
    courseStats: ((courseResult as unknown as any[][])[0] || []).map((c: any) => ({
      course: c.course,
      races: c.total_races,
      win_rate: c.win_rate,
    })),
  };
}
