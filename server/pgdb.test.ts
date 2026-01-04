import { describe, it, expect } from 'vitest';
import { getPgCollectionStats, getPgStadiums, getPgRaceDates } from './pgdb';

// タイムアウトを延長（外部DB接続のため）
const TIMEOUT = 30000;

describe('PostgreSQL Database Connection', () => {
  it('should connect and get collection stats', async () => {
    const stats = await getPgCollectionStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats.races).toBe('number');
    expect(typeof stats.odds).toBe('number');
    expect(typeof stats.results).toBe('number');
    expect(typeof stats.todayRaces).toBe('number');
  }, TIMEOUT);

  it('should get stadiums list', async () => {
    const stadiums = await getPgStadiums();
    
    expect(stadiums).toBeDefined();
    expect(Array.isArray(stadiums)).toBe(true);
    expect(stadiums.length).toBe(24); // 24競艇場
    expect(stadiums[0]).toHaveProperty('code');
    expect(stadiums[0]).toHaveProperty('name');
  }, TIMEOUT);

  it('should get race dates', async () => {
    const dates = await getPgRaceDates(10);
    
    expect(dates).toBeDefined();
    expect(Array.isArray(dates)).toBe(true);
  }, TIMEOUT);
});
