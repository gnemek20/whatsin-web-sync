// 휴대폰 속 앱 판독 화면 — 이미지가 아니라 HTML/CSS 로 그린다. 값은 실제 제품 응답 그대로.
import { FoodTile } from '../FoodTile';
import { Icon } from '../Icon';
import { Meter } from '../axis/Meter';
import { AXIS_NAME, glycemicView, ingredientView, nutritionView, IMPROVE_LABEL } from '@/lib/axes';
import type { Alternative, ProductDetail } from '@/lib/types';
import { verdictStyle } from '../product/Ingredients';
import styles from './PhoneMock.module.css';
import { Rich } from '@/components/Rich';

export function PhoneMock({ p, alt }: { p: ProductDetail; alt?: Alternative | null }) {
  const ax = p.axes;
  const n = ax ? nutritionView(ax.nutrition) : null;
  const g = ax ? glycemicView(ax.glycemic) : null;
  const i = ax ? ingredientView(ax.ingredient) : null;
  const seen = new Set<string>();
  const chips = p.ingredients.filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true))).slice(0, 6);

  return (
    <div className={styles.phone} aria-hidden="true">
      <div className={styles.screen}>
        <div className={styles.status}>
          <span className="t-micro">9:41</span>
          <span className={styles.island} />
          <span className={styles.bat} />
        </div>
        <div className={styles.nav}>
          <Icon name="back" size={20} />
        </div>

        <div className={styles.title}>
          <FoodTile type={p.sub} size={56} />
          <div className={styles.titleText}>
            <span className="t-caption c-t2">{p.brand.split('/')[0]}</span>
            <span className="t-headline">{p.name}</span>
          </div>
        </div>

        {n && g && i ? (
          <div className={styles.axes}>
            <div className={styles.axRow}>
              <span className={styles.axIcon} style={n.tone ? { color: `var(--band-${n.tone})` } : undefined}>
                <Icon name="apple" size={16} strokeWidth={2} />
              </span>
              <span className={`t-micro c-t2 ${styles.axName}`}>{AXIS_NAME.nutrition}</span>
              <span className="t-strong" style={n.tone ? { color: `var(--band-${n.tone}-t)` } : undefined}><Rich text={n.value} /></span>
              <span className={styles.axMeter}><Meter band={n.meter} /></span>
            </div>
            <div className={styles.axRow}>
              <span className={styles.axIcon}>
                <Icon name="bowl" size={16} strokeWidth={2} />
              </span>
              <span className={`t-micro c-t2 ${styles.axName}`}>당질</span>
              <span className="t-strong"><Rich text={g.value} /></span>
              {g.amount ? (
                <span className={styles.axBar}>
                  <span style={{ width: `${Math.min(100, g.amount.carbBowls * 100)}%` }} />
                </span>
              ) : null}
            </div>
            <div className={styles.axRow}>
              <span className={styles.axIcon} style={i.tone ? { color: `var(--band-${i.tone})` } : undefined}>
                <Icon name="flask" size={16} strokeWidth={2} />
              </span>
              <span className={`t-micro c-t2 ${styles.axName}`}>성분</span>
              <span className={`t-strong ${styles.axLong}`} style={i.tone ? { color: `var(--band-${i.tone}-t)` } : undefined}><Rich text={i.value} /></span>
            </div>
          </div>
        ) : null}

        {chips.length > 0 ? (
          <div className={styles.block}>
            <span className="t-micro c-t2">원재료</span>
            <div className={styles.chips}>
              {chips.map((c) => (
                <span key={c.key} className={`t-caption ${styles.chip}`} style={verdictStyle(c.verdict)}>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {alt ? (
          <div className={styles.block}>
            <span className="t-micro c-t2">{alt.kind === 'lateral' ? '비슷하게 좋음' : '더 나은 대안'}</span>
            <div className={styles.alt}>
              <FoodTile type={alt.sub} />
              <span className={styles.altText}>
                <span className={`t-strong ${styles.one}`}>{alt.name}</span>
                <span className={styles.ups}>
                  {(alt.improves ?? []).map((k) => (
                    <span key={k} className={`t-micro ${styles.up}`}>
                      <Icon name="arrowUp" size={16} />
                      {IMPROVE_LABEL[k] ?? k}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
