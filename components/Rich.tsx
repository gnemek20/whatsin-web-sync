// 서식 글자 — \n 줄바꿈 · **굵게** · "- " 목록 · $수식$(KaTeX). 규칙은 lib/markup.ts(앱 ui/markup.ts 와 같은 파서).
// 감싸는 <p>/<span> 의 글자 스타일을 그대로 따른다. 여러 줄이면 줄마다 display:block 인 <span>(문단 · 내어쓴 목록)으로 그린다.
import katex from 'katex';
import { Fragment } from 'react';
import { parseMarkup, type Line } from '@/lib/markup';

function math(tex: string): string {
  // 얇은 공백(\,)은 붙인다 — 한국어 표기 「69g」·「1공기」(앱 markup.texToText 와 같게).
  return katex.renderToString(tex.replace(/\\[,!]/g, ''), { throwOnError: false, output: 'html', strict: 'ignore' });
}

export function Rich({ text, className }: { text: string; className?: string }) {
  const lines = parseMarkup(text);
  const segs = (line: Line) =>
    line.segs.map((g, gi) =>
      g.kind === 'text' ? <Fragment key={gi}>{g.text}</Fragment>
        : g.kind === 'bold' ? <strong key={gi}>{g.text}</strong>
        : <span key={gi} className="rich-math" dangerouslySetInnerHTML={{ __html: math(g.text) }} />,
    );
  // 한 줄이면 안쪽 서식만(제목 · 칩 같은 한 줄 자리). 여러 줄이면 문단 · 목록으로(2026-11-05 · globals.css .rich-p · .rich-li).
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
