// 사이트 머리(2026-11-16 다시 — 사용자 「헤더가 여전히 마음에 안 들어」) — 붙어 따라오는 바. flex 한 줄.
//   덜어 냈다: 메뉴 아이콘 · 메뉴 알약 배경 · 테마 세 칸 · 「내 기준」의 값 · 색 배경. 채운 것은 「앱 받기」 하나뿐.
//   맨 위에서는 바탕과 이어지고(선 · 흐림 없음) 내려가면 선과 흐림이 붙는다(NavScroll).
//   PC     로고 | 메뉴(글자) | 검색창(늘어남) | 테마(한 칸) · 내 기준 · 앱 받기
//   모바일  로고 | 테마 · 내 기준 / 검색창(둘째 줄) — 메뉴 · 앱 받기는 아래 탭 막대(shell/TabBar)
import Link from 'next/link';
import { Suspense } from 'react';
import { StoreLink } from '../StoreLink';
import { ThemeToggle } from '../ThemeToggle';
import { HeaderSearch } from './HeaderSearch';
import { NavLinks } from '../shell/NavLinks';
import { LensButton } from '../shell/LensButton';
import { LogoMark } from './Logo';
import { NavScroll } from './NavScroll';
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
      <NavScroll />
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="What's In? 처음">
          <Wordmark />
        </Link>
        <nav className={styles.menu} aria-label="주요 메뉴">
          <NavLinks className={styles.link} />
        </nav>
        <Suspense fallback={<div className={styles.search} />}>
          <HeaderSearch />
        </Suspense>
        <div className={styles.actions}>
          <ThemeToggle compact className={styles.theme} />
          <LensButton />
          <StoreLink className={styles.cta}>앱 받기</StoreLink>
        </div>
      </div>
    </header>
  );
}
