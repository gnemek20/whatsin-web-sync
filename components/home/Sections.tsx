// 첫 화면의 나머지 섹션 — 세 축 · 둘러보기 · 읽는 법 · 앱 받기.
// 글은 최소로. 그림은 전부 손으로 그린 SVG.
import Link from 'next/link';
import { Icon } from '../Icon';
import { AppStoreButton } from '../AppStoreButton';
import { VerdictTag, verdictStyle } from '../product/Ingredients';
import { AXIS_NAME, AXIS_SOURCE } from '@/lib/axes';
import { BAND_WORD } from '@/lib/content/axes';
import type { CollectionOption, Ingredient, IngredientOfDay, ProductDetail } from '@/lib/types';
import styles from './home.module.css';
import { Rich } from '@/components/Rich';

function SectionHead({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <div className={styles.head} data-reveal>
      <p className={`t-micro ${styles.eyebrow}`}>{eyebrow}</p>
      <h2 id={id} className="t-display">{title}</h2>
    </div>
  );
}

/* ── 세 축 — Function Health 처럼 큰 값 하나 + 짧은 설명, 세로 선으로 나눈 세 칸 ── */

function NutritionArt() {
  const rows: [number, string][] = [1, 2, 3, 4].map((b) => [b, BAND_WORD.nutrition[String(b)]]);
  return (
    <div className={styles.artScale}>
      {rows.map(([b, l]) => (
        <span key={b} className={styles.artScaleRow}>
          <span className={styles.artScaleBar} style={{ background: `var(--band-${b})`, width: `${100 - (b - 1) * 18}%` }} />
          <span className="t-caption c-t2">{l}</span>
        </span>
      ))}
    </div>
  );
}

