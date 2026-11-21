// 사이트맵 색인(2026-11-18) — 정적 페이지 하나 + 제품 묶음(4만 개씩 · API /products/sitemap-ids 의 parts).
import { API_BASE } from '@/lib/config';
import { SITE_URL, SITEMAP_PRODUCTS_PER_FILE } from '@/lib/seo';

export const revalidate = 3600;

export async function GET() {
  let parts = 0;
  try {
    const r = await fetch(`${API_BASE}/products/sitemap-ids?part=0&size=1`, { next: { revalidate: 3600 } });
    if (r.ok) parts = Math.ceil(((await r.json()).total ?? 0) / SITEMAP_PRODUCTS_PER_FILE);
  } catch {
    /* 정적 묶음만 */
  }
  const now = new Date().toISOString();
  const files = ['static', ...Array.from({ length: parts }, (_, i) => `products-${i}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((f) => `  <sitemap><loc>${SITE_URL}/sitemaps/${f}.xml</loc><lastmod>${now}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
