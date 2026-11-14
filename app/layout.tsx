import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';
import { Reveal } from '@/components/site/Reveal';
import { VisitTracker } from '@/components/site/VisitTracker';
import { SiteChrome } from '@/components/site/SiteChrome';
import { FeedbackPrompt } from '@/components/site/FeedbackPrompt';
import { THEME_BOOT } from '@/components/ThemeToggle';
import { LensProvider } from '@/components/lens/LensProvider';
import { TabBar } from '@/components/shell/TabBar';
import { readLens } from '@/lib/lens.server';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import './globals.css';

// 글꼴(2026-11-14 개편) — 저장소 안 파일(app/fonts)을 next/font 가 미리 받는다(외부 CDN 없음 · 첫 화면부터 이 글꼴).
//   Geist(SIL OFL · Vercel) — 숫자 · 영문. 숫자가 크고 또렷해 「얼마나」를 한눈에 읽는다(가변 글꼴 하나 57 kB).
//   Pretendard 1.3.9(SIL OFL) — 한글 KS X 1001 2,350자 부분 글꼴 400·500·600·700. 글꼴 쌓기 순서가 Geist → Pretendard 라 한글은 Pretendard 로 그린다.
//   한나체는 걷었다(브랜드 개편 · 사용자 2026-11-14 「폰트와 색은 완전히 바꿔도 된다」).
const geist = localFont({
  src: './fonts/Geist-Variable.woff2',
  weight: '100 900',
  variable: '--font-geist',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});
const pretendard = localFont({
  src: [
    { path: './fonts/Pretendard-Regular.subset.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Pretendard-Medium.subset.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Pretendard-SemiBold.subset.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Pretendard-Bold.subset.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'system-ui', 'sans-serif'],
});

const DESCRIPTION =
  '제품 이름을 넣으면 내가 피하는 성분이 들었는지, 당질과 열량이 얼마인지부터 보여 드립니다. 영양 균형, 성분, 당질 세 가지 판독도 함께 봅니다.';

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
    { media: '(prefers-color-scheme: light)', color: '#f4f4f2' },
    { media: '(prefers-color-scheme: dark)', color: '#181818' },
  ],
};

// 2026-11-13 — 내 기준(쿠키 wi_lens)을 여기서 읽어 브라우저와 같은 값으로 그린다. 없으면 온보딩 창이 닫기 없이 뜬다(LensProvider).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lens = readLens();
  return (
    // suppressHydrationWarning — THEME_BOOT 가 그리기 전에 data-theme 를 붙여 서버 HTML 과 속성이 달라진다(의도한 차이)
    <html lang="ko" className={`${geist.variable} ${pretendard.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <LensProvider initial={lens}>
          <SiteChrome>
            <Nav />
          </SiteChrome>
          {children}
          <SiteChrome>
            <Footer />
            <TabBar />
            <Suspense fallback={null}>
              <VisitTracker />
              <FeedbackPrompt />
            </Suspense>
          </SiteChrome>
        </LensProvider>
        <Reveal />
      </body>
    </html>
  );
}
