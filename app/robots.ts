// robots.txt(2026-11-18) — 제품 상세 · 성분 사전 · 안내는 열고, 검색 결과(?q=) · 비교(?vs=) · 유입 링크(/r/) · 개인 화면은 막는다.
// 검색 결과 쪽은 질의마다 끝없이 생기는 얇은 페이지라 상세 페이지가 받을 수집 몫을 먹는다.
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/r/', '/collect', '/history', '/community/write', '/*?q=', '/*&q=', '/*?c=', '/*?vs=', '/*?ref=', '/*?utm_'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
