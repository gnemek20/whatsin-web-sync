// 불러오는 중 — 서버가 답하기 전에 바로 그려지는 뼈대. 링크를 누른 순간 화면이 바뀌어 반응이 늦게 느껴지지 않는다.
export default function Loading() {
  return (
    <main className="container skel-page" aria-busy="true" aria-label="불러오는 중">
      <div className="skel" style={{ width: "40%", height: 30 }} />
      <div className="skel" style={{ height: 120, borderRadius: 20 }} />
      <div className="skel" style={{ height: 200, borderRadius: 20 }} />
    </main>
  );
}
