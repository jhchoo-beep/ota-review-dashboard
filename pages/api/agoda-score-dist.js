// pages/api/agoda-score-dist.js
// 탭 2 전용: 점수 분포 (1점~10점 각 건수)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  // 기존 테이블에 weekly_avg_score 컬럼이 없으면 추가
  await sql`ALTER TABLE IF EXISTS agoda_score_dist ADD COLUMN IF NOT EXISTS weekly_avg_score NUMERIC(3,1)`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS agoda_score_dist (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
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
      weekly_avg_score NUMERIC(3,1),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(property_id, week_start)
    )
  `;

  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });
    const rows = await sql`
      SELECT * FROM agoda_score_dist
      WHERE property_id = ${property_id}
      ORDER BY week_start ASC
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const {
      property_id, week_start,
      score_1, score_2, score_3, score_4, score_5,
      score_6, score_7, score_8, score_9, score_10,
      weekly_avg_score,
    } = req.body;
    if (!property_id || !week_start) return res.status(400).json({ error: '필수값 누락' });
    try {
      const rows = await sql`
        INSERT INTO agoda_score_dist
          (property_id, week_start,
           score_1, score_2, score_3, score_4, score_5,
           score_6, score_7, score_8, score_9, score_10,
           weekly_avg_score)
        VALUES
          (${property_id}, ${week_start},
           ${score_1 || 0}, ${score_2 || 0}, ${score_3 || 0},
           ${score_4 || 0}, ${score_5 || 0}, ${score_6 || 0},
           ${score_7 || 0}, ${score_8 || 0}, ${score_9 || 0},
           ${score_10 || 0}, ${weekly_avg_score || null})
        ON CONFLICT (property_id, week_start)
        DO UPDATE SET
          score_1 = EXCLUDED.score_1, score_2 = EXCLUDED.score_2,
          score_3 = EXCLUDED.score_3, score_4 = EXCLUDED.score_4,
          score_5 = EXCLUDED.score_5, score_6 = EXCLUDED.score_6,
          score_7 = EXCLUDED.score_7, score_8 = EXCLUDED.score_8,
          score_9 = EXCLUDED.score_9, score_10 = EXCLUDED.score_10,
          weekly_avg_score = EXCLUDED.weekly_avg_score
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await sql`DELETE FROM agoda_score_dist WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
