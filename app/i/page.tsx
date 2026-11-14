// 성분 사전 — 2026-11-13 웹 개편 · 2026-11-14 새 디자인(애시 바탕 · 큰 제목 · 큰 검색 알약 · 묶음 카드). 이름으로 찾고, 자주 묻는 성분 묶음을 바로 연다.
import type { Metadata } from 'next';
import { DictSearch } from '@/components/dict/DictSearch';
import { PageHero, PageSheet } from '@/components/shell/PageHero';

export const metadata: Metadata = { title: '성분 사전', description: '원재료와 식품첨가물이 무엇인지, 공인 기관이 어떻게 평가하는지 찾아봅니다.' };

// 자주 묻는 성분 — 커뮤니티 조사에서 이름이 많이 나온 것(pmf-research 02_수요조사). 사전 키 = 이름.
const GROUPS: { title: string; items: string[] }[] = [
  { title: '대체당', items: ['말티톨', '에리스리톨', '알룰로오스', '수크랄로스', '스테비올배당체', '아세설팜칼륨', '아스파탐', '자일리톨', '소르비톨'] },
  { title: '당류', items: ['설탕', '액상과당', '물엿', '올리고당', '포도당'] },
  { title: '자주 보는 첨가물', items: ['L-글루타민산나트륨', '아질산나트륨', '카라기난', '구아검', '산도조절제', '유화제'] },
  { title: '기름', items: ['팜유', '쇼트닝', '경화유', '카놀라유'] },
];

export default function DictPage() {
  return (
    <main>
      <PageHero narrow tone="tint" eyebrow="성분 사전" title="이 성분, 뭐예요?" sub="원재료와 식품첨가물이 무엇인지, 먹으면 어떤지, 공인 기관이 어떻게 평가하는지 찾아봅니다." />
      <PageSheet narrow>
        <DictSearch groups={GROUPS} />
      </PageSheet>
    </main>
  );
}
