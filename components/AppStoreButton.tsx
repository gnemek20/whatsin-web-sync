// App Store 버튼 — 잉크 면 + 애플 로고 + 두 줄. 외부 이미지 없이 그린다.
import { AppleMark } from './Icon';
import { StoreLink } from './StoreLink';
import styles from './AppStoreButton.module.css';

export function AppStoreButton({ tone = 'ink' }: { tone?: 'ink' | 'paper' }) {
  return (
    <StoreLink store="ios" className={`${styles.btn} ${tone === 'paper' ? styles.paper : ''}`} ariaLabel="App Store에서 What's In? 받기">
      <AppleMark size={24} />
      <span className={styles.text}>
        <span className="t-micro">App Store에서</span>
        <span className="t-strong">앱 받기</span>
      </span>
    </StoreLink>
  );
}
