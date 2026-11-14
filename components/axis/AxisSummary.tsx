// 세 칸 요약 — 칸마다 축 이름(작게) + 값(크게). 당질은 1회분 g(색 없음 · 2026-11-13 원물 비유에서 바꿈).
// 서버에서만 그린다(목록 줄 AxisStrip 과 나눠 둔 것은 브라우저 번들에 당질 문구 · 칸 라벨이 들어가지 않게).
// 자세한 내용(섭취 시 영향 · 주의 성분)은 여기서 펼치지 않는다 — 아래 판정 근거의 줄이 펼쳐진다(2026-11-06 사용자).
import { bandOf, toneOf } from '@/lib/axes';
import { carbAmount } from '@/lib/content/carb';
import { AXIS_LABEL, AXIS_NAME, bandWord } from '@/lib/content/axes';
import type { ProductAxes } from '@/lib/types';
import styles from './strip.module.css';

// TODO(data): move to packages/data/axes/axes.json — 요약 칸의 「모름」 · 「확인 부족」 · 「거의 없음」.
const UNKNOWN = '미확인';
const THIN = '확인 부족';
const TINY = '거의 없음';

export function AxisSummary({ axes }: { axes: ProductAxes }) {
  const nb = toneOf('nutrition', axes.nutrition);
  const ib = toneOf('ingredient', axes.ingredient);
  const ibRaw = bandOf(axes.ingredient);
  const g = axes.glycemic;
  // 2026-11-13 — 1회분 당질 g(실 수치). 원물 비유는 판정 근거 카드의 「참고」 줄에만.
  const carb = g.band === 'amount' && g.carb_g != null ? (g.carb_g > 0 ? carbAmount(g.carb_g) : TINY) : g.band === 'n/a' ? AXIS_LABEL.na : null;
  const cell = (name: string, value: string, tone: number | null, muted: boolean) => (
    <div className={styles.sumCell}>
      <span className="t-micro c-t3">{name}</span>
      <span className={`t-headline ${styles.sumValue}`} style={tone ? { color: `var(--band-${tone}-t)` } : muted ? { color: 'var(--t3)' } : undefined}>
        {value}
      </span>
    </div>
  );
  return (
    <div className={`card ${styles.summary}`} role="group" aria-label="세 가지 판정 요약">
      {cell(AXIS_NAME.nutrition, nb ? bandWord('nutrition', nb) : UNKNOWN, nb, nb == null)}
      <span className={styles.sumRule} aria-hidden />
      {cell(AXIS_NAME.ingredient, ib ? bandWord('ingredient', ib) : ibRaw ? THIN : UNKNOWN, ib, ib == null)}
      <span className={styles.sumRule} aria-hidden />
      {cell(AXIS_NAME.glycemic, carb ?? UNKNOWN, null, carb == null)}
    </div>
  );
}
