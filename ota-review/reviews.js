// pages/api/reviews.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id 필요' });

    const { rows } = await sql`
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
      location, service, value_for_money, response_rate
    } = req.body;

    if (!property_id || !recorded_at || !overall_score) {
      return res.status(400).json({ error: '지점, 날짜, 종합 평점은 필수입니다' });
    }

    try {
      const { rows } = await sql`
        INSERT INTO reviews
          (property_id, recorded_at, review_count, overall_score,
           cleanliness, facilities, location, service, value_for_money, response_rate)
        VALUES
          (${property_id}, ${recorded_at}, ${review_count || null},
           ${overall_score}, ${cleanliness || null}, ${facilities || null},
           ${location || null}, ${service || null}, ${value_for_money || null},
           ${response_rate || null})
        ON CONFLICT (property_id, recorded_at)
        DO UPDATE SET
          review_count = EXCLUDED.review_count,
          overall_score = EXCLUDED.overall_score,
          cleanliness = EXCLUDED.cleanliness,
          facilities = EXCLUDED.facilities,
          location = EXCLUDED.location,
          service = EXCLUDED.service,
          value_for_money = EXCLUDED.value_for_money,
          response_rate = EXCLUDED.response_rate
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
