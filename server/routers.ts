import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getOddsHistory,
  searchRacerStats,
  getBeforeInfo,
  getWeatherInfo,
  getWebPredictions,
  getPredictionAccuracy,
  getCollectionStats,
  getStadiumRankings,
  detectOddsAnomaly,
  getTodayRaces,
  getRacesByDateRange,
  getPeriods,
  getRacerDetail,
  STADIUM_MAP,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 競艇データAPI
  boatrace: router({
    // 会場マスタ
    getStadiums: publicProcedure.query(() => {
      return Object.entries(STADIUM_MAP).map(([code, name]) => ({
        code,
        name,
      }));
    }),

    // 本日のレース一覧
    getTodayRaces: publicProcedure.query(async () => {
      const races = await getTodayRaces();
      return races.map((race: any) => ({
        ...race,
        stadiumName: STADIUM_MAP[race.stadium_code] || race.stadium_code,
      }));
    }),

    // 日付範囲でレース一覧
    getRacesByDateRange: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        stadiumCode: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const races = await getRacesByDateRange(input);
        return races.map((race: any) => ({
          ...race,
          stadiumName: STADIUM_MAP[race.stadium_code] || race.stadium_code,
        }));
      }),

    // オッズ履歴（時系列）
    getOddsHistory: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
        oddsType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getOddsHistory(input);
      }),

    // オッズ異常検知（アービトラージ分析）
    detectOddsAnomaly: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
        threshold: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await detectOddsAnomaly(input);
      }),

    // レーサー成績検索
    searchRacerStats: publicProcedure
      .input(z.object({
        racerNo: z.string().optional(),
        name: z.string().optional(),
        year: z.number().optional(),
        period: z.number().optional(),
        branch: z.string().optional(),
        rank: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await searchRacerStats(input);
      }),

    // 期別一覧
    getPeriods: publicProcedure.query(async () => {
      return await getPeriods();
    }),

    // レーサー詳細
    getRacerDetail: publicProcedure
      .input(z.object({
        racerId: z.number(),
        period: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getRacerDetail(input);
      }),

    // 直前情報
    getBeforeInfo: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getBeforeInfo(input);
      }),

    // 水面気象情報
    getWeatherInfo: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getWeatherInfo(input);
      }),

    // WEB予想情報
    getWebPredictions: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string().optional(),
        raceNumber: z.number().optional(),
        source: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const predictions = await getWebPredictions(input);
        return predictions.map((pred: any) => ({
          ...pred,
          stadiumName: STADIUM_MAP[pred.stadium_code] || pred.stadium_code,
        }));
      }),

    // 予想的中率
    getPredictionAccuracy: publicProcedure
      .input(z.object({
        source: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getPredictionAccuracy(input);
      }),

    // 場状況ランキング
    getStadiumRankings: publicProcedure.query(async () => {
      return await getStadiumRankings();
    }),

    // データ収集統計
    getCollectionStats: publicProcedure.query(async () => {
      return await getCollectionStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
