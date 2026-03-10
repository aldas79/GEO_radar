-- Trip.com 호텔 수집 데이터 스키마 (SQLite)
CREATE TABLE IF NOT EXISTS hotels (
  hotel_id TEXT PRIMARY KEY,
  name TEXT,
  price TEXT,
  rating REAL,
  location TEXT,
  url TEXT,
  collected_at TEXT
);

-- 필요 시 확장
-- ALTER TABLE hotels ADD COLUMN reviews_count INTEGER;
-- ALTER TABLE hotels ADD COLUMN amenities TEXT;
