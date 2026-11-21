// 쿠팡에서 보기(2026-11-18 사용자 「쿠팡 파트너스 링크가 있으면 바로 구매할 수 있게 · 다른 제품과 비교 아래」).
//   규칙은 docs/product/프론트_핸드오프_쿠팡링크_2026-11-15.md:
//   - 값이 없으면 버튼 · 자리 · 안내 모두 그리지 않는다(쿠팡 검색 주소를 대신 만들지 않는다).
//   - 링크 문자열을 고치지 않고 새 탭으로 연다(파트너스 추적 코드) · rel 에 sponsored.
//   - 리퍼러를 지우지 않는다(2026-11-18 사용자 「쿠팡 링크가 가끔 접근 권한 없음」). 처음엔 noreferrer 로 열어 쿠팡이 출처 없는
//     새 방문(쿠키 · 리퍼러 둘 다 없음)으로 받았다 — 봇 차단(Access Denied)에 걸리기 쉬운 모양이고, 파트너스 이동 기록(wRef)도 비었다.
//     noopener 만 남겨(새 탭이 우리 창을 못 건드리게) 출처 도메인만 보낸다(strict-origin-when-cross-origin · 경로 · 검색어는 안 나간다).
//     쿠팡 쪽 차단 규칙은 공개돼 있지 않아 원인을 확정하지 못했다(미확인 · 헤드리스로는 늘 막혀 재현 불가).
//   - 이름은 「쿠팡에서 보기」 — 「구매하기」 · 최저가 · 가격 · 용량은 쓰지 않는다(쿠팡 상품은 묶음 · 개수가 다를 수 있고 약 4 %는 용량이 다르다).
//   - 대가성 문구를 버튼 바로 아래 한 줄로(공정위 추천 · 보증 심사지침 · 쿠팡 파트너스 정책 — 공식 문구 원문은 미확인).
//   누름은 행동 기록 coupang_click(data-ev · 제품 id).
import { Icon } from '../Icon';
import s from './coupang.module.css';

export function CoupangLink({ url, pid }: { url?: string | null; pid: string }) {
  if (!url) return null;
  return (
    <div className={s.wrap}>
      <a href={url} target="_blank" rel="noopener sponsored nofollow" referrerPolicy="strict-origin-when-cross-origin" className={`btn btn-ink btn-block ${s.btn}`} data-ev="coupang_click" data-pid={pid}>
        쿠팡에서 보기
        <Icon name="next" size={16} />
      </a>
      <p className={s.note}>쿠팡 파트너스 활동으로 일정액의 수수료를 받을 수 있습니다.</p>
    </div>
  );
}
