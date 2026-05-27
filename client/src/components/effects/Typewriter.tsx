import { useEffect, useRef, useState } from 'react';
import './Typewriter.css';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyHighlights(str: string, patterns: (RegExp | string)[]): string {
  if (!patterns.length) return escapeHtml(str);
  // Split on captured groups — odd indices are matched portions
  const combined = new RegExp(
    `(${patterns.map((p) => (typeof p === 'string' ? escapeRegex(p) : p.source)).join('|')})`,
    'g',
  );
  return str
    .split(combined)
    .map((part, i) =>
      i % 2 === 1
        ? `<em class="brand">${escapeHtml(part)}</em>`
        : escapeHtml(part),
    )
    .join('');
}

interface TypewriterProps {
  text: string;
  speed?: number;                    // ms per character, default 14
  highlights?: (RegExp | string)[];  // patterns wrapped in <em class="brand">
  onDone?: () => void;
  hideCaretOnDone?: boolean;         // default false — caret keeps blinking
}

// Demo: <Typewriter text="Based on the last 7 closes, I'm seeing a familiar pattern." speed={12} />
export function Typewriter({
  text,
  speed = 14,
  highlights = [],
  onDone,
  hideCaretOnDone = false,
}: TypewriterProps) {
  const [count, setCount] = useState(0);
  const [done, setDone]   = useState(false);

  const intervalRef = useRef(0);
  const onDoneRef   = useRef(onDone);
  onDoneRef.current = onDone; // keep ref in sync without re-triggering effect

  useEffect(() => {
    setCount(0);
    setDone(false);

    let current = 0;
    intervalRef.current = window.setInterval(() => {
      current += 1;
      setCount(current);
      if (current >= text.length) {
        clearInterval(intervalRef.current);
        setDone(true);
        onDoneRef.current?.();
      }
    }, speed);

    return () => clearInterval(intervalRef.current);
  }, [text, speed]);

  const html       = applyHighlights(text.slice(0, count), highlights);
  const showCaret  = !hideCaretOnDone || !done;

  return (
    <span>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      {showCaret && <span className="typewriter-cursor" />}
    </span>
  );
}
