// 불러오는 중 — 서버가 답하기 전에 바로 그려지는 뼈대. 링크를 누른 순간 화면이 바뀌어 반응이 늦게 느껴지지 않는다.
// 2026-11-14 — 상세와 같은 짜임: 맨 위 제품 카드(~31%) | 내 기준 판, 그 아래 섹션(원재료 | 영양성분). 반복 애니메이션 없음.
import s from './loading.module.css';

export default function Loading() {
  return (
    <main className={s.page} aria-busy="true" aria-label="불러오는 중">
      <div className={`container ${s.bar}`}>
        <div className="skel" style={{ width: 96, height: 40, borderRadius: 999 }} />
        <div className="skel" style={{ width: 88, height: 40, borderRadius: 999 }} />
      </div>
      <div className={`container ${s.wrap}`}>
        <div className={s.top}>
          <div className={s.card}>
            <div className={`skel ${s.media}`} />
            <div className={s.lines}>
              <div className="skel" style={{ width: '40%', height: 14, borderRadius: 6 }} />
              <div className="skel" style={{ width: '85%', height: 28, borderRadius: 8 }} />
            </div>
            <div className={s.facts}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="skel" style={{ height: 14, borderRadius: 6 }} />
              ))}
            </div>
            <div className={`skel ${s.btn}`} />
          </div>
          <div className={`skel ${s.answer}`} />
        </div>
        <div className={s.section}>
          <div className="skel" style={{ width: 220, height: 30, borderRadius: 8 }} />
          <div className={s.pair}>
            <div className="skel" />
            <div className="skel" />
          </div>
        </div>
      </div>
    </main>
  );
}
