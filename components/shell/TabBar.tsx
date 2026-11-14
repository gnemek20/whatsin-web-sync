'use client';
// 모바일 아래 탭 막대 — 나중에 이 반응형 모바일 화면을 앱에 옮긴다(사용자 2026-11-13).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { TABS, isActive } from './tabs';
import s from './shell.module.css';

export function TabBar() {
  const path = usePathname() ?? '/';
  return (
    <>
    {/* 떠 있는 탭 캡슐 자리 — 본문 끝이 캡슐에 가리지 않게(모바일만 높이가 있다) */}
    <div className={s.tabSpacer} aria-hidden />
    <nav className={`ui ${s.tabbar}`} aria-label="주 메뉴">
      {TABS.map((t) => {
        const on = isActive(path, t);
        return (
          <Link key={t.href} href={t.href} className={s.tab} aria-current={on ? 'page' : undefined}>
            <Icon name={t.icon} size={22} strokeWidth={on ? 2 : 1.6} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
