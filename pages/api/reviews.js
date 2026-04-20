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
      staff_friendliness, comfort, free_wifi,
      staff_service, amenities, property_condition,
      google_score, naver_score, kakao_score, tripadvisor_score,
      google_count, naver_count, kakao_count, tripadvisor_count,
    } = req.body;

    if (!property_id || !recorded_at) {
      return res.status(400).json({ error: '지점과 날짜는 필수입니다' });
    }

    try {
      const rows = await sql`
        INSERT INTO reviews
          (property_id, recorded_at, review_count, overall_score,
           cleanliness, facilities, location, service, value_for_money, response_rate,
           staff_friendliness, comfort, free_wifi,
           staff_service, amenities, property_condition,
           google_score, naver_score, kakao_score, tripadvisor_score,
           google_count, naver_count, kakao_count, tripadvisor_count)
        VALUES
          (${property_id}, ${recorded_at}, ${review_count || null},
           ${overall_score || null}, ${cleanliness || null}, ${facilities || null},
           ${location || null}, ${service || null}, ${value_for_money || null},
           ${response_rate || null}, ${staff_friendliness || null},
           ${comfort || null}, ${free_wifi || null},
           ${staff_service || null}, ${amenities || null}, ${property_condition || null},
           ${google_score || null}, ${naver_score || null}, ${kakao_score || null}, ${tripadvisor_score || null},
           ${google_count || null}, ${naver_count || null}, ${kakao_count || null}, ${tripadvisor_count || null})
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
          free_wifi = EXCLUDED.free_wifi,
          staff_service = EXCLUDED.staff_service,
          amenities = EXCLUDED.amenities,
          property_condition = EXCLUDED.property_condition,
          google_score = EXCLUDED.google_score,
          naver_score = EXCLUDED.naver_score,
          kakao_score = EXCLUDED.kakao_score,
          tripadvisor_score = EXCLUDED.tripadvisor_score,
          google_count = EXCLUDED.google_count,
          naver_count = EXCLUDED.naver_count,
          kakao_count = EXCLUDED.kakao_count,
          tripadvisor_count = EXCLUDED.tripadvisor_count
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id 필요' });
    const {
      recorded_at, review_count, overall_score, cleanliness, facilities,
      location, service, value_for_money, response_rate,
      staff_friendliness, comfort, free_wifi,
      staff_service, amenities, property_condition,
      google_score, naver_score, kakao_score, tripadvisor_score,
      google_count, naver_count, kakao_count, tripadvisor_count,
    } = req.body;
    try {
      const rows = await sql`
        UPDATE reviews SET
          recorded_at = ${recorded_at},
          review_count = ${review_count || null},
          overall_score = ${overall_score || null},
          cleanliness = ${cleanliness || null},
          facilities = ${facilities || null},
          location = ${location || null},
          service = ${service || null},
          value_for_money = ${value_for_money || null},
          response_rate = ${response_rate || null},
          staff_friendliness = ${staff_friendliness || null},
          comfort = ${comfort || null},
          free_wifi = ${free_wifi || null},
          staff_service = ${staff_service || null},
          amenities = ${amenities || null},
          property_condition = ${property_condition || null},
          google_score = ${google_score || null},
          naver_score = ${naver_score || null},
          kakao_score = ${kakao_score || null},
          tripadvisor_score = ${tripadvisor_score || null},
          google_count = ${google_count || null},
          naver_count = ${naver_count || null},
          kakao_count = ${kakao_count || null},
          tripadvisor_count = ${tripadvisor_count || null}
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(rows[0]);
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
