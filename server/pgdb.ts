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
    
    // オッズ数（odds_historyテーブル）
    const oddsHistoryResult = await client.query('SELECT COUNT(*) as count FROM odds_history');
    const oddsHistoryCount = parseInt(oddsHistoryResult.rows[0].count);
    
    // 本日のオッズ数
    const todayOddsResult = await client.query(
      "SELECT COUNT(*) as count FROM odds_history WHERE race_date = CURRENT_DATE"
    );
    const todayOdds = parseInt(todayOddsResult.rows[0].count);
    
    // レーサー成績数
    const racersResult = await client.query('SELECT COUNT(*) as count FROM racer_period_stats');
    const racersCount = parseInt(racersResult.rows[0].count);
    
    // 直前情報数
    const beforeInfoResult = await client.query('SELECT COUNT(*) as count FROM boatrace_beforeinfo');
    const beforeInfoCount = parseInt(beforeInfoResult.rows[0].count);
    
    // 水面気象情報数
    const weatherResult = await client.query('SELECT COUNT(*) as count FROM boatrace_weather');
    const weatherCount = parseInt(weatherResult.rows[0].count);
    
    // 予想情報数（web_predictions）
    let predictionsCount = 0;
    try {
      const predictionsResult = await client.query('SELECT COUNT(*) as count FROM web_predictions');
      predictionsCount = parseInt(predictionsResult.rows[0].count);
    } catch (e) {
      // テーブルが存在しない場合
    }
    
    // 場状況ランキング数
    let stadiumRankingsCount = 0;
    try {
      const rankingsResult = await client.query('SELECT COUNT(*) as count FROM stadium_rankings');
      stadiumRankingsCount = parseInt(rankingsResult.rows[0].count);
    } catch (e) {
      // テーブルが存在しない場合
    }
    
    // 最新オッズ収集時刻
    const latestOddsResult = await client.query(
      'SELECT MAX(scraped_at) as latest FROM odds_history'
    );
    const latestOddsTime = latestOddsResult.rows[0].latest;
    
    return {
      totalOdds: oddsHistoryCount,
      totalRacers: racersCount,
      totalPredictions: predictionsCount,
      totalBeforeInfo: beforeInfoCount,
      totalWeather: weatherCount,
      totalStadiumRankings: stadiumRankingsCount,
      todayOdds,
      latestOddsTime,
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
 * レースのオッズ履歴を取得（raceId指定）
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
 * オッズ履歴を取得（日付・会場・レース番号指定）
 * odds_historyテーブルから取得
 */
export async function getPgOddsHistoryByRace(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
  oddsType?: string;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        id,
        race_date,
        stadium_code,
        race_number,
        odds_type,
        combination,
        odds_value,
        odds_min,
        odds_max,
        scraped_at,
        minutes_to_deadline
      FROM odds_history
      WHERE race_date = $1 AND stadium_code = $2 AND race_number = $3
    `;
    const values: any[] = [params.raceDate, params.stadiumCode, params.raceNumber];
    
    if (params.oddsType) {
      query += ' AND odds_type = $4';
      values.push(params.oddsType);
    }
    
    query += ' ORDER BY scraped_at ASC, odds_type, combination';
    
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * 直前情報を取得
 */
export async function getPgBeforeInfo(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        waku as lane,
        racer_no,
        racer_name,
        weight,
        exhibition_time,
        tilt,
        propeller,
        parts_exchange as parts_changed,
        start_exhibition_course,
        start_exhibition_st as start_exhibition,
        scraped_at
      FROM boatrace_beforeinfo
      WHERE race_date = $1 AND stadium_code = $2 AND race_number = $3
      ORDER BY waku
    `, [params.raceDate, params.stadiumCode, params.raceNumber]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * 水面気象情報を取得
 */
export async function getPgWeatherInfo(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        temperature,
        weather,
        wind_direction,
        wind_speed,
        water_temperature,
        wave_height,
        scraped_at
      FROM boatrace_weather
      WHERE race_date = $1 AND stadium_code = $2 AND race_number = $3
      LIMIT 1
    `, [params.raceDate, params.stadiumCode, params.raceNumber]);
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * 払戻金を取得（日付・会場・レース番号指定）
 */
export async function getPgPayoffs(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // まずracesテーブルからrace_idを取得
    const raceResult = await client.query(`
      SELECT id FROM races
      WHERE race_date = $1 AND stadium_code = $2 AND race_number = $3
    `, [params.raceDate, parseInt(params.stadiumCode), params.raceNumber]);
    
    if (raceResult.rows.length === 0) {
      return [];
    }
    
    const raceId = raceResult.rows[0].id;
    
    const result = await client.query(`
      SELECT bet_type, combination, payoff, popularity
      FROM payoffs
      WHERE race_id = $1
      ORDER BY bet_type, popularity
    `, [raceId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * レース結果を取得（日付・会場・レース番号指定）
 */
export async function getPgRaceResult(params: {
  raceDate: string;
  stadiumCode: string;
  raceNumber: number;
}) {
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
        rr.third_place,
        rr.fourth_place,
        rr.fifth_place,
        rr.sixth_place
      FROM races r
      LEFT JOIN race_results rr ON r.id = rr.race_id
      WHERE r.race_date = $1 AND r.stadium_code = $2 AND r.race_number = $3
    `, [params.raceDate, parseInt(params.stadiumCode), params.raceNumber]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      raceDate: row.race_date,
      stadiumCode: row.stadium_code,
      stadiumName: getStadiumName(row.stadium_code),
      raceNumber: row.race_number,
      title: row.title,
      result: row.first_place ? {
        first: row.first_place,
        second: row.second_place,
        third: row.third_place,
        fourth: row.fourth_place,
        fifth: row.fifth_place,
        sixth: row.sixth_place,
      } : null,
    };
  } finally {
    client.release();
  }
}

