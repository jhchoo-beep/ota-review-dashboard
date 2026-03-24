// pages/api/agoda-weekly.js
// 아고다 주간 트래킹: 리뷰 작성률 + 점수 분포
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  // 테이블 자동 생성 (최초 1회)
  await sql`
    CREATE TABLE IF NOT EXISTS agoda_weekly (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      review_count INTEGER,
      checkout_count INTEGER,
      score_1 INTEGER DEFAULT 0,
      score_2 INTEGER DEFAULT 0,
      score_3 INTEGER DEFAULT 0,
      score_4 INTEGER DEFAULT 0,
      score_5 INTEGER DEFAULT 0,
      score_6 INTEGER DEFAULT 0,
      score_7 INTEGER DEFAULT 0,
      score_8 INTEGER DEFAULT 0,
      score_9 INTEGER DEFAULT 0,
      score_10 INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(property_id, week_start)
    )
  `;

  // GET: 특정 property의 주간 데이터 전체 조회
  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });
    const rows = await sql`
      SELECT * FROM agoda_weekly
      WHERE property_id = ${property_id}
      ORDER BY week_start ASC
    `;
    return res.status(200).json(rows);
  }

  // POST: 주간 데이터 저장/업데이트
  if (req.method === 'POST') {
    const {
      property_id, week_start,
      review_count, checkout_count,
      score_1, score_2, score_3, score_4, score_5,
      score_6, score_7, score_8, score_9, score_10,
    } = req.body;

    if (!property_id || !week_start) {
      return res.status(400).json({ error: '필수값 누락' });
    }

    try {
      const rows = await sql`
        INSERT INTO agoda_weekly
          (property_id, week_start, review_count, checkout_count,
           score_1, score_2, score_3, score_4, score_5,
           score_6, score_7, score_8, score_9, score_10)
        VALUES
          (${property_id}, ${week_start},
           ${review_count || null}, ${checkout_count || null},
           ${score_1 || 0}, ${score_2 || 0}, ${score_3 || 0},
           ${score_4 || 0}, ${score_5 || 0}, ${score_6 || 0},
           ${score_7 || 0}, ${score_8 || 0}, ${score_9 || 0},
           ${score_10 || 0})
        ON CONFLICT (property_id, week_start)
        DO UPDATE SET
          review_count = EXCLUDED.review_count,
          checkout_count = EXCLUDED.checkout_count,
          score_1 = EXCLUDED.score_1, score_2 = EXCLUDED.score_2,
          score_3 = EXCLUDED.score_3, score_4 = EXCLUDED.score_4,
          score_5 = EXCLUDED.score_5, score_6 = EXCLUDED.score_6,
          score_7 = EXCLUDED.score_7, score_8 = EXCLUDED.score_8,
          score_9 = EXCLUDED.score_9, score_10 = EXCLUDED.score_10
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await sql`DELETE FROM agoda_weekly WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
