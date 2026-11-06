// 불러오는 중 — 서버가 답하기 전에 바로 그려지는 뼈대. 링크를 누른 순간 화면이 바뀌어 반응이 늦게 느껴지지 않는다.
export default function Loading() {
  return (
    <main className="container skel-page" aria-busy="true" aria-label="불러오는 중">
      <div className="skel" style={{ height: 52, borderRadius: 999 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skel-row">
          <div className="skel" style={{ width: 44, height: 44 }} />
          <div style={{ flex: 1, display: "grid", gap: 6 }}>
            <div className="skel" style={{ width: "55%", height: 16 }} />
            <div className="skel" style={{ width: "35%", height: 12 }} />
          </div>
        </div>
      ))}
    </main>
  );
}
