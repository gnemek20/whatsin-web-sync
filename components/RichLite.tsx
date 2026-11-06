// 서식 글자(가벼운 판) — 클라이언트 컴포넌트용. Rich 와 같은 서식(줄바꿈 · **굵게** · 「- 」 목록)을 그리되 KaTeX 를 싣지 않는다
// ($수식$ 은 lib/markup.texToText 로 글자만). KaTeX(약 70 kB gzip)가 클라이언트 번들에 들어가지 않게 'use client' 파일에서는 이것을 쓴다.
import { Fragment } from 'react';
import { parseMarkup, texToText, type Line } from '@/lib/markup';

export function RichLite({ text, className }: { text: string; className?: string }) {
  const lines = parseMarkup(text);
  const segs = (line: Line) =>
    line.segs.map((g, gi) =>
      g.kind === 'bold' ? <strong key={gi}>{g.text}</strong> : <Fragment key={gi}>{g.kind === 'math' ? texToText(g.text) : g.text}</Fragment>,
    );
  if (lines.length === 1 && !lines[0].bullet) return <span className={className}>{segs(lines[0])}</span>;
  return (
    <span className={className}>
      {lines.map((line, li) =>
        line.bullet ? (
          <span key={li} className="rich-li"><span aria-hidden="true">•</span><span>{segs(line)}</span></span>
        ) : (
          <span key={li} className="rich-p">{segs(line)}</span>
        ),
      )}
    </span>
  );
}
