# What's In? — Web (Next.js App Router)

서비스 소개 + **설치 없이 쓰는 웹 판독**(검색 → 제품 → 성분) + App Store 설치 링크.
디자인 정본은 `docs/design/DESIGN_RULES.md`(앱·웹 공용). 토큰은 `app/globals.css` 한 곳에만 있다.

## 실행

```bash
cd web
npm install
npm run dev -- -p 3100      # http://localhost:3100
npm run build && npx next start -p 3100
```

API 는 기본으로 운영(`https://api.whatsin.kr/api/v1`)에 붙는다. 로컬 백엔드는 `web/.env.local` 에
`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`. **API 는 서버에서만 부른다**(SSR · `revalidate`) — 브라우저 CORS 와 무관.

## 화면

| 경로 | 무엇 | 그리는 곳 |
|---|---|---|
| `/` | 히어로(한 줄 · 검색 · 앱 받기 · 실제 제품 판독 휴대폰) → 세 축 → 둘러보기(컬렉션·오늘의 성분) → 읽는 법 → 앱 받기 | 서버(ISR 1시간) |
| `/search?q=` · `/search?c=` | 검색 · 컬렉션 목록. 「결과 없음」과 「연결 실패」를 다른 문장으로 | 서버 |
| `/p/[id]` | 제품 판독 — 세 축 · 가공육 안내 · 주의 성분 · 원재료 칩 · 영양성분 + 섭취량 슬라이더 · 대안(더 나은 / 비슷하게 좋은) | 서버 + 슬라이더만 클라이언트 |
| `/i/[name]` | 성분 상세 — 알아둘 점 · 공인 기관 평가 · 이 성분이 든 제품 | 서버 |

카메라(바코드) 기능은 웹에 없다 — 앱으로 안내한다. 옛 `/score`(내부 점수 설명, A~E 노출)는 지웠다.

## 구조

```
app/
  layout.tsx · globals.css     토큰(색·글자 일곱 단계·4pt 간격·모서리) · 밴드(tint/ink/orange) · 기울인 경계 · 등장
  page.tsx                     첫 화면 조립
  search/ · p/[id]/ · i/[name]/ · not-found.tsx
components/
  site/        Nav · Footer · Reveal(IntersectionObserver 등장)
  home/        Hero · PhoneMock(HTML/CSS 휴대폰) · Sections(세 축·둘러보기·읽는 법·앱 받기)
  product/     AxisCards · NutritionPanel('use client' 슬라이더) · Ingredients · Alternatives
  axis/        Meter(4칸) · AxisGlyphs(목록용 세 축 요약)
  Icon · FoodTile · SearchBox · ProductRow · States(빈/실패) · AppStoreButton
lib/
  api.ts       서버 fetch · 실패를 값(Result)으로 돌려준다
  types.ts     백엔드 계약(backend/app/schemas/catalog.py) 미러 — 웹이 쓰는 필드만
  axes.ts      세 축 표시 규칙(앱 app/src/data/axes.ts 와 같음) · 대안 사유 정리
  site.ts      App Store·약관 링크 · 컬렉션 라벨
  showcase.ts  첫 화면 휴대폰 제품 id + API 불통 시 스냅숏
```

## 지키는 것

- 글자는 `--f-display … --f-micro` 일곱 단계만. 모듈 CSS 에 글자 크기 숫자를 쓰지 않는다. 한나체는 히어로·섹션 제목·빈 상태 제목에만.
- 판정색은 칸이 있는 축(영양·성분)에만. 혈당 부담은 양(밥 N공기분)이고 색이 없다. `unknown`·`n/a` 는 회색 + 서버 `reason`.
- 서버 문장(`note`·`reason`·`caveats`·`daily_value.sentence`·가공육 안내)은 고치지 않는다. 예외 하나 — 대안 `reason` 에 섞여 오는
  레거시 점수·등급 조각(「A등급」「10점 더」「유사도」)은 걷는다(`lib/axes.cleanReason`). A~E 는 어디에도 내지 않는다.
- 밥 공기는 `per100.available_carb` 로만 계산한다(`carb` 로 계산하지 않는다). 「밥 N공기만큼 혈당이 오른다」고 쓰지 않는다.
- 「알레르기 없음」「비건」「안전합니다」「발암물질」을 만들지 않는다.

## 반응형

mobile `< 760px` · tablet `< 1040px` · desktop. 다크 모드는 `prefers-color-scheme` 로 애쉬 팔레트.
움직임은 `prefers-reduced-motion` 이면 끈다(등장·패럴랙스 없음).
