/**
 * PostgreSQL Database Helper
 * RenderのPostgreSQLに接続してデータを取得する
 */

import pg from 'pg';

const { Pool } = pg;

// PostgreSQL接続プール
let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.EXTERNAL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('EXTERNAL_DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

// 競艇場コード
const STADIUM_NAMES: Record<number, string> = {
  1: '桐生', 2: '戸田', 3: '江戸川', 4: '平和島', 5: '多摩川',
  6: '浜名湖', 7: '蒲郡', 8: '常滑', 9: '津', 10: '三国',
  11: '琵琶湖', 12: '住之江', 13: '尼崎', 14: '鳴門', 15: '丸亀',
  16: '児島', 17: '宮島', 18: '徳山', 19: '下関', 20: '若松',
  21: '芦屋', 22: '福岡', 23: '唐津', 24: '大村'
};

export function getStadiumName(code: number | string): string {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  return STADIUM_NAMES[numCode] || `場${code}`;
}

/**
 * 統計情報を取得
 */
export async function getPgCollectionStats() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // レース数
    const racesResult = await client.query('SELECT COUNT(*) as count FROM races');
    const racesCount = parseInt(racesResult.rows[0].count);
    
    // オッズ数
    const oddsResult = await client.query('SELECT COUNT(*) as count FROM odds');
    const oddsCount = parseInt(oddsResult.rows[0].count);
    
    // 結果数
    const resultsResult = await client.query('SELECT COUNT(*) as count FROM race_results');
    const resultsCount = parseInt(resultsResult.rows[0].count);
    
    // 本日のレース数
    const todayResult = await client.query(
      "SELECT COUNT(*) as count FROM races WHERE race_date = CURRENT_DATE"
    );
    const todayRaces = parseInt(todayResult.rows[0].count);
    
    // 最新オッズ収集時刻
    const latestOddsResult = await client.query(
      'SELECT MAX(scraped_at) as latest FROM odds'
    );
    const latestOdds = latestOddsResult.rows[0].latest;
    
    return {
      races: racesCount,
      odds: oddsCount,
      results: resultsCount,
      todayRaces,
      latestOdds,
    };
  } finally {
    client.release();
  }
}

/**
 * 本日のレース一覧を取得
 */
export async function getPgTodayRaces() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        r.id,
        r.race_date,
        r.stadium_code,
        r.race_number,
        r.title,
        rr.first_place,
        rr.second_place,
        rr.third_place
      FROM races r
      LEFT JOIN race_results rr ON r.id = rr.race_id
      WHERE r.race_date = CURRENT_DATE
      ORDER BY r.stadium_code, r.race_number
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      raceDate: row.race_date,
      stadiumCode: row.stadium_code,
      stadiumName: getStadiumName(row.stadium_code),
      raceNumber: row.race_number,
      title: row.title,
      result: row.first_place ? `${row.first_place}-${row.second_place}-${row.third_place}` : null,
    }));
  } finally {
    client.release();
  }
}

/**
 * レース一覧を取得（日付・会場フィルタ）
 */
export async function getPgRaces(params: {
  date?: string;
  stadiumCode?: number;
  limit?: number;
  offset?: number;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        r.id,
        r.race_date,
        r.stadium_code,
        r.race_number,
        r.title,
        rr.first_place,
        rr.second_place,
        rr.third_place
      FROM races r
      LEFT JOIN race_results rr ON r.id = rr.race_id
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;
    
    if (params.date) {
      query += ` AND r.race_date = $${paramIndex}`;
      values.push(params.date);
      paramIndex++;
    }
    
    if (params.stadiumCode) {
      query += ` AND r.stadium_code = $${paramIndex}`;
      values.push(params.stadiumCode);
      paramIndex++;
    }
    
    query += ' ORDER BY r.race_date DESC, r.stadium_code, r.race_number';
    
    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }
    
    if (params.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
    }
    
    const result = await client.query(query, values);
    
    return result.rows.map(row => ({
      id: row.id,
      raceDate: row.race_date,
      stadiumCode: row.stadium_code,
      stadiumName: getStadiumName(row.stadium_code),
      raceNumber: row.race_number,
      title: row.title,
      result: row.first_place ? `${row.first_place}-${row.second_place}-${row.third_place}` : null,
    }));
  } finally {
    client.release();
  }
}

/**
 * レースのオッズ履歴を取得
 */
export async function getPgOddsHistory(raceId: number) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        odds_type,
        combination,
        odds_value,
        odds_min,
        odds_max,
        scraped_at
      FROM odds
      WHERE race_id = $1
      ORDER BY scraped_at DESC, odds_type, combination
    `, [raceId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * レース詳細を取得
 */
export async function getPgRaceDetail(raceId: number) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // レース基本情報
    const raceResult = await client.query(`
      SELECT 
        r.*,
        rr.first_place,
        rr.second_place,
        rr.third_place,
        rr.fourth_place,
        rr.fifth_place,
        rr.sixth_place
      FROM races r
      LEFT JOIN race_results rr ON r.id = rr.race_id
      WHERE r.id = $1
    `, [raceId]);
    
    if (raceResult.rows.length === 0) {
      return null;
    }
    
    const race = raceResult.rows[0];
    
    // 払戻金
    const payoffsResult = await client.query(`
      SELECT bet_type, combination, payoff, popularity
      FROM payoffs
      WHERE race_id = $1
    `, [raceId]);
    
    // 最新オッズ
    const latestOddsResult = await client.query(`
      SELECT DISTINCT ON (odds_type, combination)
        odds_type,
        combination,
        odds_value,
        odds_min,
        odds_max,
        scraped_at
      FROM odds
      WHERE race_id = $1
      ORDER BY odds_type, combination, scraped_at DESC
    `, [raceId]);
    
    return {
      id: race.id,
      raceDate: race.race_date,
      stadiumCode: race.stadium_code,
      stadiumName: getStadiumName(race.stadium_code),
      raceNumber: race.race_number,
      title: race.title,
      result: race.first_place ? {
        first: race.first_place,
        second: race.second_place,
        third: race.third_place,
        fourth: race.fourth_place,
        fifth: race.fifth_place,
        sixth: race.sixth_place,
      } : null,
      payoffs: payoffsResult.rows,
      latestOdds: latestOddsResult.rows,
    };
  } finally {
    client.release();
  }
}

/**
 * 開催日一覧を取得
 */
export async function getPgRaceDates(limit: number = 30) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT race_date
      FROM races
      ORDER BY race_date DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => row.race_date);
  } finally {
    client.release();
  }
}

/**
 * 開催場一覧を取得
 */
export async function getPgStadiums() {
  return Object.entries(STADIUM_NAMES).map(([code, name]) => ({
    code: parseInt(code),
    name,
  }));
}
