import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';
import { Reveal } from '@/components/site/Reveal';
import { VisitTracker } from '@/components/site/VisitTracker';
import { SiteChrome } from '@/components/site/SiteChrome';
import { FeedbackPrompt } from '@/components/site/FeedbackPrompt';
import { THEME_BOOT } from '@/components/ThemeToggle';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import './globals.css';

// 글꼴 — 눈누가 잇는 원본을 저장소에 넣어 둔다(app/fonts · 외부 CDN 없음). next/font 가 <head> 에서 미리 받게 해(preload)
// 첫 화면부터 이 글꼴로 그려지고 글꼴이 바뀌며 깜빡이지 않는다. display swap — 받기 전·글꼴에 없는 글자(한글 2,350자 밖)는 시스템 글꼴로 그린다.
//   Pretendard 1.3.9(SIL OFL · github.com/orioncactus/pretendard) — KS X 1001 한글 2,350자 부분 글꼴(woff2-subset) 500·600·700
//   BMHANNAPro(배달의민족 한나체 Pro · 앱 assets 원본) — 같은 2,350자 + 영문·문장부호로 줄였다(pyftsubset · 1.0 MB → 254 kB)
const pretendard = localFont({
  src: [
    { path: './fonts/Pretendard-Medium.subset.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Pretendard-SemiBold.subset.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Pretendard-Bold.subset.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'system-ui', 'sans-serif'],
});
const hanna = localFont({
  src: './fonts/BMHANNAPro.subset.woff2',
  weight: '400',
  variable: '--font-hanna',
  display: 'swap',
  preload: true,
  fallback: ['Apple SD Gothic Neo', 'system-ui', 'sans-serif'],
});

const DESCRIPTION =
  '가공식품 원재료와 영양성분을 영양 균형, 성분, 당질 세 가지로 판독합니다. 웹에서도 검색할 수 있습니다.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.whatsin.kr'),
  title: { default: "What's In? 와츠인 — 가공식품 라벨 판독", template: "%s | What's In?" },
  description: DESCRIPTION,
  // 파비콘 = 앱 시작 화면 아이콘(둥근 모서리·투명 바탕 · app/assets/splash-icon.png). 홈 화면용 apple 아이콘은 iOS 가 모서리를 깎으니 네모 그대로.
  icons: { icon: [{ url: '/icon-64.png', sizes: '64x64' }, { url: '/icon-192.png', sizes: '192x192' }], apple: '/apple-icon-180.png' },
  openGraph: {
    title: "What's In? 와츠인",
    description: DESCRIPTION,
    type: 'website',
    locale: 'ko_KR',
  },
  other: { 'apple-itunes-app': 'app-id=6794344998' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#2c2d30' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning — THEME_BOOT 가 그리기 전에 data-theme 를 붙여 서버 HTML 과 속성이 달라진다(의도한 차이)
    <html lang="ko" className={`${pretendard.variable} ${hanna.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SiteChrome>
          <Nav />
        </SiteChrome>
        {children}
        <SiteChrome>
          <Footer />
          <Suspense fallback={null}>
            <VisitTracker />
            <FeedbackPrompt />
          </Suspense>
        </SiteChrome>
        <Reveal />
      </body>
    </html>
  );
}
