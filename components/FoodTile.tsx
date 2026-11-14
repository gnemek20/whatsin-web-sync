// 식품 타일 — 사진이 없을 때 회색 상자 대신 식품 종류 아이콘을 그린다(DESIGN_RULES §0-3·§6).
// 종류는 식품유형 문자열에서 고른다(앱 app/src/ui/FoodTile.tsx 와 같은 규칙·같은 그림).
// 사진(src)이 있으면 그 위에 얹는다(앱 ui/FoodTile 의 uri 와 같다 · 2026-11-03 웹 리뉴얼). 사진을 기다리지 않는다 — 틴트와 그림이 먼저
// 그려지고 사진이 오면 덮는다(§8). 깨진 사진은 alt 가 비어 있어 아무것도 그리지 않고 그림이 남는다.
import styles from './FoodTile.module.css';

export type FoodKind = 'snack' | 'drink' | 'noodle' | 'dairy' | 'bakery' | 'protein' | 'sauce' | 'other';

// 순서가 중요하다 — 앞에서 먼저 걸린다(「우유음료」는 유제품으로 보이게 유제품을 앞에).
const RULES: [FoodKind, RegExp][] = [
  ['dairy', /우유|유가공|요구르트|요거트|발효유|치즈|버터|아이스크림|분유|조제유|크림/],
  ['noodle', /면|라면|국수|파스타|우동|당면/],
  ['drink', /음료|커피|차$|차류|티|주스|탄산|생수|두유|음용|액상차|침출차|과채/],
  ['bakery', /빵|떡|케이크|베이커리|도넛|파이|와플|시리얼/],
  ['snack', /과자|스낵|쿠키|비스킷|캔디|사탕|초콜릿|초콜렛|젤리|껌|강정|견과|당류가공/],
  ['protein', /햄|소시지|육|고기|닭|계란|알가공|어묵|수산|생선|두부|만두/],
  ['sauce', /소스|장류|간장|된장|고추장|양념|조미|드레싱|케첩|식초|소금|향신|김치|절임|잼/],
];

export function foodKind(type?: string | null): FoodKind {
  const s = type ?? '';
  for (const [k, re] of RULES) if (re.test(s)) return k;
  return 'other';
}

function Glyph({ kind }: { kind: FoodKind }) {
  switch (kind) {
    case 'snack':
      return <><circle cx="12" cy="12" r="8" /><circle cx="9.5" cy="9.5" r="0.9" /><circle cx="14.5" cy="11" r="0.9" /><circle cx="10.5" cy="14.8" r="0.9" /></>;
    case 'drink':
      return <><path d="M6.5 8h11l-1.4 12h-8.2z" /><path d="M12 8l1.6-4.5H17" /><path d="M7.2 12.5h9.6" /></>;
    case 'noodle':
      return <><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" /><path d="M14 3.5L10 12M18.5 4.5L13 12" /></>;
    case 'dairy':
      return <><path d="M8 9l2-5h4l2 5v11H8z" /><path d="M8 9h8M10 4l2 5" /></>;
    case 'bakery':
      return <path d="M6 20V11a4 4 0 0 1-1-7h14a4 4 0 0 1-1 7v9z" />;
    case 'protein':
      return <path d="M12 3.5c-3.6 0-6 6-6 10a6 6 0 0 0 12 0c0-4-2.4-10-6-10z" />;
    case 'sauce':
      return <><path d="M10 3.5h4v3.5l2 2.5v11H8V9.5l2-2.5z" /><path d="M8 13h8" /></>;
    default:
      return <><rect x="4.5" y="7.5" width="15" height="12" rx="2" /><path d="M4.5 11h15M9 7.5l1.5-3h3l1.5 3" /></>;
  }
}

const GLYPH = { 32: 16, 40: 20, 44: 22, 48: 24, 56: 28, 64: 30, 72: 32, 88: 40, 104: 46, 120: 52, 160: 64, 200: 76 } as const;

export function FoodTile({
  type,
  kind,
  size = 44,
  src,
  priority = false,
}: {
  type?: string | null;
  kind?: FoodKind;
  size?: keyof typeof GLYPH;
  src?: string | null;
  /** 첫 화면의 큰 그림(제품 상세 머리 · LCP) — 미루지 않고 먼저 받는다. 나머지는 화면에 들어올 때. */
  priority?: boolean;
}) {
  const k = kind ?? foodKind(type);
  const g = GLYPH[size];
  return (
    <span
      className={`${styles.tile} ${size >= 88 ? styles.big : ''}`}
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
        <Glyph kind={k} />
      </svg>
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
