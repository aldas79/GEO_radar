# 트립닷컴 호텔 상세 - 투숙객 리뷰 셀렉터

호텔 상세 페이지 (예: `https://kr.trip.com/hotels/detail/?...hotelId=8899814...`) 에서 **투숙객 리뷰** 수집 시 사용하는 셀렉터입니다.  
사이트 DOM 변경 시 `content.js` 내부 `extractCurrentReviews()`를 수정하세요.

## URL 패턴

- `https://kr.trip.com/hotels/detail/*`
- `https://www.trip.com/hotels/detail/*`

## 리뷰 블록 후보

| 셀렉터 | 설명 |
|--------|------|
| `article` | 리뷰가 article로 마크업된 경우 |
| `[class*="review"]`, `[class*="Review"]` | review 관련 클래스 |
| `[class*="comment"]` | 댓글 형태 |
| `[class*="ReviewItem"]` | 개별 리뷰 아이템 |
| `[data-testid*="review"]` | 테스트 ID |
| `div[class*="review-"]` | 접두사 패턴 |

## 제외

- `리뷰 기준`, `AI 제공`, `요약` 텍스트 포함 블록 → AI 요약 영역 제외
- 날짜 패턴(`YYYY년 M월 D일`) 없는 블록 제외

## 객실/방 관련 키워드 (roomHint)

리뷰 본문에서 아래 키워드가 있으면 `roomHint`로 추출합니다.  
"어떤 방에서 묶었는지" 정보가 리뷰에 언급된 경우 해당 내용이 포함됩니다.

- 시티 뷰, 오션 뷰, 트윈, 더블, 디럭스, 스위트, 객실, room, 룸, 트윈룸, 오션뷰

## 페이징

- 다음 페이지: `다음`, `Next`, `>`, `›` 텍스트 또는 aria-label
