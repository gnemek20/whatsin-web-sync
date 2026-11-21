// 보는 법(2026-11-16) — 예전 첫 화면의 소개 흐름을 그대로 옮겼다: 한 줄 + 실제 제품 판독 휴대폰 → 세 축 → 둘러보기 → 읽는 법 → 앱 받기.
// 첫 화면은 바로 쓰는 검색(app/page.tsx · Landing)이고, 처음 온 사람은 「처음이신가요?」로 여기에 온다.
import type { Metadata } from 'next';
import { getAlternatives, getCollections, getIngredientOfDay, getProduct } from '@/lib/api';
import { SHOWCASE_ID, SHOWCASE_SNAPSHOT } from '@/lib/showcase';
import { Hero } from '@/components/home/Hero';
import { AxesSection, DownloadSection, ExploreSection, HowSection } from '@/components/home/Sections';

export const revalidate = 3600;
export const metadata: Metadata = { title: '보는 법' };

export default async function Guide() {
  const [prod, alts, colls, today] = await Promise.all([
    getProduct(SHOWCASE_ID),
    getAlternatives(SHOWCASE_ID),
    getCollections(),
    getIngredientOfDay(),
  ]);
  const p = prod.ok ? prod.data : SHOWCASE_SNAPSHOT;
  const alt = alts.ok ? alts.data.find((a) => a.kind === 'better') ?? alts.data[0] ?? null : null;

  return (
    <main>
      <Hero p={p} alt={alt} guide />
      <AxesSection p={p} />
      <ExploreSection collections={colls.ok ? colls.data : []} today={today.ok ? today.data : null} />
      <HowSection />
      <DownloadSection />
    </main>
  );
}
