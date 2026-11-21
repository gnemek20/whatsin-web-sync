// 분류 허브 끝 카드(2026-11-18) — 결과 목록 맨 끝, 이름 검색의 「더 찾아볼까요?」와 같은 자리 · 같은 모양.
// 이 순위를 어떻게 세웠는지(사실 · 한계) + 함께 보는 분류(그림 칸 · 같은 링크 줄 모양).
import Link from 'next/link';
import { HUBS, METRIC, hubHref, hubSub, type Hub } from '@/lib/hubs';
import { FoodTile } from '../FoodTile';
import { Icon } from '../Icon';
import s from './results.module.css';

export function HubTail({ hub }: { hub: Hub }) {
  // 같은 식품의 다른 기준 먼저, 그다음 같은 기준의 다른 식품(최대 6)
  const rel = [
    ...HUBS.filter((o) => o.q === hub.q && o.slug !== hub.slug),
    ...HUBS.filter((o) => o.group === hub.group && o.q !== hub.q),
  ].slice(0, 6);
  return (
    <div className={s.moreCard}>
      <div className={s.moreHead}>
        <p className={s.moreTitle}>이 순서는 이렇게 세웠습니다</p>
        <p className={s.moreBody}>{METRIC[hub.by].why}</p>
        <p className={s.moreBody}>
          제조사가 식약처에 신고한 영양성분표의 100g(mL)당 값으로 견줬습니다. 신고값이 실제와 다를 수 있고, 한 가지 숫자만 본 순서라 몸에 좋은 순서를 뜻하지 않습니다.
        </p>
      </div>
      {rel.length ? (
        <>
          <p className={s.moreSub}>함께 보는 분류</p>
          <ul className={s.moreGrid}>
            {rel.map((o) => (
              <li key={o.slug}>
                <Link href={hubHref(o)} className={s.moreLink}>
                  <FoodTile type={o.tile} size={40} />
                  <span className={s.moreText2}>
                    <b>{o.title}</b>
                    <span>{hubSub(o)}</span>
                  </span>
                  <span className={s.moreGo} aria-hidden>
                    <Icon name="next" size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/c" className={s.moreAll}>
            분류 전체 보기
            <Icon name="next" size={16} />
          </Link>
        </>
      ) : null}
    </div>
  );
}