/**
 * 日付範囲でレース一覧を取得（odds_historyから）
 */
export async function getPgRacesByDateRange(params: {
  startDate?: string;
  endDate?: string;
  stadiumCode?: string;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // odds_historyからユニークなレースを取得
    let query = `
      SELECT DISTINCT 
        race_date,
        stadium_code,
        race_number,
        COUNT(*) as odds_count
      FROM odds_history
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;
    
    if (params.startDate) {
      query += ` AND race_date >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }
    
    if (params.endDate) {
      query += ` AND race_date <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }
    
    if (params.stadiumCode) {
      query += ` AND stadium_code = $${paramIndex}`;
      values.push(params.stadiumCode);
      paramIndex++;
    }
    
    query += ' GROUP BY race_date, stadium_code, race_number ORDER BY race_date DESC, stadium_code, race_number';
    
    const result = await client.query(query, values);
    
    return result.rows.map(row => ({
      race_date: row.race_date,
      stadium_code: row.stadium_code,
      stadium_name: getStadiumName(row.stadium_code),
      race_number: row.race_number,
      odds_count: parseInt(row.odds_count),
    }));
  } finally {
    client.release();
  }
}

/**
 * 利用可能な日付一覧を取得
 */
export async function getPgAvailableDates() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT race_date
      FROM odds_history
      ORDER BY race_date DESC
      LIMIT 90
    `);
    
    return result.rows.map(row => row.race_date);
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


/**
 * レーサー検索
 * 選手登録番号または名前で検索
 */
export async function getPgRacerSearch(params: {
  query?: string;
  rank?: string;
  branch?: string;
  limit?: number;
  offset?: number;
}) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        racer_no,
        name_kanji,
        name_kana,
        branch,
        rank,
        age,
        gender,
        weight,
        win_rate,
        place_rate,
        avg_start_timing,
        race_count,
        first_count,
        second_count,
        data_year,
        data_period
      FROM racer_period_stats
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;
    
    // 検索クエリ（選手番号または名前）
    if (params.query) {
      query += ` AND (racer_no LIKE $${paramIndex} OR name_kanji LIKE $${paramIndex + 1} OR name_kana LIKE $${paramIndex + 2})`;
      values.push(`%${params.query}%`, `%${params.query}%`, `%${params.query}%`);
      paramIndex += 3;
    }
    
    // 級別フィルタ
    if (params.rank) {
      query += ` AND rank = $${paramIndex}`;
      values.push(params.rank);
      paramIndex++;
    }
    
    // 支部フィルタ
    if (params.branch) {
      query += ` AND branch = $${paramIndex}`;
      values.push(params.branch);
      paramIndex++;
    }
    
    // 最新の期のデータのみ取得
    query += ` ORDER BY data_year DESC, data_period DESC, win_rate DESC NULLS LAST`;
    
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
      racerNo: row.racer_no,
      nameKanji: row.name_kanji,
      nameKana: row.name_kana,
      branch: row.branch,
      rank: row.rank,
      age: row.age,
      gender: row.gender,
      weight: row.weight,
      winRate: row.win_rate ? parseFloat(row.win_rate) : null,
      placeRate: row.place_rate ? parseFloat(row.place_rate) : null,
      avgSt: row.avg_start_timing ? parseFloat(row.avg_start_timing) : null,
      raceCount: row.race_count,
      firstCount: row.first_count,
      secondCount: row.second_count,
      dataYear: row.data_year,
      dataPeriod: row.data_period,
    }));
  } finally {
    client.release();
  }
}

