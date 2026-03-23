// pages/api/superhost.js
import { neon } from '@neondatabase/serverless';

function getDb() { return neon(process.env.DATABASE_URL); }

export default async function handler(req, res) {
  const sql = getDb();

  // 테이블 자동 생성 (최초 1회)
  await sql`
    CREATE TABLE IF NOT EXISTS superhost_records (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      rating NUMERIC(3,2),
      response_rate NUMERIC(5,1),
      trips INTEGER,
      cancel_rate NUMERIC(5,2),
      achieved BOOLEAN,
      memo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(property_id, period_start, period_end)
    )
  `;

  // GET: 특정 property의 슈퍼호스트 이력 조회
  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });
    const rows = await sql`
      SELECT * FROM superhost_records
      WHERE property_id = ${property_id}
      ORDER BY period_start DESC
    `;
    return res.status(200).json(rows);
  }

  // POST: 슈퍼호스트 기록 저장/업데이트
  if (req.method === 'POST') {
    const {
      property_id, period_start, period_end,
      rating, response_rate, trips, cancel_rate,
      achieved, memo
    } = req.body;

    if (!property_id || !period_start || !period_end) {
      return res.status(400).json({ error: '필수값 누락' });
    }

    // achieved 자동 판정 (입력 안 했을 경우)
    const isAchieved = achieved !== undefined ? achieved :
      (rating >= 4.8 && response_rate >= 90 && trips >= 10 && cancel_rate < 1.0);

    try {
      const rows = await sql`
        INSERT INTO superhost_records
          (property_id, period_start, period_end, rating, response_rate, trips, cancel_rate, achieved, memo)
        VALUES
          (${property_id}, ${period_start}, ${period_end},
           ${rating || null}, ${response_rate || null}, ${trips || null},
           ${cancel_rate || null}, ${isAchieved}, ${memo || null})
        ON CONFLICT (property_id, period_start, period_end)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          response_rate = EXCLUDED.response_rate,
          trips = EXCLUDED.trips,
          cancel_rate = EXCLUDED.cancel_rate,
          achieved = EXCLUDED.achieved,
          memo = EXCLUDED.memo
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE: 슈퍼호스트 기록 삭제
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await sql`DELETE FROM superhost_records WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
