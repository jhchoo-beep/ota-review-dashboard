// lib/migrate.js
// 최초 1회 실행: node lib/migrate.js
const { sql } = require('@vercel/postgres');

async function migrate() {
  console.log('DB 마이그레이션 시작...');

  // 지점 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      platform VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // 리뷰 점수 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
      review_count INTEGER,
      overall_score NUMERIC(3,1),
      cleanliness NUMERIC(3,1),
      facilities NUMERIC(3,1),
      location NUMERIC(3,1),
      service NUMERIC(3,1),
      value_for_money NUMERIC(3,1),
      response_rate NUMERIC(5,1),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(property_id, recorded_at)
    )
  `;

  // 기본 지점 데이터 삽입
  await sql`
    INSERT INTO properties (name, platform) VALUES
      ('신설 만그로브', 'agoda'),
      ('동대문 만그로브', 'airbnb')
    ON CONFLICT (name) DO NOTHING
  `;

  console.log('✅ 마이그레이션 완료!');
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
