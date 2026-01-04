import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getPgCollectionStats,
  getPgTodayRaces,
  getPgRaces,
  getPgOddsHistory,
  getPgOddsHistoryByRace,
  getPgRaceDetail,
  getPgRaceDates,
  getPgStadiums,
  getPgBeforeInfo,
  getPgWeatherInfo,
  getPgPayoffs,
  getPgRaceResult,
  getPgRacesByDateRange,
  getPgAvailableDates,
  getStadiumName,
} from "./pgdb";

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

  // 競艇データAPI（PostgreSQL）
  boatrace: router({
    // 会場マスタ
    getStadiums: publicProcedure.query(async () => {
      return await getPgStadiums();
    }),

    // 統計情報
    getCollectionStats: publicProcedure.query(async () => {
      return await getPgCollectionStats();
    }),

    // 本日のレース一覧
    getTodayRaces: publicProcedure.query(async () => {
      return await getPgTodayRaces();
    }),

    // 日付範囲でレース一覧を取得（odds_historyから）
    getRacesByDateRange: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        stadiumCode: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getPgRacesByDateRange(input);
      }),

    // 利用可能な日付一覧を取得
    getAvailableDates: publicProcedure.query(async () => {
      return await getPgAvailableDates();
    }),

    // オッズ履歴（日付・会場・レース番号指定）
    getOddsHistory: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
        oddsType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getPgOddsHistoryByRace(input);
      }),

    // 直前情報
    getBeforeInfo: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgBeforeInfo(input);
      }),

    // 水面気象情報
    getWeatherInfo: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgWeatherInfo(input);
      }),

    // 払戻金
    getPayoffs: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgPayoffs(input);
      }),

    // レース結果
    getRaceResult: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgRaceResult(input);
      }),

    // レース一覧（フィルタ付き）
    getRaces: publicProcedure
      .input(z.object({
        date: z.string().optional(),
        stadiumCode: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getPgRaces(input);
      }),

    // 開催日一覧
    getRaceDates: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getPgRaceDates(input.limit || 30);
      }),

    // レース詳細
    getRaceDetail: publicProcedure
      .input(z.object({
        raceId: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgRaceDetail(input.raceId);
      }),

    // オッズ履歴（raceId指定 - レガシー）
    getPgOddsHistory: publicProcedure
      .input(z.object({
        raceId: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgOddsHistory(input.raceId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
