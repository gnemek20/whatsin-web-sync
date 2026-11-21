// 식품 타일 — 사진이 없을 때 회색 상자 대신 식품 종류 아이콘을 그린다(DESIGN_RULES §0-3·§6).
// 종류는 식품유형 문자열에서 고른다(앱 app/src/ui/FoodTile.tsx 와 같은 규칙·같은 그림).
// 사진(src)이 있으면 그 위에 얹는다(앱 ui/FoodTile 의 uri 와 같다 · 2026-11-03 웹 리뉴얼). 사진을 기다리지 않는다 — 틴트와 그림이 먼저
// 그려지고 사진이 오면 덮는다(§8). 깨진 사진은 alt 가 비어 있어 아무것도 그리지 않고 그림이 남는다.
import type React from 'react';
import styles from './FoodTile.module.css';

export type FoodKind = 'snack' | 'drink' | 'noodle' | 'dairy' | 'bakery' | 'protein' | 'sauce' | 'other';

// 세부 분류(2026-11-18 사용자 「음료 아이콘 하나로 퉁치면 헷갈린다 · 초콜릿이면 초콜릿 아이콘과 이름 — 유튜브 썸네일처럼 한눈에」).
//   식품유형 문자열(식약처 품목보고)을 위에서부터 맞춰 보고 처음 걸린 분류를 쓴다. 분류마다 직접 그린 24 격자 선 그림 + 읽히는 이름.
//   색은 넓은 묶음(FoodKind) 그대로 — 목록 · 카드의 종류 색(--tile-*)이 바뀌지 않는다.
//   예전 규칙은 「티」 「차$」가 스파게티 · 소스 이름까지 음료로 잡았다 — 이번에 분류를 잘게 나누며 같이 걷었다.
//   분포 근거: 서빙 스냅숏 food_type 상위 90개(빵류 4만 · 즉석조리 2.7만 · 과자 2.2만 · 즉석섭취 1.6만 · 캔디 1.2만 · 소스 1만 …).
export type FoodCat = { id: string; label: string; kind: FoodKind; glyph: React.ReactNode };

