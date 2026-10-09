import { useEffect, useState } from 'react';
import type { MuninState } from './effects';
type Presence = { state: MuninState; label: string; pending: number };
declare global { interface Window { MuninPresence?: { snapshot(): Presence } } }
export function usePresence() {
  const [presence, setPresence] = useState<Presence>(() => window.MuninPresence?.snapshot() ?? {state:'idle',label:'Pronto para o próximo passo',pending:0});
  useEffect(() => {
    const update = (event: Event) => setPresence((event as CustomEvent<Presence>).detail);
    window.addEventListener('munin:presence', update);
    setPresence(window.MuninPresence?.snapshot() ?? {state:'idle',label:'Pronto para o próximo passo',pending:0});
    return () => window.removeEventListener('munin:presence', update);
  }, []);
  return presence;
}
