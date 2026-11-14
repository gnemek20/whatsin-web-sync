// 세 축 요약 두 벌 — 앱 ui/AxisGlyphs(목록 행 · 웹의 옛 아이콘 글리프 AxisGlyphs 를 대신한다) · components/AxisPanel.AxisSummary(상세 맨 위)와 같은 말 · 같은 순서(영양 | 성분 | 당질).
//   AxisStrip   목록 행 이름 아래 한 줄 「영양 아쉬움 | 성분 보통 | 당질 22g」 — 세 칸 같은 폭 · 가운데 · 짧은 세로선(DESIGN_RULES §5).
//               모르는 축도 칸은 남기고 「—」 — 줄마다 위치가 같아야 위아래로 견줘 읽힌다.
//   AxisSummary(./AxisSummary) 상세 맨 위 카드 — 칸마다 축 이름(작게) + 값(크게). 당질은 원물 비유(「사과 1개」 · 색 없음 · 2026-11-04).
// A~E 등급은 쓰지 않는다(내부 지표 — DECISIONS 2026-09-14). 색 점 · 가운뎃점 없음(§0-7).
import { toneOf } from '@/lib/bands';
import { AXIS_NAME, CARB_NONE, SHORT_WORD } from '@/lib/content/words';
import type { Axis, ProductAxes } from '@/lib/types';
import styles from './strip.module.css';

// 칸 말은 axes.json band_word — 축마다 제 말(2026-11-06).
// TODO(data): move to packages/data/axes/axes.json — 세 칸 다 모를 때의 한 줄.
const ALL_UNKNOWN = '세 축 판단 불가, 데이터 부족';

function carbShort(a?: Axis | null): string | null {
  if (!a || a.band !== 'amount' || a.carb_g == null) return a?.band === 'n/a' ? CARB_NONE : null;
  const g = a.carb_g;
  return `${g < 10 ? Math.round(g * 10) / 10 : Math.round(g)}g`;
}

export function AxisStrip({ axes, className }: { axes?: ProductAxes | null; className?: string }) {
  if (!axes) return null;
  const n = toneOf('nutrition', axes.nutrition);
  const i = toneOf('ingredient', axes.ingredient);
  const carb = carbShort(axes.glycemic);
  // 세 칸 다 모르면 줄을 지우지 않고 한 줄로 말한다 — 세 축은 어느 제품에서도 빠지지 않는다(2026-11-03 사용자).
  if (n == null && i == null && carb == null) return <span className={`t-caption c-t3 ${className ?? ''}`}>{ALL_UNKNOWN}</span>;
  const cell = (name: string, value: string | null, tone: number | null) => (
    <span className={styles.cell}>
      <span className="c-t2">{name} </span>
      <span style={value && tone ? { color: `var(--band-${tone}-t)` } : undefined} className={value ? undefined : 'c-t3'}>
        {value ?? '—'}
      </span>
    </span>
  );
  return (
    <span className={`t-caption ${styles.strip} ${className ?? ''}`}>
      {cell(AXIS_NAME.nutrition, n ? SHORT_WORD(n, 'nutrition') : null, n)}
      <span className={styles.rule} aria-hidden />
      {cell(AXIS_NAME.ingredient, i ? SHORT_WORD(i) : null, i)}
      <span className={styles.rule} aria-hidden />
      {cell(AXIS_NAME.glycemic, carb, null)}
    </span>
  );
}
