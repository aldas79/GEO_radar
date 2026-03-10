# 트립닷컴 셀렉터 정리

Cursor 브라우저(Open Browser)로 트립닷컴 호텔 검색 페이지를 연 뒤, 아래 요소의 셀렉터를 확인해 `scripts/collect.js`의 `SELECTORS` 객체에 반영하세요.

## 검색 결과 리스트 페이지

- URL 예: `https://www.trip.com/hotels/list?city=2&checkin=2025/03/15&checkout=2025/03/16`
- city: 2 = Shanghai (다른 도시는 사이트에서 검색 후 URL의 city 값 확인)

## 수집 대상 요소

| 항목 | 설명 | 현재 스크립트 셀렉터/방식 |
|------|------|---------------------------|
| 호텔 카드 | 카드 전체 컨테이너 | `[data-testid="hotel-item"], .list-card`, 없으면 링크 부모 사용 |
| 호텔 링크 | 상세 페이지로 가는 a 태그 | `a[href*="/hotel/"]` (또는 `hotelId=` 포함 URL) |
| 이름 | 호텔명 | `[data-testid="hotel-name"]` 등, 없으면 카드 텍스트에서 추출 |
| 가격 | 표시 가격 | `US$숫자` 정규식 추출 |
| 평점 | 평점/등급 | `숫자/10` 또는 "Very Good" 등 텍스트 |
| 위치 | 지역/주소 | "Near ..." 패턴 또는 location 클래스 |

사이트 DOM 구조 변경 시 `scripts/collect.js` 상단 `SELECTORS`만 수정하면 됩니다.
