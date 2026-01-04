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
  getPgRaceDetail,
  getPgRaceDates,
  getPgStadiums,
} from "./pgdb";
import {
  getOddsHistory,
  getBeforeInfo,
  getWeatherInfo,
  getCollectionStats,
  getRacesByDateRange,
  getTodayRaces,
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

  // 競艇データAPI（TiDB/MySQL - odds_history等）
  boatrace: router({
    // 会場マスタ
    getStadiums: publicProcedure.query(async () => {
      return Object.entries(STADIUM_MAP).map(([code, name]) => ({
        code,
        name,
      }));
    }),

    // 統計情報（TiDB）
    getCollectionStats: publicProcedure.query(async () => {
      return await getCollectionStats();
    }),

    // 本日のレース一覧（TiDB）
    getTodayRaces: publicProcedure.query(async () => {
      const races = await getTodayRaces();
      return races.map((r: any) => ({
        ...r,
        stadiumName: STADIUM_MAP[r.stadium_code] || `場${r.stadium_code}`,
      }));
    }),

    // 日付範囲でレース一覧を取得（TiDB）
    getRacesByDateRange: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        stadiumCode: z.string().optional(),
      }))
      .query(async ({ input }) => {
        // デフォルトは過去30日
        const endDate = input.endDate || new Date().toISOString().split('T')[0];
        const startDate = input.startDate || (() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d.toISOString().split('T')[0];
        })();
        
        return await getRacesByDateRange({
          startDate,
          endDate,
          stadiumCode: input.stadiumCode,
        });
      }),

    // 利用可能な日付一覧を取得
    getAvailableDates: publicProcedure.query(async () => {
      const races = await getRacesByDateRange({
        startDate: '2020-01-01',
        endDate: new Date().toISOString().split('T')[0],
      });
      const dates = Array.from(new Set(races.map((r: any) => {
        const d = r.race_date;
        return typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
      })));
      return dates.sort().reverse();
    }),

    // オッズ履歴（TiDB - 時系列データ）
    getOddsHistory: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
        oddsType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getOddsHistory({
          raceDate: input.raceDate,
          stadiumCode: input.stadiumCode,
          raceNumber: input.raceNumber,
          oddsType: input.oddsType,
        });
      }),

    // 直前情報（TiDB）
    getBeforeInfo: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getBeforeInfo({
          raceDate: input.raceDate,
          stadiumCode: input.stadiumCode,
          raceNumber: input.raceNumber,
        });
      }),

    // 水面気象情報（TiDB）
    getWeatherInfo: publicProcedure
      .input(z.object({
        raceDate: z.string(),
        stadiumCode: z.string(),
        raceNumber: z.number(),
      }))
      .query(async ({ input }) => {
        return await getWeatherInfo({
          raceDate: input.raceDate,
          stadiumCode: input.stadiumCode,
          raceNumber: input.raceNumber,
        });
      }),

    // === PostgreSQL API（レガシー、必要に応じて使用） ===
    
    // レース一覧（PostgreSQL - フィルタ付き）
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

    // 開催日一覧（PostgreSQL）
    getRaceDates: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getPgRaceDates(input.limit || 30);
      }),

    // レース詳細（PostgreSQL）
    getRaceDetail: publicProcedure
      .input(z.object({
        raceId: z.number(),
      }))
      .query(async ({ input }) => {
        return await getPgRaceDetail(input.raceId);
      }),

    // オッズ履歴（PostgreSQL - raceId指定）
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
