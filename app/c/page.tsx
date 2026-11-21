// 분류 허브 목록(2026-11-18 · 로컬 시험) — 첫 화면 「조건으로 찾기」의 「전체 보기」 · 하단 「분류별 비교」가 여기로 온다.
// 기준별(당류 낮은 · 순탄수화물 낮은 · 단백질 많은 · 나트륨 적은 · 열량 낮은 · 지방 적은)로 묶고, 칸은 첫 화면 조건 카드와 같은 모양.
import type { Metadata } from 'next';
import { HUBS, hubHref, hubSub } from '@/lib/hubs';
import { AskLink } from '@/components/home/Picks';
import { DockSearch } from '@/components/shell/DockSearch';
import ls from '@/components/home/landing.module.css';
import s from './hub.module.css';

export const metadata: Metadata = {
  title: '조건으로 찾기',
  description: '아이스크림, 요거트, 과자, 빵, 라면 같은 가공식품을 당류, 순탄수화물, 단백질, 나트륨, 열량 기준으로 줄 세운 목록입니다.',
  alternates: { canonical: '/c' },
};

export default function HubIndex() {
  const groups = [...new Set(HUBS.map((x) => x.group))];
  return (
    <main className={`container ${s.main}`}>
      <header className={s.head}>
        <h1 className={s.title}>조건으로 찾기</h1>
        <p className={s.lead}>찾는 식품과 기준을 고르면, 식약처 신고 라벨의 100g(mL)당 값으로 줄 세운 제품을 보여 드립니다.</p>
      </header>
      {groups.map((g) => (
        <section key={g} className={s.group} aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className={s.groupHead}>{g}</h2>
          <ul className={`${ls.asks} ${s.asks}`}>
            {HUBS.filter((x) => x.group === g).map((x) => (
              <li key={x.slug}>
                <AskLink href={hubHref(x)} type={x.tile} sub={hubSub(x)}>
                  {x.q}
                </AskLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <DockSearch autoHide />
    </main>
  );
}
