type UnlistenFn = () => void | Promise<void>

export function safeUnlisten(unlisten: Promise<UnlistenFn> | UnlistenFn) {
  let called = false

  return () => {
    if (called) return
    called = true

    Promise.resolve(unlisten)
      .then((fn) => {
        try {
          const result = fn()
          if (result instanceof Promise) {
            result.catch(() => {})
          }
        } catch {}
      })
      .catch(() => {})
  }
}
