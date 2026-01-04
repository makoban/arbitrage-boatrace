import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * オッズ履歴テーブル - 10秒間隔の高頻度データ
 * 注: 実際のデータはRenderのPostgreSQLに存在
 */
export const oddsHistory = mysqlTable("odds_history", {
  id: int("id").autoincrement().primaryKey(),
  raceDate: date("race_date").notNull(),
  stadiumCode: varchar("stadium_code", { length: 2 }).notNull(),
  raceNumber: int("race_number").notNull(),
  oddsType: varchar("odds_type", { length: 10 }).notNull(), // 2t, 2f, win, place
  combination: varchar("combination", { length: 10 }).notNull(), // 1-2, 1-3, etc.
  oddsValue: decimal("odds_value", { precision: 10, scale: 2 }),
  scrapedAt: timestamp("scraped_at").notNull(),
  minutesToDeadline: int("minutes_to_deadline"),
});

/**
 * レーサー期別成績テーブル
 */
export const racerPeriodStats = mysqlTable("racer_period_stats", {
  id: int("id").autoincrement().primaryKey(),
  racerNo: varchar("racer_no", { length: 4 }).notNull(),
  dataYear: int("data_year").notNull(),
  dataPeriod: int("data_period").notNull(), // 1=前期, 2=後期
  nameKanji: varchar("name_kanji", { length: 20 }),
  nameKana: varchar("name_kana", { length: 40 }),
  branch: varchar("branch", { length: 10 }),
  rank: varchar("rank", { length: 2 }),
  birthYear: int("birth_year"),
  gender: varchar("gender", { length: 2 }),
  weight: int("weight"),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  doubleRate: decimal("double_rate", { precision: 5, scale: 2 }),
  avgSt: decimal("avg_st", { precision: 4, scale: 2 }),
  raceCount: int("race_count"),
  rank1Count: int("rank1_count"),
  rank2Count: int("rank2_count"),
});

/**
 * 直前情報テーブル
 */
export const beforeInfo = mysqlTable("boatrace_beforeinfo", {
  id: int("id").autoincrement().primaryKey(),
  raceDate: date("race_date").notNull(),
  stadiumCode: varchar("stadium_code", { length: 2 }).notNull(),
  raceNumber: int("race_number").notNull(),
  lane: int("lane").notNull(),
  racerNo: varchar("racer_no", { length: 4 }),
  exhibitionTime: decimal("exhibition_time", { precision: 5, scale: 2 }),
  tilt: decimal("tilt", { precision: 3, scale: 1 }),
  partsChanged: text("parts_changed"),
  startExhibition: decimal("start_exhibition", { precision: 4, scale: 2 }),
  scrapedAt: timestamp("scraped_at").notNull(),
});

/**
 * 水面気象情報テーブル
 */
export const weatherInfo = mysqlTable("boatrace_weather", {
  id: int("id").autoincrement().primaryKey(),
  raceDate: date("race_date").notNull(),
  stadiumCode: varchar("stadium_code", { length: 2 }).notNull(),
  raceNumber: int("race_number").notNull(),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  weather: varchar("weather", { length: 20 }),
  windDirection: varchar("wind_direction", { length: 10 }),
  windSpeed: int("wind_speed"),
  waterTemperature: decimal("water_temperature", { precision: 4, scale: 1 }),
  waveHeight: int("wave_height"),
  scrapedAt: timestamp("scraped_at").notNull(),
});

/**
 * WEB予想情報テーブル
 */
export const webPredictions = mysqlTable("web_predictions", {
  id: int("id").autoincrement().primaryKey(),
  raceDate: date("race_date").notNull(),
  stadiumCode: varchar("stadium_code", { length: 2 }).notNull(),
  raceNumber: int("race_number").notNull(),
  source: varchar("source", { length: 50 }).notNull(), // kyoteibiyori, official_computer
  predictionType: varchar("prediction_type", { length: 20 }), // 2t, 2f
  prediction: text("prediction"), // JSON形式の予想データ
  confidence: int("confidence"),
  scrapedAt: timestamp("scraped_at").notNull(),
});

/**
 * 予想的中履歴テーブル
 */
export const predictionResults = mysqlTable("prediction_results", {
  id: int("id").autoincrement().primaryKey(),
  predictionId: int("prediction_id"),
  raceDate: date("race_date").notNull(),
  stadiumCode: varchar("stadium_code", { length: 2 }).notNull(),
  raceNumber: int("race_number").notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  isHit: int("is_hit"), // 1=的中, 0=不的中
  payout: decimal("payout", { precision: 10, scale: 0 }),
  checkedAt: timestamp("checked_at"),
});

/**
 * 場状況ランキング履歴テーブル
 */
export const stadiumRankings = mysqlTable("stadium_rankings_history", {
  id: int("id").autoincrement().primaryKey(),
  rankingType: varchar("ranking_type", { length: 50 }).notNull(),
  rank: int("rank").notNull(),
  stadiumName: varchar("stadium_name", { length: 20 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  scrapedAt: timestamp("scraped_at").notNull(),
});