const C = (id: string, label: string, kind: FoodKind, glyph: React.ReactNode): FoodCat => ({ id, label, kind, glyph });
const G = {
  chocolate: <><rect x="5" y="3.5" width="14" height="17" rx="1.8" /><path d="M5 9.2h14M5 14.8h14M12 3.5v17" /></>,
  candy: <><circle cx="12" cy="12" r="4.3" /><path d="M7.9 10.4 3.5 8v8l4.4-2.4M16.1 10.4 20.5 8v8l-4.4-2.4" /></>,
  cookie: <><circle cx="12" cy="12" r="8" /><circle cx="9.5" cy="9.5" r="0.9" /><circle cx="14.5" cy="11" r="0.9" /><circle cx="10.5" cy="14.8" r="0.9" /></>,
  nuts: <><path d="M12 3.5c2.4 0 4 1.8 4 4 0 1.5-.9 2.3-.9 3.6s.9 2.1.9 3.6c0 2.3-1.6 4.3-4 4.3s-4-2-4-4.3c0-1.5.9-2.3.9-3.6S8 9 8 7.5c0-2.2 1.6-4 4-4z" /><path d="M10.5 8h3M10.5 15h3" /></>,
  bread: <path d="M6 20V11a4 4 0 0 1-1-7h14a4 4 0 0 1-1 7v9z" />,
  ricecake: <><rect x="4" y="5.5" width="16" height="5" rx="2.5" /><rect x="4" y="13.5" width="16" height="5" rx="2.5" /></>,
  icecream: <><path d="M7.5 10.5a4.5 4.5 0 0 1 9 0" /><path d="M7 10.5h10l-5 10z" /></>,
  milk: <><path d="M8 9l2-5h4l2 5v11H8z" /><path d="M8 9h8M10 4l2 5" /></>,
  yogurt: <><path d="M6.5 8h11l-1.4 12H7.9z" /><path d="M5.5 8h13M9 4.5h6v3.5H9z" /></>,
  cheese: <><path d="M3.5 17.5 17 7l3.5 2v8.5z" /><circle cx="10" cy="14.5" r="1" /><circle cx="15.5" cy="12.5" r="0.9" /></>,
  drink: <><path d="M6.5 8h11l-1.4 12h-8.2z" /><path d="M12 8l1.6-4.5H17" /><path d="M7.2 12.5h9.6" /></>,
  juice: <><path d="M6.5 8h10l-1.3 12H7.8z" /><circle cx="16.5" cy="6" r="2.6" /><path d="M7 12.5h9" /></>,
  soda: <><rect x="7" y="3.5" width="10" height="17" rx="2.2" /><path d="M7 7.5h10M7 16.5h10" /><path d="M11 10.5v3M13 11v1.5" /></>,
  coffee: <><path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M9 3.5c0 1.5 1 1.5 1 3M12.5 3.5c0 1.5 1 1.5 1 3" /></>,
  tea: <><path d="M4.5 10h13v2.5a6.5 6.5 0 0 1-13 0z" /><path d="M17.5 11.5h1a2 2 0 0 1 0 4h-1.5" /><path d="M8.5 4c1 1 1 2 0 3M12.5 4c1 1 1 2 0 3" /></>,
  ramen: <><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" /><path d="M14 3.5L10 12M18.5 4.5L13 12" /></>,
  noodle: <path d="M4 7.5c2-2 3 2 5 0s3 2 5 0 3 2 5 0M4 12c2-2 3 2 5 0s3 2 5 0 3 2 5 0M4 16.5c2-2 3 2 5 0s3 2 5 0 3 2 5 0" />,
  dumpling: <><path d="M3.5 16a8.5 8.5 0 0 1 17 0z" /><path d="M8 10.5l1 2.5M12 9v3M16 10.5l-1 2.5" /></>,
  meal: <><rect x="3.5" y="6" width="17" height="13" rx="2" /><path d="M3.5 11h17M11 11v8" /></>,
  meat: <><path d="M4.5 10c0-3.6 3.2-5.8 7.5-5.5s7.5 3 7.5 7-3.2 7.5-7.5 7.5c-3 0-3.6-2-5.6-3.2S4.5 13.5 4.5 10z" /><circle cx="14" cy="11.5" r="2.2" /></>,
  sausage: <g transform="rotate(-35 12 12)"><rect x="3.5" y="9" width="17" height="6" rx="3" /><path d="M1.8 12h1.7M20.5 12h1.7M9 9v6M15 9v6" /></g>,
  egg: <path d="M12 3.5c-3.6 0-6 6-6 10a6 6 0 0 0 12 0c0-4-2.4-10-6-10z" />,
  fish: <><path d="M3 12c3-4.5 9-6 14-2l3.5-2.5v9L17 14c-5 4-11 2.5-14-2z" /><circle cx="8" cy="11" r="0.9" /></>,
  skewer: <><path d="M12 2.5v19" /><rect x="6.5" y="5.5" width="11" height="5" rx="1.5" /><rect x="6.5" y="12.5" width="11" height="5" rx="1.5" /></>,
  laver: <><rect x="4.5" y="4.5" width="15" height="15" rx="1.5" /><path d="M4.5 9.5h15M4.5 14.5h15" /></>,
  kimchi: <><path d="M12 20.5c-4.5 0-7-3.5-7-8 0-3.5 2.5-8 7-8s7 4.5 7 8c0 4.5-2.5 8-7 8z" /><path d="M12 20.5V8M12 14l-3-2.5M12 11l3-2.5" /></>,
  side: <><path d="M3.5 13h17a8.5 6 0 0 1-17 0z" /><path d="M8 4.5l5.5 6M11.5 3.5l4.5 6" /></>,
  bottle: <><path d="M10 3.5h4v3.5l2 2.5v11H8V9.5l2-2.5z" /><path d="M8 13h8" /></>,
  jar: <><path d="M7 6.5h10l1.5 3.5v5.5A4.5 4.5 0 0 1 14 20h-4a4.5 4.5 0 0 1-4.5-4.5V10z" /><path d="M6 6.5h12M9 3.5h6v3H9z" /></>,
  drop: <path d="M12 3.5c3 4 6 7.5 6 10.5a6 6 0 0 1-12 0c0-3 3-6.5 6-10.5z" />,
  jam: <><rect x="6.5" y="8" width="11" height="12" rx="2" /><path d="M6 5h12v3H6zM9.5 13h5" /></>,
  tofu: <><path d="M4 9l8-4 8 4v7l-8 4-8-4z" /><path d="M4 9l8 4 8-4M12 13v7" /></>,
  grain: <><path d="M12 21V4" /><path d="M12 9c-2 0-3.5-1.5-3.5-3.5 2 0 3.5 1.5 3.5 3.5zM12 9c2 0 3.5-1.5 3.5-3.5-2 0-3.5 1.5-3.5 3.5zM12 14c-2 0-3.5-1.5-3.5-3.5 2 0 3.5 1.5 3.5 3.5zM12 14c2 0 3.5-1.5 3.5-3.5-2 0-3.5 1.5-3.5 3.5z" /></>,
  baby: <><path d="M9 8.5h6v10.5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /><path d="M10 8.5V6.5a2 2 0 0 1 4 0v2M9 12.5h6" /></>,
  shaker: <><path d="M7.5 7.5h9l-1 12.5h-7z" /><path d="M8 7.5V4.5h8v3M8.2 11.5h7.6" /></>,
  sugar: <><rect x="4" y="11.5" width="7" height="7" rx="1" /><rect x="13" y="11.5" width="7" height="7" rx="1" /><rect x="8.5" y="4" width="7" height="7" rx="1" /></>,
  fruit: <><path d="M12 7.5c-3-2-7.5-.5-7.5 4.5 0 4.5 3 8.5 6 8.5.7 0 1-.4 1.5-.4s.8.4 1.5.4c3 0 6-4 6-8.5 0-5-4.5-6.5-7.5-4.5z" /><path d="M12 7.5c0-2 1-3.5 2.5-4" /></>,
  box: <><rect x="4.5" y="7.5" width="15" height="12" rx="2" /><path d="M4.5 11h15M9 7.5l1.5-3h3l1.5 3" /></>,
};

