// pages/api/agoda-complaints.js
// 아고다 불만 건수 트래킹: 객실 정비 + 욕실 청결
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS agoda_complaints (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      room_complaints INTEGER DEFAULT 0,
      bathroom_complaints INTEGER DEFAULT 0,
      memo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(property_id, week_start)
    )
  `;

  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });
    const rows = await sql`
      SELECT * FROM agoda_complaints
      WHERE property_id = ${property_id}
      ORDER BY week_start ASC
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { property_id, week_start, room_complaints, bathroom_complaints, memo } = req.body;
    if (!property_id || !week_start) return res.status(400).json({ error: '필수값 누락' });

    try {
      const rows = await sql`
        INSERT INTO agoda_complaints
          (property_id, week_start, room_complaints, bathroom_complaints, memo)
        VALUES
          (${property_id}, ${week_start},
           ${room_complaints || 0}, ${bathroom_complaints || 0}, ${memo || null})
        ON CONFLICT (property_id, week_start)
        DO UPDATE SET
          room_complaints = EXCLUDED.room_complaints,
          bathroom_complaints = EXCLUDED.bathroom_complaints,
          memo = EXCLUDED.memo
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
    await sql`DELETE FROM agoda_complaints WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
