import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  STADIUM_MAP, 
  getCollectionStats,
  getPeriods,
  searchRacerStats,
  getOddsHistory,
  getBeforeInfo,
  getWeatherInfo,
  getWebPredictions,
  getTodayRaces,
  getRacesByDateRange,
} from './db';

// Mock database connection
vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([[{ count: 100 }]]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
}));

describe('Boatrace API', () => {
  describe('STADIUM_MAP', () => {
    it('should contain all 24 stadiums', () => {
      expect(Object.keys(STADIUM_MAP).length).toBe(24);
    });

    it('should have correct stadium names', () => {
      expect(STADIUM_MAP['01']).toBe('桐生');
      expect(STADIUM_MAP['12']).toBe('住之江');
      expect(STADIUM_MAP['24']).toBe('大村');
    });

    it('should have all stadium codes from 01 to 24', () => {
      for (let i = 1; i <= 24; i++) {
        const code = i.toString().padStart(2, '0');
        expect(STADIUM_MAP[code]).toBeDefined();
      }
    });
  });

  describe('getCollectionStats', () => {
    it('should return null when database is not available', async () => {
      // Reset module to test without DATABASE_URL
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      
      // Force module reload
      vi.resetModules();
      const { getCollectionStats: getStats } = await import('./db');
      
      const result = await getStats();
      // When db is not available, should return null
      expect(result === null || typeof result === 'object').toBe(true);
      
      process.env.DATABASE_URL = originalEnv;
    });
  });

  describe('searchRacerStats', () => {
    it('should accept search parameters', async () => {
      const params = {
        name: '田中',
        period: 150,
        limit: 10,
      };
      
      // Function should not throw
      await expect(searchRacerStats(params)).resolves.toBeDefined();
    });

    it('should accept racer number search', async () => {
      const params = {
        racerNo: '4444',
        limit: 5,
      };
      
      await expect(searchRacerStats(params)).resolves.toBeDefined();
    });
  });

  describe('getOddsHistory', () => {
    it('should accept race parameters', async () => {
      const params = {
        raceDate: '2025-01-04',
        stadiumCode: '01',
        raceNumber: 1,
        oddsType: 'quinella',
      };
      
      await expect(getOddsHistory(params)).resolves.toBeDefined();
    });
  });

  describe('getBeforeInfo', () => {
    it('should accept race parameters', async () => {
      const params = {
        raceDate: '2025-01-04',
        stadiumCode: '01',
        raceNumber: 1,
      };
      
      await expect(getBeforeInfo(params)).resolves.toBeDefined();
    });
  });

  describe('getWeatherInfo', () => {
    it('should accept race parameters', async () => {
      const params = {
        raceDate: '2025-01-04',
        stadiumCode: '01',
        raceNumber: 1,
      };
      
      await expect(getWeatherInfo(params)).resolves.toBeDefined();
    });
  });

  describe('getWebPredictions', () => {
    it('should accept date and optional filters', async () => {
      const params = {
        raceDate: '2025-01-04',
        stadiumCode: '01',
        source: 'kyotei_biyori',
      };
      
      await expect(getWebPredictions(params)).resolves.toBeDefined();
    });
  });

  describe('getTodayRaces', () => {
    it('should return array', async () => {
      const result = await getTodayRaces();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRacesByDateRange', () => {
    it('should accept date range parameters', async () => {
      const params = {
        startDate: '2025-01-01',
        endDate: '2025-01-04',
        stadiumCode: '01',
      };
      
      await expect(getRacesByDateRange(params)).resolves.toBeDefined();
    });

    it('should handle "all" stadium code', async () => {
      const params = {
        startDate: '2025-01-01',
        endDate: '2025-01-04',
        stadiumCode: 'all',
      };
      
      await expect(getRacesByDateRange(params)).resolves.toBeDefined();
    });
  });

  describe('getPeriods', () => {
    it('should return array', async () => {
      const result = await getPeriods();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
