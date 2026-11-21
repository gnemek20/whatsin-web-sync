// 4칸 미터 — 칸1(좋음)이 왼쪽. 현재 칸까지 판정색, 나머지는 트랙. 칸이 없으면 전부 트랙(회색).
import type { Band } from '@/lib/axes';
import styles from './axis.module.css';

export function Meter({ band, label }: { band: Band | null; label?: string }) {
  return (
    <span
      className={styles.meter}
      role="img"
      aria-label={band ? `4칸 중 ${band}칸${label ? ` — ${label}` : ''}` : '판정 없음'}
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={styles.seg}
          style={band && i === band ? { background: `var(--band-${band})` } : undefined}
          data-on={band != null && i === band ? '' : undefined}
        />
      ))}
    </span>
  );
}
