// pages/api/agoda-review-rate.js
// 탭 1 전용: 리뷰 작성률 (리뷰 제출 건수 / 체크아웃 수)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS agoda_review_rate (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      review_count INTEGER,
      checkout_count INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(property_id, week_start)
    )
  `;

  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });
    const rows = await sql`
      SELECT * FROM agoda_review_rate
      WHERE property_id = ${property_id}
      ORDER BY week_start ASC
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { property_id, week_start, review_count, checkout_count } = req.body;
    if (!property_id || !week_start) return res.status(400).json({ error: '필수값 누락' });
    try {
      const rows = await sql`
        INSERT INTO agoda_review_rate (property_id, week_start, review_count, checkout_count)
        VALUES (${property_id}, ${week_start}, ${review_count || null}, ${checkout_count || null})
        ON CONFLICT (property_id, week_start)
        DO UPDATE SET
          review_count = EXCLUDED.review_count,
          checkout_count = EXCLUDED.checkout_count
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
    await sql`DELETE FROM agoda_review_rate WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
