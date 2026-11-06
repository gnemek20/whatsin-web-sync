// 첫 화면 휴대폰 속 제품 — 실제 제품을 운영 API 에서 받아 그린다(지어낸 수치를 쓰지 않는다).
// API 가 닿지 않을 때만 아래 스냅숏(2026-11-02 운영 응답에서 그대로 옮김)을 쓴다.
import type { ProductDetail } from './types';

export const SHOWCASE_ID = 'a30fcf73-d635-48e1-ad84-b7a033ff3e6f'; // 초코파이(반)

export const SHOWCASE_SNAPSHOT: ProductDetail = {
  id: SHOWCASE_ID,
  name: '초코파이(반)',
  sub: '빵류',
  brand: '주식회사 아델라7',
  status: 'ready',
  note: '',
  axes: {
    nutrition: { band: 3, label: '영양 균형 조금 아쉬움' },
    glycemic: {
      band: 'amount',
      label: '밥 반 공기',
      carb_g: 39.8,
      carb_rice_bowls: 0.58,
      sugars_g: 14.7,
      sugars_rice_bowls: 0.21,
      basis: 'serving',
      caveats: ['fiber_missing'],
    },
    ingredient: {
      band: 2,
      label: '식품첨가물 확인',
      note: '식품첨가물 1종 — 식품첨가물혼합제제',
      ingredients_total: 12,
      ingredients_matched: 9,
    },
  },
  nutrition: { kcal: 377, sugar: 15, carb: 40, protein: 4, fat: 23, basis_label: '1회분 70 g 기준', basis_g: 70 },
  ingredients: [],
  flagged: [],
};
