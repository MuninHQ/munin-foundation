declare module 'vanta/dist/vanta.net.min' {
  const createEffect: (options: Record<string, unknown>) => { destroy?: () => void };
  export default createEffect;
}
