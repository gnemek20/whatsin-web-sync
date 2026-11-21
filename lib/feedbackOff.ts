// 의견 창을 「이번 접속」 동안 끄는 표시(2026-11-18 사용자 「제출 여부와 상관없이 브라우저를 나갔다 들어오면 다시」).
//   X · 「이번 접속 중 보지 않기」 · 보내기 셋 다 같은 기준 — 만료 없는 쿠키(세션 쿠키)에 적는다.
//   새로고침 · 새 탭 · 다른 화면에서는 안 뜨고, 브라우저를 완전히 닫았다 열면 쿠키가 사라져 다시 뜬다.
//   버린 것: 모듈 메모리(새로고침하면 다시 떠서 「접속」보다 짧다) · sessionStorage(탭마다 따로라 새 탭에서 다시 뜬다) ·
//   localStorage 30일(보낸 사람에게 다시 묻지 않았다 — 이번에 사용자가 접속마다로 바꿨다).
//   한계: 브라우저의 「이전 세션 복원」을 켜 두면 세션 쿠키도 살아남아 그만큼 늦게 다시 뜬다.
const KEY = 'wi_fb_off';

export function feedbackOff(): boolean {
  try {
    return document.cookie.split('; ').some((c) => c === `${KEY}=1`);
  } catch {
    return false;
  }
}

export function setFeedbackOff() {
  try {
    document.cookie = `${KEY}=1; path=/; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
    localStorage.removeItem('wi_fb_done'); // 예전 30일 표시는 더 쓰지 않는다
  } catch {}
}
