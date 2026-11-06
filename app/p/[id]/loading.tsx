// 불러오는 중 — 서버가 답하기 전에 바로 그려지는 뼈대. 링크를 누른 순간 화면이 바뀌어 반응이 늦게 느껴지지 않는다.
export default function Loading() {
  return (
    <main className="container skel-page" aria-busy="true" aria-label="불러오는 중">
      <div className="skel-row">
        <div className="skel" style={{ width: 88, height: 88, borderRadius: 20 }} />
        <div style={{ flex: 1, display: "grid", gap: 8 }}>
          <div className="skel" style={{ width: "30%", height: 14 }} />
          <div className="skel" style={{ width: "70%", height: 26 }} />
        </div>
      </div>
      <div className="skel" style={{ height: 280, borderRadius: 20 }} />
      <div className="skel" style={{ height: 160, borderRadius: 20 }} />
    </main>
  );
}
