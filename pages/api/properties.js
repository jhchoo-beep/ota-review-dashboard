// pages/api/properties.js
import { neon } from '@neondatabase/serverless';

function getDb() {
  return neon(process.env.DATABASE_URL);
}

export default async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM properties ORDER BY name, platform`;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { name, platform } = req.body;
    if (!name || !platform) return res.status(400).json({ error: '이름과 플랫폼은 필수입니다' });
    try {
      const rows = await sql`
        INSERT INTO properties (name, platform) VALUES (${name}, ${platform})
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (e) {
      return res.status(409).json({ error: '이미 존재하는 지점+플랫폼 조합입니다' });
    }
  }

  res.status(405).end();
}
