// 불러오는 중 — 서버가 답하기 전에 바로 그려지는 뼈대. 링크를 누른 순간 화면이 바뀌어 반응이 늦게 느껴지지 않는다.
// 2026-11-14 — 성분 상세와 같은 짜임(맨 위 성분 카드 | 한눈에 보기 → 든 제품 카드). 반복 애니메이션 없음.
import styles from './page.module.css';

const bar = (w: string | number, h: number, r?: number) => (
  <div className="skel" style={{ width: w, height: h, borderRadius: r }} />
);

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="불러오는 중">
      <div className="container" style={{ display: 'flex', alignItems: 'center', minHeight: 64 }}>
        {bar(96, 40, 999)}
      </div>
      <div className={`container ${styles.wrap}`}>
        <div className={styles.top}>
          <div className={styles.idCard} style={{ minHeight: 380 }}>
            <div className={styles.kind}>
              {bar(56, 56, 16)}
              {bar(120, 26, 999)}
            </div>
            <div className={styles.idText}>
              {bar('60%', 44, 12)}
              {bar('45%', 22, 8)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bar('90%', 16, 6)}
              {bar('75%', 16, 6)}
            </div>
            <div className={styles.actions}>{bar(240, 54, 999)}</div>
          </div>
          <div className={styles.facts} style={{ minHeight: 380, gap: 20, paddingBottom: 28 }}>
            {bar(110, 20, 8)}
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 20 }}>
                {bar(64, 16, 6)}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bar('50%', 18, 6)}
                  {bar('85%', 16, 6)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {bar(200, 30, 8)}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel" style={{ flex: '1 1 320px', height: 112, borderRadius: 24 }} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
