'use client';
// 앱 받기 링크 — 누르면 웹→앱 전환 기록(lib/visit.ts trackAppClick)을 남기고 스토어로 간다.
// Android 는 Play 링크에 설치 리퍼러(utm · 웹 기기 키 wid)를 실어 앱 첫 실행과 정확히 잇는다(PLAY_LIVE 일 때만 — 등록 전엔 App Store 로).
import { useEffect, useState } from 'react';
import { APP_STORE_URL, PLAY_LIVE, playStoreUrl } from '@/lib/site';
import { deviceKey, isAndroid, source, trackAppClick } from '@/lib/visit';

export function StoreLink({ store, className, children, ariaLabel }: {
  store?: 'ios' | 'android'; className?: string; children: React.ReactNode; ariaLabel?: string;
}) {
  const [android, setAndroid] = useState(store === 'android');
  const [href, setHref] = useState(store === 'android' ? playStoreUrl() : APP_STORE_URL);
  useEffect(() => {
    const a = store ? store === 'android' : PLAY_LIVE && isAndroid();
    setAndroid(a);
    if (!a) return setHref(APP_STORE_URL);
    deviceKey().then((wid) => {
      const s = source();
      setHref(playStoreUrl({ wid, utm_source: s.utm_source ?? s.ref ?? 'web', utm_campaign: s.utm_campaign }));
    });
  }, [store]);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel} onClick={() => trackAppClick(android ? 'android' : 'ios')}>
      {children}
    </a>
  );
}
