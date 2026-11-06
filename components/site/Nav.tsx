// 사이트 머리 — 화면 위에 붙어 따라온다(sticky). PC 한 줄(로고 | 검색창 | 테마 · 검색 · 읽는 법 · 앱 받기), 모바일 두 줄(로고 · 테마 · 검색 · 앱 받기 / 검색창).
// 메뉴 순서는 테마가 맨 앞(2026-11-03 사용자) — 테마를 넣으며 빠졌던 「검색」 링크를 되살렸다.
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '../Icon';
import { StoreLink } from '../StoreLink';
import { ThemeToggle } from '../ThemeToggle';
import { HeaderSearch } from './HeaderSearch';
import styles from './Nav.module.css';

export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      What&apos;s In?<span className="visually-hidden"> 와츠인</span>
    </span>
  );
}

export function Nav() {
  return (
    <header className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <Link href="/search" className={styles.brand} aria-label="What's In? 검색 처음">
          <Wordmark />
        </Link>
        <Suspense fallback={<div className={styles.search} />}>
          <HeaderSearch />
        </Suspense>
        <nav className={styles.links} aria-label="주요 메뉴">
          <ThemeToggle />
          <Link href="/search" className={styles.link}>
            <Icon name="search" size={20} />
            <span className={styles.linkText}>검색</span>
          </Link>
          <Link href="/#how" className={`${styles.link} ${styles.wide}`}>
            읽는 법
          </Link>
          <StoreLink className={styles.cta}>앱 받기</StoreLink>
        </nav>
      </div>
    </header>
  );
}
