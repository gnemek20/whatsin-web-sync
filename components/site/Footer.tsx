// 바닥글(2026-11-14 개편) — 왼쪽 로고 · 한 줄 소개, 오른쪽 메뉴 묶음, 맨 아래 출처 · 저작권. 전부 flex.
import Link from 'next/link';
import { Wordmark } from './Nav';
import { PLAY_LIVE, PRIVACY_URL, TERMS_URL } from '@/lib/site';
import { StoreLink } from '../StoreLink';
import styles from './Footer.module.css';
import { Rich } from '@/components/Rich';

export function Footer() {
  return (
    <footer className={styles.foot}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Wordmark />
            <p className="t-body c-t2">내가 피하는 성분이 들었는지, 얼마나 들었는지부터. 가공식품 라벨을 내 기준으로 읽습니다.</p>
          </div>
          <nav className={styles.cols} aria-label="바닥글">
            <div className={styles.col}>
              <span className={styles.colHead}>서비스</span>
              <Link href="/search" className={styles.link}>검색</Link>
              <Link href="/community" className={styles.link}>커뮤니티</Link>
              <Link href="/i" className={styles.link}>성분 사전</Link>
              <Link href="/#how" className={styles.link}>읽는 법</Link>
            </div>
            <div className={styles.col}>
              <span className={styles.colHead}>앱</span>
              <StoreLink store="ios" className={styles.link}>iOS 앱</StoreLink>
              {PLAY_LIVE ? <StoreLink store="android" className={styles.link}>Android 앱</StoreLink> : null}
            </div>
            <div className={styles.col}>
              <span className={styles.colHead}>약관</span>
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>이용약관</a>
              <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>개인정보처리방침</a>
            </div>
          </nav>
        </div>
        <div className={styles.legal}>
          <p className="t-caption c-t3">
            <Rich text={'출처는 식약처 공공데이터와 제조사 신고입니다. 의학적 진단이나 처방이 아닙니다.'} />
          </p>
          <p className="t-caption c-t3">© 2026 What&apos;s In?</p>
        </div>
      </div>
    </footer>
  );
}
