// 같은 종류와 견주면 — 세 축 카드 바로 아래 보조 카드(앱 components/PeerCard 와 같은 구성).
// 2026-11-05 사용자 「이보다 좋은 게 뭐 있어요 같은 느낌 · 비슷한 식품 중 N등 · 세 축 기반 한줄 평」 — 위는 「비슷한 콜라 80개 중 3등」 +
// 한줄 평, 아래는 축마다 같은 종류 안 위치를 말로(「좋은 편」 · 「주의 성분 많은 편」 — 비율은 걷었다). 순위는 셋 다 같거나 낫고 하나 이상 나은 제품 수 + 1 이다(세 축을 합치지 않는다 · 정의를 같이 적는다).
// 견줄 묶음이 없어도 이 제품 칸으로 한줄 평을 낸다(summary.scope=self). 판정색은 1등 · 「가장 좋음」에만.
import { getPeers } from '@/lib/api';
import { AXIS_NAME } from '@/lib/axes';
import { PEER_WEB, peerAsOf, peerAxisText, peerRank, peerSelfNote, peerSilentText, peerSummaryText, peerTitle } from '@/lib/content/peers';
import { fill } from '@/lib/content/text';
import { Icon } from '@/components/Icon';
import { Rich } from '@/components/Rich';
import styles from './peer.module.css';

const AXIS_ICON = { nutrition: 'apple', glycemic: 'bowl', ingredient: 'flask' } as const;
// 영양 → 성분 → 당질 — 세 축 카드·목록과 같은 순서(앱과 같게).
const ORDER = { nutrition: 0, ingredient: 1, glycemic: 2 } as const;

// 문구는 lib/content/peers(guide/peers.json) — 축 한 줄은 better · better_per100 숫자로, 견주지 못한 이유는 reason_code 로 만든다.
export async function PeerCard({ id }: { id: string }) {
  const r = await getPeers(id);
  if (!r.ok) return null; // 실패하면 카드를 숨긴다
  const peer = r.data;
  const line = peerSummaryText(peer.summary);
  if (peer.status === 'silent') {
    const why = peerSilentText(peer);
    if (!line) return why ? <p className={`t-caption c-t3 ${styles.silent}`}><Rich text={why} /></p> : null;
    // 견줄 묶음이 없다 — 이 제품 칸만으로 만든 한줄 평 + 왜 순위가 없는지(연하게)
    return (
      <article className={`card ${styles.card}`} aria-label="한줄 평">
        <p className={`t-body ${styles.line}`}>{line}</p>
        <p className="t-caption c-t3">{peerSelfNote()}</p>
      </article>
    );
  }
  const group = peer.group ?? PEER_WEB.group_default;
  const rank = peerRank(peer);
  const n = peer.n > 0 ? peer.n : Math.max(0, ...peer.axes.map((a) => a.n ?? 0)); // 전체 비교가 안 되면 서버 n 은 0
  const asOf = peerAsOf(peer.as_of);
  return (
    <article className={`card ${styles.card}`} aria-label={peerTitle(peer.group) ?? undefined}>
      <div className={styles.head}>
        <p className="t-caption c-t3">{rank ? rank.head : n > 0 ? fill(PEER_WEB.of, { group, n }) : PEER_WEB.by_axis}</p>
        {rank ? (
          <div className={styles.rankRow}>
            <h2 className={`t-title ${peer.rank === 1 ? styles.best : ''}`}>{rank.value}</h2>
            {rank.top ? <span className={`t-micro ${styles.top}`}>{rank.top}</span> : null}
          </div>
        ) : null}
        {line ? <p className={`t-body ${styles.line}`}>{line}</p> : null}
        {rank ? <p className="t-caption c-t3">{rank.note}</p> : null}
      </div>
      <ul className={styles.axes}>
        {[...peer.axes].sort((x, y) => ORDER[x.key] - ORDER[y.key]).map((a) => {
          const v = peerAxisText(a);
          return (
            <li key={a.key} title={v.why ?? undefined}>
              <span className={styles.icon}><Icon name={AXIS_ICON[a.key]} size={16} /></span>
              <span className="t-body c-t2">{AXIS_NAME[a.key]}</span>
              <span className={`t-strong ${v.best ? styles.best : a.status === 'ok' ? '' : 'c-t3'}`}>{v.text}</span>
            </li>
          );
        })}
      </ul>
      {asOf ? <p className="t-micro c-t3">{asOf}</p> : null}
    </article>
  );
}

// 불러오는 동안 같은 크기 자리 — 처음 한 번은 서버가 수 초 걸릴 수 있다.
export function PeerCardSkeleton() {
  return (
    <div className={`card ${styles.card}`} aria-label="같은 종류 비교 중">
      {['35%', '70%', '100%', '100%', '100%'].map((w, i) => <span key={i} className={styles.sk} style={{ width: w }} />)}
    </div>
  );
}
