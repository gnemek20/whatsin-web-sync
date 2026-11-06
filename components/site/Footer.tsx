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
        <div className={styles.brand}>
          <Wordmark />
          <p className="t-caption c-t2">가공식품 라벨을 세 가지로</p>
        </div>
        <nav className={styles.cols} aria-label="바닥글">
          <div className={styles.col}>
            <span className="t-micro c-t3">서비스</span>
            <Link href="/search" className="t-body">검색</Link>
            <Link href="/#how" className="t-body">읽는 법</Link>
            <StoreLink store="ios" className="t-body">iOS 앱</StoreLink>
            {PLAY_LIVE ? <StoreLink store="android" className="t-body">Android 앱</StoreLink> : null}
          </div>
          <div className={styles.col}>
            <span className="t-micro c-t3">약관</span>
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="t-body">이용약관</a>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="t-body">개인정보처리방침</a>
          </div>
        </nav>
      </div>
      <div className="container">
        <div className={styles.legal}>
        <p className="t-caption c-t3">
          <Rich text={'출처는 식약처 공공데이터와 제조사 신고입니다.\n의학적 진단이나 처방이 아닙니다.'} />
        </p>
        <p className="t-caption c-t3">© 2026 What&apos;s In?</p>
        </div>
      </div>
    </footer>
  );
}
