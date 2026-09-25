import { useEffect, useRef } from 'react';

export function BootAmbient({ enabled }: { enabled: boolean }) {
  const target = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !target.current) return;
    let disposed = false;
    let effect: { destroy?: () => void } | undefined;

    (async () => {
      try {
        const THREE = await import('three');
        (window as typeof window & { THREE?: unknown }).THREE = THREE;
        const module = await import('vanta/dist/vanta.net.min');
        if (disposed || !target.current) return;
        const createNet = (module.default ?? module) as unknown as (options: Record<string, unknown>) => { destroy?: () => void };
        effect = createNet({
          el: target.current,
          THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          points: 7,
          maxDistance: 18,
          spacing: 18,
          showDots: false,
        });
      } catch {
        // The CSS ambient layer remains as the safe fallback if WebGL/Vanta is unavailable.
      }
    })();

    return () => {
      disposed = true;
      effect?.destroy?.();
    };
  }, [enabled]);

  return <div ref={target} className="boot-vanta" aria-hidden="true" />;
}
