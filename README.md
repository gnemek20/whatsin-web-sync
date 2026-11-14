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

## 2026-11-13 — 내 기준(맞춤) · 비교 · 커뮤니티 · 성분 사전 (검토 중 · 로컬)

근거 [`docs/pmf-research/README.md`](../docs/pmf-research/README.md) — 맨 위는 「내가 보는 성분이 들었나, 얼마나」. 위의 화면 · 디자인 규칙은 그대로이고 그 위에 더했다.
팔레트는 브랜드 그대로(오렌지 하나 + 따뜻한 무채색) — 내 기준 = `--brand*` · 피할 성분이 들어 있음 = 칸4 붉은색(`--hit*`, `--band-4` 에서 섞음).

| 무엇 | 어디 |
|---|---|
| 내 기준(목적 · 익숙한 정도 · 먼저 볼 영양 최대 3 · 피할 성분) — 쿠키 `wi_lens` 하나. 없으면 온보딩이 닫기 없이 뜬다 | `lib/lens.ts` · `components/lens/` |
| 피할 성분 목록 — 커뮤니티 언급 순(말티톨 먼저 · 에리스리톨은 「제외」 항목 따로). 여러 성분 키를 한 항목으로 묶는다(`ks`) | `lib/lens.ts` `AVOID_PRESETS` |
| 사실 계산(1회분 · 100g(mL)당 · 들었나 · 함께 살펴볼 것 · 목록 줄 숫자) — 「많다 · 적다」 판정은 만들지 않는다 | `lib/facts.ts` |
| 상세 — 맨 위 내 기준 → 함께 살펴볼 것 → 원재료 · 영양성분 → 다른 선택(「내 기준」 탭 추가) → 자세한 평가(세 축 · 같은 종류) → 비슷한 상품 | `app/p/[id]` · `components/p/` · `lib/lensAlt.server.ts` |
| 원재료 카드 안 찾기 — 낱말 입력 · 빠른 단추(감미료 · 색소 · 첨가물 · 유지) · 피할 성분은 붉은 칩 · 거르는 동안 카드 높이 고정 | `components/product/IngredientChips.tsx` |
| 검색 결과 — 위 12개에 내 기준 숫자 · 「○○ 들어 있음」 · 내 기준 순 정렬(`&by=`) | `app/search` · `components/ProductRow` |
| 비교 — 따로 담는 탭 · 막대 없이 **보던 제품 위에 창으로** 연다(제품 카드 아래 「다른 제품과 비교」 · 다른 선택 · 비슷한 상품 카드의 「비교」). 1:1 · 1:N 최대 4 · 숫자만 나란히 · 1회분/100g(mL)당 전환 · 주소 `?vs=` | `components/p/Compare.tsx` · `app/api/product/` |
| 커뮤니티 — **시험판: 이 브라우저에만 저장 · 처음 글은 예시** | `app/community` · `lib/community.ts` |
| 성분 사전 찾기 · 성분 상세에서 「피할 성분에 넣기」 | `app/i` · `components/dict/` |
| 헤더 메뉴(커뮤니티 · 성분 사전 · 내 기준) · 모바일 아래 탭 막대(검색 · 커뮤니티 · 성분 사전) | `components/site/Nav` · `components/shell/` |
| 같은 용도는 같은 부품 — 묶음 제목 `Section` · 목록 카드 `ListCard`/`ListRow` · 묶음 사이 간격 `--s-group` | `components/ui/` |
| 당질은 **g 이 큰 글씨**, 사과 · 밥 비유는 「참고」 한 줄로 내렸다 | `lib/content/carb.ts` `carbAmount` · `carbRef` |
| 새 화면 첫 면(띠 + 한나체 제목 + 겹쳐 올라오는 시트) | `components/shell/PageHero` |

새 화면 안의 단추 기본 모양은 `.ui` 범위에서만 걷는다(`app/globals.css` 끝 · 옛 화면 영향 없음). 나트륨 mg 은 API `per100` 에 칸이 없어 1일 기준치 % 에서 되돌린다(±1 mg).

**레이아웃이 밀리지 않게**(`app/globals.css` 머리 주석 ①~⑤) — 페이지 · 스크롤 칸은 `scrollbar-gutter: stable` · 켜고 끄는 것은 지우지 않고 `visibility` 로 숨긴다 · 상세는 대안 · 비슷한 상품 · 같은 종류를 제품과 같이 받아 한 번에 그린다(Suspense 로 흘려보내지 않는다) · 거르는 목록은 높이를 얼린다 · 드롭다운은 겹쳐 띄운다(`position: absolute`) · 줄 수가 바뀌는 칸은 큰 쪽 높이를 미리 잡는다.

## 2026-11-14 — 전면 디자인 개편 v4 (검토 중 · 로컬)

규칙 · 번복 · 레퍼런스는 [`docs/design/DESIGN_RULES.md`](../docs/design/DESIGN_RULES.md) §v4 가 정본이다. 요약 — 허브 그린 하나 + 애시(다크는 애시 · 차콜) ·
Geist(숫자 · 영문) + Pretendard(한글) · 자식 있는 부모는 flex · 레이아웃 밀림 금지 · 눌리는 것은 전부 hover.
상세 맨 위는 제품 카드 | 「내 기준으로 보면」(답 문장 + 큰 숫자 줄) · 머리는 flex 한 줄 · 모바일은 떠 있는 탭 캡슐. 위 2026-11-13 표의 「비교 담기 · 담기 막대 · `app/compare`」는 없어졌다(비교는 상세 위 창 · `?vs=`).
- 검색 · 둘러보기 정렬(2026-11-14) — 「검색어와 가까운 순 · 내 기준 · 다이어트할 때 · 혈당 관리할 때 · 첨가물 적게 · 영양 균형 좋은 순」(대안 「다른 선택」과 같은 말). 서버가 줄을 한 번 그리고 기준별 값 · 바닥 한 줄을 같이 넘겨 브라우저가 순서만 바꾼다(`components/search/SortableResults` · `lib/sort.ts`). 결과 제품 상세를 모두 받아 열량을 얻는다 — 검색 응답에 `kcal100` 이 실리면 줄일 수 있다.
- 자세한 평가의 세 축(2026-11-14) — 위 타일 세 칸(축 이름 · 판정 · 칸 막대 · 핵심 한 줄) + 고른 칸의 근거 패널 하나(`components/product/AxisCards` → `AxisTabs` · `axisTabs.module.css`). 처음 펼친 칸은 더 주의할 축. 예전 요약 카드(`AxisSummary`)는 상세에서 뺐다. 당질 비유는 밥 공기만(사과 · 감자 걷음).
- 로컬 개발은 운영 API + 중계(`.env.local` 의 `NEXT_PUBLIC_API_PROXY=1` · `app/api/proxy`) — 이 PC 에는 제품 DB 가 없어 로컬 백엔드가 비거나 멈춘다.
