// 사이트 머리(2026-11-14 개편) — 붙어 따라오는 반투명 바. flex 한 줄.
//   PC(1024~)   로고 | 메뉴(검색 · 커뮤니티 · 성분 사전) | 검색창(늘어남) | 테마 · 내 기준 · 앱 받기
//   태블릿      로고 | 검색창 | 테마(한 칸) · 내 기준 · 앱 받기 — 메뉴는 아이콘만
//   모바일      로고 | 테마(한 칸) · 내 기준 / 검색창(둘째 줄) — 메뉴는 아래 탭 막대(shell/TabBar)
import Link from 'next/link';
import { Suspense } from 'react';
import { StoreLink } from '../StoreLink';
import { ThemeToggle } from '../ThemeToggle';
import { HeaderSearch } from './HeaderSearch';
import { NavLinks } from '../shell/NavLinks';
import { LensButton } from '../shell/LensButton';
import { LogoMark } from './Logo';
import styles from './Nav.module.css';

export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <LogoMark size={30} />
      <span className={styles.wordText}>
        What&apos;s In?<span className="visually-hidden"> 와츠인</span>
      </span>
    </span>
  );
}

export function Nav() {
  return (
    <header className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <Link href="/search" className={styles.brand} aria-label="What's In? 처음">
          <Wordmark />
        </Link>
        <nav className={styles.menu} aria-label="주요 메뉴">
          <NavLinks className={styles.link} />
        </nav>
        <Suspense fallback={<div className={styles.search} />}>
          <HeaderSearch />
        </Suspense>
        <div className={styles.actions}>
          <ThemeToggle className={styles.themeSeg} />
          <ThemeToggle compact className={styles.themeOne} />
          <LensButton />
          <StoreLink className={styles.cta}>앱 받기</StoreLink>
        </div>
      </div>
    </header>
  );
}
