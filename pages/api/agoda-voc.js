// pages/api/agoda-voc.js
// 점수 구간별 VOC 요약 (카테고리 + good/bad + 키워드)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS agoda_voc (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      band TEXT NOT NULL,        -- '1~2점', '2~3점', ..., '9~10점'
      category TEXT NOT NULL,    -- '청결', '서비스', '시설', '가격', '위치'
      sentiment TEXT NOT NULL,   -- 'good' | 'bad'
      keyword TEXT NOT NULL,     -- 자유 입력 키워드
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  if (req.method === 'GET') {
    const { property_id, week_start } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });
    const rows = week_start
      ? await sql`
          SELECT * FROM agoda_voc
          WHERE property_id = ${property_id} AND week_start = ${week_start}
          ORDER BY band, sentiment, category
        `
      : await sql`
          SELECT * FROM agoda_voc
          WHERE property_id = ${property_id}
          ORDER BY week_start DESC, band, sentiment
        `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { property_id, week_start, band, category, sentiment, keyword } = req.body;
    if (!property_id || !week_start || !band || !category || !sentiment || !keyword) {
      return res.status(400).json({ error: '필수값 누락' });
    }
    try {
      const rows = await sql`
        INSERT INTO agoda_voc (property_id, week_start, band, category, sentiment, keyword)
        VALUES (${property_id}, ${week_start}, ${band}, ${category}, ${sentiment}, ${keyword})
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
    await sql`DELETE FROM agoda_voc WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