function BowlArt({ fill }: { fill: number }) {
  // 밥 공기 하나를 제품의 1회분 만큼 채운 그림 — 양의 환산이지 혈당 반응이 아니다.
  return (
    <svg viewBox="0 0 200 120" className={styles.artSvg} aria-hidden="true">
      <defs>
        <clipPath id="bowlClip">
          <path d="M28 52h144a72 72 0 0 1-47.4 60H75.4A72 72 0 0 1 28 52z" />
        </clipPath>
      </defs>
      <rect x="28" y={52 + 60 * (1 - Math.min(1, fill))} width="144" height="60" fill="var(--t1)" opacity="0.14" clipPath="url(#bowlClip)" />
      <path d="M28 52h144a72 72 0 0 1-47.4 60H75.4A72 72 0 0 1 28 52z" fill="none" stroke="var(--t1)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M58 52a42 42 0 0 1 84 0" fill="none" stroke="var(--t1)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M180 77h12" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChipsArt({ items }: { items: Ingredient[] }) {
  return (
    <div className={styles.artChips}>
      {items.map((it) => (
        <span key={it.key} className={`t-caption ${styles.artChip}`} style={verdictStyle(it.verdict)}>
          {it.name}
        </span>
      ))}
    </div>
  );
}

/** 예시 값은 첫 화면 휴대폰과 같은 실제 제품에서 가져온다. */
export function AxesSection({ p }: { p: ProductDetail }) {
  const seen = new Set<string>();
  const chips = p.ingredients.filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true))).slice(0, 6);
  const g = p.axes?.glycemic;
  const bowls = g?.band === 'amount' && g.carb_rice_bowls != null ? g.carb_rice_bowls : 0.5;
  const cols = [
    {
      key: 'nutrition',
      icon: 'apple' as const,
      name: AXIS_NAME.nutrition,
      big: '4칸',
      body: '**감점** 열량, 당류, 포화지방, 나트륨\n**가점** 단백질, 식이섬유',
      art: <NutritionArt />,
      src: AXIS_SOURCE.nutrition,
    },
    {
      key: 'glycemic',
      icon: 'bowl' as const,
      name: '당질',
      big: g?.band === 'amount' ? g.label : '사과 1개',
      body: '1회분 당질 → 사과, 감자, 밥 몇 개\n색 판정 없음',
      art: <BowlArt fill={bowls} />,
      src: AXIS_SOURCE.glycemic,
    },
    {
      key: 'ingredient',
      icon: 'flask' as const,
      name: '원재료',
      big: '원재료 하나씩',
      body: '원재료 사전 대조 → 주의 성분과 첨가물\n모르면 미확인',
      art: <ChipsArt items={chips} />,
      src: AXIS_SOURCE.ingredient,
    },
  ];
  return (
    <section className={`${styles.band} band-tint sheet`} aria-labelledby="axes-h">
      <div className="container">
        <SectionHead eyebrow="세 가지 축" title="등급 대신 세 가지" id="axes-h" />
        <div className={styles.axesGrid}>
          {cols.map((c) => (
            <article key={c.key} className={styles.axisCol} data-reveal>
              <div className={styles.axisArt}>{c.art}</div>
              <p className={`t-micro c-t2 ${styles.axisName}`}>
                <Icon name={c.icon} size={16} />
                {c.name}
              </p>
              <p className="t-title"><Rich text={c.big} /></p>
              <p className="t-body c-t2"><Rich text={c.body} /></p>
              <p className={`t-caption c-t3 ${styles.axisSrc}`}><Rich text={c.src} /></p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 둘러보기 — 웹에서 바로 써 보는 입구 ── */

const COLL_ICON: Record<string, 'apple' | 'bowl' | 'flask' | 'check' | 'cup'> = {
  zero_drink: 'cup',
  high_protein: 'apple',
  good_grade: 'check',
};

export function ExploreSection({
  collections,
  today,
}: {
  collections: CollectionOption[];
  today: IngredientOfDay | null;
}) {
  if (collections.length === 0 && !today) return null;
  return (
    <section className={`${styles.band} sheet sheet-paper`} aria-labelledby="explore-h">
      <div className="container">
        <SectionHead eyebrow="설치 없이" title="웹에서 바로" id="explore-h" />
        <div className={styles.exploreGrid}>
          {collections.map((c) => (
            <Link key={c.id} href={`/search?c=${encodeURIComponent(c.id)}`} className={`card lift ${styles.coll}`} data-reveal>
              <span className={styles.collIcon}>
                <Icon name={COLL_ICON[c.id] ?? 'search'} size={24} />
              </span>
              <span className="t-headline">{c.label}</span>
              <span className="t-body c-t2"><Rich text={c.desc} /></span>
              <span className={styles.collGo}>
                <Icon name="arrowRight" size={20} />
              </span>
            </Link>
          ))}
          {today ? (
            <Link href={`/i/${encodeURIComponent(today.name)}`} className={`lift ${styles.today}`} data-reveal>
              <span className="t-micro c-t2">오늘의 성분</span>
              <span className="t-title">{today.name}</span>
              <span className={`t-caption c-t2 ${styles.todayTag}`}>
                <span>{today.tag}</span>
                <VerdictTag v={today.verdict} />
              </span>
              <span className="t-body c-t2"><Rich text={today.plain} /></span>
              <span className={styles.collGo}>
                <Icon name="arrowRight" size={20} />
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── 읽는 법 — 세 단계, 그림 셋 ── */

function StepLabel() {
  return (
    <svg viewBox="0 0 160 120" className={styles.stepSvg} aria-hidden="true">
      <rect x="40" y="14" width="80" height="96" rx="10" fill="var(--surface)" stroke="var(--t1)" strokeWidth="2" />
      <path d="M52 32h56M52 42h40M52 52h48" stroke="var(--t1)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <rect x="52" y="64" width="56" height="34" rx="4" fill="none" stroke="var(--t1)" strokeWidth="2" />
      <path d="M52 75h56M52 86h56M80 64v34" stroke="var(--t1)" strokeWidth="1.5" opacity="0.4" />
      <path d="M20 40v-12a6 6 0 0 1 6-6h10M140 40v-12a6 6 0 0 0-6-6h-10M20 88v12a6 6 0 0 0 6 6h10M140 88v12a6 6 0 0 1-6 6h-10" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function StepMatch() {
  return (
    <svg viewBox="0 0 160 120" className={styles.stepSvg} aria-hidden="true">
      {[24, 52, 80].map((y, i) => (
        <g key={y}>
          <rect x="10" y={y} width="62" height="20" rx="10" fill="var(--surface)" stroke="var(--t1)" strokeWidth="2" />
          {/* 판정은 점이 아니라 글자(줄) 색으로(§0-7) — 못 찾은 것은 점선 회색 */}
          <path
            d={`M22 ${y + 10}h40`}
            stroke={i === 1 ? 'var(--band-3)' : i === 2 ? 'var(--t3)' : 'var(--band-1)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={i === 2 ? '3 4' : undefined}
          />
          <path d={`M72 ${y + 10}C92 ${y + 10} 92 60 108 60`} stroke={i === 2 ? 'var(--t3)' : 'var(--brand)'} strokeWidth="2" fill="none" strokeDasharray={i === 2 ? '3 4' : undefined} />
        </g>
      ))}
      <rect x="108" y="32" width="42" height="56" rx="6" fill="var(--surface)" stroke="var(--t1)" strokeWidth="2" />
      <path d="M129 32v56" stroke="var(--t1)" strokeWidth="2" />
      <path d="M115 46h8M115 54h8M135 46h8M135 54h8" stroke="var(--t1)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function StepAxes() {
  return (
    <svg viewBox="0 0 160 120" className={styles.stepSvg} aria-hidden="true">
      {[0, 1, 2].map((r) => (
        <g key={r} transform={`translate(18 ${22 + r * 30})`}>
          <rect width="124" height="22" rx="11" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
          {r === 1 ? (
            <rect x="14" y="8" width="58" height="6" rx="3" fill="var(--t1)" opacity="0.3" />
          ) : (
            [0, 1, 2, 3].map((s) => (
              <rect
                key={s}
                x={14 + s * 24}
                y="8"
                width="18"
                height="6"
                rx="3"
                fill={(r === 0 && s === 0) || (r === 2 && s === 1) ? (r === 0 ? 'var(--band-1)' : 'var(--band-2)') : 'var(--sunken)'}
              />
            ))
          )}
        </g>
      ))}
    </svg>
  );
}

export function HowSection() {
  const steps = [
    { art: <StepLabel />, title: '라벨 수집', body: '식약처 신고 원재료와 영양성분 그대로' },
    { art: <StepMatch />, title: '원재료 대조', body: '사전과 하나씩 대조\n못 찾으면 회색' },
    { art: <StepAxes />, title: '세 가지 판정', body: '영양 균형과 성분은 칸\n당질은 양과 구성' },
  ];
  return (
    <section id="how" className={`${styles.band} ${styles.howBand} band-ink sheet offscreen`} aria-labelledby="how-h">
      <div className="container">
        <SectionHead eyebrow="읽는 법" title="읽는 법" id="how-h" />
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.title} className={styles.step} data-reveal>
              <div className={styles.stepArt}>{s.art}</div>
              <span className={`t-micro ${styles.stepNo}`}>0{i + 1}</span>
              <h3 className="t-headline">{s.title}</h3>
              <p className="t-body c-t2"><Rich text={s.body} /></p>
            </li>
          ))}
        </ol>
        <ul className={styles.promises} data-reveal>
          <li className="t-strong"><Icon name="check" size={20} className="c-brand" />모르면 미확인</li>
          <li className="t-strong"><Icon name="check" size={20} className="c-brand" />판정 문장 그대로</li>
          <li className="t-strong"><Icon name="check" size={20} className="c-brand" />나쁜 점도 그대로</li>
        </ul>
      </div>
    </section>
  );
}

/* ── 앱 받기 ── */

function ScanArt() {
  return (
    <svg viewBox="0 0 240 200" className={styles.scanSvg} aria-hidden="true">
      <rect x="70" y="10" width="100" height="180" rx="22" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
      <rect x="102" y="20" width="36" height="8" rx="4" fill="currentColor" opacity="0.9" />
      <path d="M92 70v-10a6 6 0 0 1 6-6h10M148 70v-10a6 6 0 0 0-6-6h-10M92 120v10a6 6 0 0 0 6 6h10M148 120v10a6 6 0 0 1-6 6h-10" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M104 74v42M110 74v42M118 74v42M123 74v42M130 74v42M136 74v42" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
      <path d="M96 95h48" stroke="var(--brand)" strokeWidth="2" />
      <rect x="90" y="150" width="60" height="8" rx="4" fill="currentColor" opacity="0.25" />
      <rect x="100" y="164" width="40" height="6" rx="3" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

export function DownloadSection() {
  return (
    <section className={`${styles.dlBand} band-orange sheet sheet-last offscreen`} aria-labelledby="dl-h">
      <div className={`container ${styles.dl}`}>
        <div className={styles.dlCopy} data-reveal>
          <p className="t-micro">iPhone 앱</p>
          <h2 id="dl-h" className="t-display">
            진열대 앞에선
            <br />
            앱으로
          </h2>
          <p className={`t-body c-t2 ${styles.dlBody}`}>
            <Rich text={'바코드 스캔 → 바로 판독\n피할 성분 설정'} />
          </p>
          <AppStoreButton />
        </div>
        <div className={styles.dlArt} data-reveal>
          <ScanArt />
        </div>
      </div>
    </section>
  );
}