// 순서가 중요하다 — 앞에서 먼저 걸린다(「우유음료」는 우유로 · 「초콜릿가공품」은 초콜릿으로).
const CATS: [RegExp, FoodCat][] = [
  [/이유식|영.?유아/, C('baby', '이유식', 'dairy', G.baby)],
  [/체중조절|조제식품|환자용|식단형/, C('shake', '식사대용', 'dairy', G.shaker)],
  // 「식육함유가공품」 「땅콩버터」가 아래 우유 규칙(유가공 · 버터)에 먼저 걸리지 않게 앞에 둔다
  [/식육|양념육|가공육|포장육|저장육|육류/, C('meat', '고기', 'protein', G.meat)],
  [/견과|땅콩|아몬드/, C('nuts', '견과', 'snack', G.nuts)],
  [/아이스크림|아이스밀크|빙과|샤베트|셔벗/, C('icecream', '아이스크림', 'dairy', G.icecream)],
  [/치즈/, C('cheese', '치즈', 'dairy', G.cheese)],
  [/발효유|요구르트|요거트/, C('yogurt', '요거트', 'dairy', G.yogurt)],
  [/가공두유|^두유|원액두유|두유$/, C('soymilk', '두유', 'dairy', G.milk)],
  [/우유|가공유|유가공|분유|조제유|유음료|버터|크림/, C('milk', '우유', 'dairy', G.milk)],
  [/초콜릿|초콜렛|코코아/, C('chocolate', '초콜릿', 'snack', G.chocolate)],
  [/캔디|사탕|젤리|껌/, C('candy', '사탕, 젤리', 'snack', G.candy)],
  [/커피/, C('coffee', '커피', 'drink', G.coffee)],
  [/액상차|고형차|침출차|녹차|홍차|차류|^차$/, C('tea', '차', 'drink', G.tea)],
  [/탄산/, C('soda', '탄산음료', 'drink', G.soda)],
  [/주스|과.?채음료|과즙/, C('juice', '주스', 'drink', G.juice)],
  [/음료|생수|먹는샘물|음용|홍삼|인삼/, C('drink', '음료', 'drink', G.drink)],
  [/유탕면|라면/, C('ramen', '라면', 'noodle', G.ramen)],
  [/건면|숙면|생면|국수|파스타|우동|당면|냉면|^면/, C('noodle', '면', 'noodle', G.noodle)],
  [/만두/, C('dumpling', '만두', 'noodle', G.dumpling)],
  [/빵|베이커리|케이크|도넛|파이|와플/, C('bread', '빵', 'bakery', G.bread)],
  [/떡/, C('ricecake', '떡', 'bakery', G.ricecake)],
  [/곡류|시리얼|씨리얼|곡물|선식|미숫가루|밀가루|전분/, C('grain', '곡물', 'bakery', G.grain)],
  [/과자|스낵|쿠키|비스킷|강정|서류가공|팝콘/, C('snack', '과자', 'snack', G.cookie)],
  [/잼/, C('jam', '잼', 'snack', G.jam)],
  [/당류가공|설탕|올리고당|물엿|시럽|벌꿀|^꿀/, C('sugar', '당류', 'snack', G.sugar)],
  [/김치|김칫/, C('kimchi', '김치', 'sauce', G.kimchi)],
  [/조미김|가공김|^김$/, C('laver', '김', 'protein', G.laver)],
  [/어묵/, C('fishcake', '어묵', 'protein', G.skewer)],
  [/수산|어육|생선|건어|젓갈|액젓|어포|맛살/, C('seafood', '수산물', 'protein', G.fish)],
  [/햄|소시지|베이컨/, C('ham', '햄, 소시지', 'protein', G.sausage)],
  [/식육|양념육|가공육|고기|닭|오리|족발|육포|갈비|불고기/, C('meat', '고기', 'protein', G.meat)],
  [/알가열|알가공|계란|달걀|난류/, C('egg', '계란', 'protein', G.egg)],
  [/두부/, C('tofu', '두부', 'protein', G.tofu)],
  [/두류/, C('bean', '콩 가공품', 'protein', G.tofu)],
  [/묵류|^묵/, C('muk', '묵', 'protein', G.tofu)],
  [/과.?채가공|농산가공|과일|채소/, C('fruit', '과일, 채소', 'snack', G.fruit)],
  [/즉석조리|즉석섭취|간편조리|신선편의|도시락|김밥|샌드위치|햄버거|피자/, C('meal', '간편식', 'noodle', G.meal)],
  [/고추장|된장|간장|쌈장|춘장|청국장|혼합장|장류/, C('jang', '장류', 'sauce', G.jar)],
  [/식초/, C('vinegar', '식초', 'sauce', G.bottle)],
  [/기름|올리브|유지|향미유|유채유|현미유|미강유|카놀라|마가린|식용유|^.{0,4}유$/, C('oil', '기름', 'sauce', G.drop)],
  [/소스|드레싱|케첩|마요|조미|양념|향신|고춧가루|카레|스프|수프/, C('sauce', '소스, 양념', 'sauce', G.bottle)],
  [/절임|조림|장아찌|반찬|피클|볶음|무침/, C('side', '반찬', 'sauce', G.side)],
];
const OTHER = C('other', '가공식품', 'other', G.box);
// 넓은 묶음만 받았을 때(첫 화면 장식 타일 등)의 대표 그림
const BY_KIND: Record<FoodKind, FoodCat> = {
  snack: C('snack', '과자', 'snack', G.cookie), drink: C('drink', '음료', 'drink', G.drink), noodle: C('ramen', '라면', 'noodle', G.ramen),
  dairy: C('milk', '우유', 'dairy', G.milk), bakery: C('bread', '빵', 'bakery', G.bread), protein: C('meat', '고기', 'protein', G.meat),
  sauce: C('sauce', '소스, 양념', 'sauce', G.bottle), other: OTHER,
};

