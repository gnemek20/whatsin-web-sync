/** @type {import('next').NextConfig} */
const nextConfig = {
  // iwinv VPS 의 Docker 이미지가 쓰는 최소 실행 묶음(.next/standalone). Vercel 배포에는 영향이 없다.
  output: "standalone",
  reactStrictMode: true,
  // 검색은 홈에서 한다(2026-11-16) — 공유된 옛 /search?q= 링크는 쿼리를 그대로 들고 홈으로 간다(쿼리는 Next 가 자동으로 넘긴다).
  async redirects() {
    return [{ source: '/search', destination: '/', permanent: false }];
  },
};

export default nextConfig;
