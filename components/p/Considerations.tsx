// 「함께 살펴볼 것」 — 내 기준 밖에서 알아 둘 사실(주의 성분 · 감미료 · 당류 0인데 당질 · 계산 한계 · 자료 의심 · 가공육).
// 문턱을 새로 만들지 않는다(lib/facts.considerations). 2026-11-14 — 넓은 화면은 두 칸으로 편다(flex-wrap).
import Link from 'next/link';
import type { ProductDetail } from '@/lib/types';
import type { Lens } from '@/lib/lens';
import { avoidCheck, considerations } from '@/lib/facts';
import { Rich } from '../Rich';
import { Icon } from '../ui/Icon';
import s from './p.module.css';

export function Considerations({ p, lens }: { p: ProductDetail; lens: Lens }) {
  const items = considerations(p, lens.focus, avoidCheck(p, lens.avoid));
  if (!items.length) return null;
  return (
    <section className={s.section} aria-labelledby="more-h">
      <div className={s.sectionHead}>
        <h2 id="more-h" className={s.sectionTitle}>함께 살펴볼 것</h2>
        <span className="t-caption c-t3">{items.length}가지</span>
      </div>
      <ul className={s.considerList}>
        {items.map((c) => {
          const inner = (
            <>
              <span className={s.considerBar} aria-hidden>
                <Icon name="info" size={18} />
              </span>
              <span className={s.considerText}>
                <span className="t-strong">{c.title}</span>
                <span className="t-caption c-t2"><Rich text={c.body} /></span>
              </span>
              {c.href ? <Icon name="next" size={18} className={s.considerLink} /> : null}
            </>
          );
          return (
            <li key={c.id} className={s.considerItem}>
              {c.href ? (
                <Link href={c.href} className={`${s.consider} ${s.considerOn}`} aria-label={`${c.title}, 성분 사전에서 보기`}>{inner}</Link>
              ) : (
                <div className={s.consider}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