/**
 * レーサー詳細を取得
 * 選手登録番号で検索し、全期の成績を取得
 */
export async function getPgRacerDetail(racerNo: string) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // 全期の成績を取得
    const result = await client.query(`
      SELECT 
        racer_no,
        name_kanji,
        name_kana,
        branch,
        rank,
        age,
        gender,
        weight,
        win_rate,
        place_rate,
        avg_start_timing,
        race_count,
        first_count,
        second_count,
        data_year,
        data_period
      FROM racer_period_stats
      WHERE racer_no = $1
      ORDER BY data_year DESC, data_period DESC
    `, [racerNo]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // 最新の基本情報
    const latest = result.rows[0];
    
    // 期別成績の履歴
    const periodStats = result.rows.map(row => ({
      dataYear: row.data_year,
      dataPeriod: row.data_period,
      rank: row.rank,
      winRate: row.win_rate ? parseFloat(row.win_rate) : null,
      placeRate: row.place_rate ? parseFloat(row.place_rate) : null,
      avgSt: row.avg_start_timing ? parseFloat(row.avg_start_timing) : null,
      raceCount: row.race_count,
      firstCount: row.first_count,
      secondCount: row.second_count,
    }));
    
    return {
      racerNo: latest.racer_no,
      nameKanji: latest.name_kanji,
      nameKana: latest.name_kana,
      branch: latest.branch,
      rank: latest.rank,
      age: latest.age,
      gender: latest.gender,
      weight: latest.weight,
      periodStats,
    };
  } finally {
    client.release();
  }
}

/**
 * レーサーの支部一覧を取得
 */
export async function getPgRacerBranches() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT branch
      FROM racer_period_stats
      WHERE branch IS NOT NULL AND branch != ''
      ORDER BY branch
    `);
    
    return result.rows.map(row => row.branch);
  } finally {
    client.release();
  }
}

/**
 * レーサーの級別一覧を取得
 */
export async function getPgRacerRanks() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT rank
      FROM racer_period_stats
      WHERE rank IS NOT NULL AND rank != ''
      ORDER BY 
        CASE rank 
          WHEN 'A1' THEN 1 
          WHEN 'A2' THEN 2 
          WHEN 'B1' THEN 3 
          WHEN 'B2' THEN 4 
          ELSE 5 
        END
    `);
    
    return result.rows.map(row => row.rank);
  } finally {
    client.release();
  }
}

/**
 * レーサー統計情報を取得
 */
export async function getPgRacerStats() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // 総レーサー数（ユニーク）
    const totalResult = await client.query(`
      SELECT COUNT(DISTINCT racer_no) as count FROM racer_period_stats
    `);
    const totalRacers = parseInt(totalResult.rows[0].count);
    
    // 級別の人数
    const rankResult = await client.query(`
      SELECT rank, COUNT(DISTINCT racer_no) as count
      FROM racer_period_stats
      WHERE rank IS NOT NULL
      GROUP BY rank
      ORDER BY 
        CASE rank 
          WHEN 'A1' THEN 1 
          WHEN 'A2' THEN 2 
          WHEN 'B1' THEN 3 
          WHEN 'B2' THEN 4 
          ELSE 5 
        END
    `);
    
    // 支部別の人数
    const branchResult = await client.query(`
      SELECT branch, COUNT(DISTINCT racer_no) as count
      FROM racer_period_stats
      WHERE branch IS NOT NULL AND branch != ''
      GROUP BY branch
      ORDER BY count DESC
    `);
    
    // データ期間
    const periodResult = await client.query(`
      SELECT MIN(data_year) as min_year, MAX(data_year) as max_year
      FROM racer_period_stats
    `);
    
    return {
      totalRacers,
      rankCounts: rankResult.rows.map(row => ({
        rank: row.rank,
        count: parseInt(row.count),
      })),
      branchCounts: branchResult.rows.map(row => ({
        branch: row.branch,
        count: parseInt(row.count),
      })),
      dataRange: {
        minYear: periodResult.rows[0].min_year,
        maxYear: periodResult.rows[0].max_year,
      },
    };
  } finally {
    client.release();
  }
}
