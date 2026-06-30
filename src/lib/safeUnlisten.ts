type UnlistenFn = () => void | Promise<void>

export function safeUnlisten(unlisten: Promise<UnlistenFn>) {
  let called = false

  return () => {
    if (called) return
    called = true

    unlisten
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
