// 불러오는 중 — 서버가 답하기 전에 바로 그려지는 뼈대. 링크를 누른 순간 화면이 바뀌어 반응이 늦게 느껴지지 않는다.
// 2026-11-14 — 검색 첫 면과 같은 짜임(큰 제목 · 큰 검색 알약 · 예시 알약 | 세 단계 카드 → 제품 카드). 반복 애니메이션 없음.
import s from './loading.module.css';

export default function Loading() {
  return (
    <main className={s.page} aria-busy="true" aria-label="불러오는 중">
      <section className={s.hero}>
        <div className={`container ${s.heroInner}`}>
          <div className={s.heroMain}>
            <div className="skel" style={{ width: 180, height: 18, borderRadius: 6 }} />
            <div className={s.title}>
              <div className={`skel ${s.titleLine}`} style={{ width: '62%' }} />
              <div className={`skel ${s.titleLine}`} style={{ width: '44%' }} />
            </div>
            <div className="skel" style={{ width: '80%', height: 18, borderRadius: 6 }} />
            <div className={`skel ${s.pill}`} />
            <div className={s.examples}>
              {[132, 168, 116, 150].map((w) => (
                <div key={w} className={`skel ${s.example}`} style={{ width: w }} />
              ))}
            </div>
          </div>
          <div className={`skel ${s.how}`} />
        </div>
      </section>
      <div className={`container ${s.below}`}>
        <div className="skel" style={{ width: 200, height: 30, borderRadius: 8 }} />
        <div className={s.grid}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel" />
          ))}
        </div>
      </div>
    </main>
  );
}