export function foodCat(type?: string | null): FoodCat {
  const s = (type ?? '').trim();
  for (const [re, c] of CATS) if (re.test(s)) return c;
  return OTHER;
}

export function foodKind(type?: string | null): FoodKind {
  return foodCat(type).kind;
}

const GLYPH = { 32: 16, 40: 20, 44: 22, 48: 24, 56: 28, 64: 30, 72: 32, 88: 40, 104: 46, 120: 52, 160: 64, 200: 76 } as const;

export function FoodTile({
  type,
  kind,
  size = 44,
  src,
  priority = false,
  named: namedProp,
}: {
  type?: string | null;
  kind?: FoodKind;
  size?: keyof typeof GLYPH;
  src?: string | null;
  /** 첫 화면의 큰 그림(제품 상세 머리 · LCP) — 미루지 않고 먼저 받는다. 나머지는 화면에 들어올 때. */
  priority?: boolean;
  /** 그림 아래 이름을 쓸지 — 기본은 큰 칸(88 이상)만. 목록 줄처럼 작은 칸도 이름이 필요하면 true(검색 추천 · 2026-11-18). */
  named?: boolean;
}) {
  const cat = kind ? BY_KIND[kind] : foodCat(type);
  const k = cat.kind;
  // 큰 칸(88 이상)에서 사진이 없으면 이름을 그림 아래에 쓴다 — 그림만으로 헷갈리지 않게(2026-11-18). 사진이 있으면 이름은 가린다.
  const named = (namedProp ?? size >= 88) && !src;
  const g = named ? Math.round(GLYPH[size] * 1.05) : GLYPH[size];
  return (
    <span
      className={`${styles.tile} ${size >= 88 ? styles.big : ''} ${named ? `${styles.named} ${size < 88 ? styles.namedSm : ''}` : ''}`}
      style={{
        width: size,
        height: size,
        background: `var(--tile-${k}-bg)`,
        color: `var(--tile-${k}-ink)`,
      }}
      aria-hidden="true"
    >
      <svg
        width={g}
        height={g}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {cat.glyph}
      </svg>
      {named ? <span className={styles.label} style={{ fontSize: Math.max(12, Math.round(size * 0.13)) }}>{cat.label}</span> : null}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 외부(식약처 HACCP) 사진 · 최적화 서버를 거치지 않는다
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // @ts-expect-error -- React 18.3 타입에 fetchPriority 소문자 속성이 없다(브라우저는 fetchpriority 를 읽는다)
          fetchpriority={priority ? 'high' : undefined}
          referrerPolicy="no-referrer"
          className={styles.img}
        />
      ) : null}
    </span>
  );
}
