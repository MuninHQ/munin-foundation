import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

export type MuninState = 'idle' | 'listening' | 'thinking' | 'searching' | 'executing' | 'warning' | 'done';

const stateLabels: Record<MuninState, string> = {
  idle: 'READY',
  listening: 'LISTENING',
  thinking: 'THINKING',
  searching: 'SEARCHING',
  executing: 'EXECUTING',
  warning: 'ATTENTION',
  done: 'DONE',
};

export function MuninCore({ state = 'idle', compact = false }: { state?: MuninState; compact?: boolean }) {
  return <div className={`munin-core state-${state} ${compact ? 'compact' : ''}`} role="status" aria-label={`Munin ${stateLabels[state]}`}>
    <span className="core-ring ring-a" aria-hidden="true" />
    <span className="core-ring ring-b" aria-hidden="true" />
    <span className="core-ring ring-c" aria-hidden="true" />
    <span className="core-nucleus" aria-hidden="true"><i /></span>
    {!compact && <span className="core-label">{stateLabels[state]}</span>}
  </div>;
}

const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:/';
export function DecryptedText({ text, duration = 520 }: { text: string; duration?: number }) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setDisplay(text); return; }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const revealed = Math.floor(text.length * progress);
      setDisplay(text.split('').map((char, index) => {
        if (char === ' ' || index < revealed) return char;
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      }).join(''));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration]);
  return <span className="decrypted-text">{display}</span>;
}

export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  useEffect(() => {
    const proxy = { value: previous.current };
    const tween = gsap.to(proxy, {
      value,
      duration: 0.65,
      ease: 'power2.out',
      onUpdate: () => { if (ref.current) ref.current.textContent = `${Math.round(proxy.value)}${suffix}`; },
      onComplete: () => { previous.current = value; },
    });
    return () => tween.kill();
  }, [value, suffix]);
  return <span ref={ref}>{Math.round(value)}{suffix}</span>;
}

export function MiniRadar({ active = 4 }: { active?: number }) {
  const dots = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);
  return <div className="mini-radar" aria-label={`${active} intelligence signals active`}>
    <span className="radar-sweep" aria-hidden="true" />
    <i className="radar-ring radar-ring-a" aria-hidden="true" />
    <i className="radar-ring radar-ring-b" aria-hidden="true" />
    {dots.slice(0, active).map(index => <b key={index} className={`radar-dot dot-${index}`} aria-hidden="true" />)}
  </div>;
}

export function ElectricFrame({ children, active = true, className = '' }: { children: React.ReactNode; active?: boolean; className?: string }) {
  return <div className={`electric-frame ${active ? 'is-active' : ''} ${className}`}>{children}</div>;
}
