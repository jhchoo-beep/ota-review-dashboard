// pages/api/reviews/latest.js
// 전체 지점의 최신 리뷰를 SQL 1번으로 가져오는 최적화 엔드포인트
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const sql = neon(process.env.DATABASE_URL);

  // DISTINCT ON: property_id별 가장 최신 recorded_at 행 1개씩만 추출
  // 기존 28번 쿼리 → 1번 쿼리로 대체
  const rows = await sql`
    SELECT DISTINCT ON (property_id) *
    FROM reviews
    ORDER BY property_id, recorded_at DESC
  `;

  // property_id를 key로 하는 Map으로 변환해서 반환
  // 프론트에서 allReviews[property_id] 로 O(1) 조회 가능
  const map = {};
  for (const row of rows) {
    map[row.property_id] = row;
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  return res.status(200).json(map);
}
