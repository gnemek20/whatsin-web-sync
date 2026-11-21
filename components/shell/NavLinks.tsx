'use client';
// 머리 메뉴(PC) — 검색 · 커뮤니티 · 성분 사전. 지금 화면이면 떠오른 면(2026-11-14).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../Icon';
import { TABS, isActive } from './tabs';
import s from './shell.module.css';

export function NavLinks({ className }: { className?: string }) {
  const path = usePathname() ?? '';
  return (
    <>
      {TABS.map((t) => {
        const on = isActive(path, t);
        return (
          <Link key={t.href} href={t.href} className={`${className ?? ''} ${on ? s.navOn : ''}`} aria-current={on ? 'page' : undefined} title={t.label}>
            <Icon name={t.icon} size={18} />
            <span className="navText">{t.label}</span>
          </Link>
        );
      })}
    </>
  );
}
