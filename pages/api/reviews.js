// pages/api/reviews.js
import { neon } from '@neondatabase/serverless';

function getDb() {
  return neon(process.env.DATABASE_URL);
}

export default async function handler(req, res) {
  const sql = getDb();

  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });

    const rows = await sql`
      SELECT * FROM reviews
      WHERE property_id = ${property_id}
      ORDER BY recorded_at DESC
      LIMIT 52
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {

    const {
      property_id, recorded_at, review_count,
      overall_score, cleanliness, facilities,
      location, service, value_for_money, response_rate,
      staff_friendliness, comfort, free_wifi
    } = req.body;

    if (!property_id || !recorded_at || !overall_score) {
      return res.status(400).json({ error: '지점, 날짜, 종합 평점은 필수입니다' });
    }

    try {
      const rows = await sql`
        INSERT INTO reviews
          (property_id, recorded_at, review_count, overall_score,
           cleanliness, facilities, location, service, value_for_money, response_rate,
           staff_friendliness, comfort, free_wifi)
        VALUES
          (${property_id}, ${recorded_at}, ${review_count || null},
           ${overall_score}, ${cleanliness || null}, ${facilities || null},
           ${location || null}, ${service || null}, ${value_for_money || null},
           ${response_rate || null}, ${staff_friendliness || null},
           ${comfort || null}, ${free_wifi || null})
        ON CONFLICT (property_id, recorded_at)
        DO UPDATE SET
          review_count = EXCLUDED.review_count,
          overall_score = EXCLUDED.overall_score,
          cleanliness = EXCLUDED.cleanliness,
          facilities = EXCLUDED.facilities,
          location = EXCLUDED.location,
          service = EXCLUDED.service,
          value_for_money = EXCLUDED.value_for_money,
          response_rate = EXCLUDED.response_rate,
          staff_friendliness = EXCLUDED.staff_friendliness,
          comfort = EXCLUDED.comfort,
          free_wifi = EXCLUDED.free_wifi
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
    await sql`DELETE FROM reviews WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
