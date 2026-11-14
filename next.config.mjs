/** @type {import('next').NextConfig} */
const nextConfig = {
  // iwinv VPS 의 Docker 이미지가 쓰는 최소 실행 묶음(.next/standalone). Vercel 배포에는 영향이 없다.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
