// typ  ktory dostane text z globalneho inputu
export type CmdListener = (text: string) => void

// mnozina registrovanych listenerov
const listeners = new Set<CmdListener>()

//zaregistruje listenera alebo ho deletne
export function onCommandSubmit (fn: CmdListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
//rozposle text vsetkym listenerom
export function emitCommandSubmit (text: string) {
  for (const fn of listeners) fn(text)
}
