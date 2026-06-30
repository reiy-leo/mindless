export interface FocusHideWindow {
  hide: () => Promise<void>
  onFocusChanged: (handler: (event: { payload: boolean }) => void) => Promise<() => void>
}

const focusHideBoundWindows = new WeakSet<FocusHideWindow>()
const hideSuppressedLabels = new Set<string>()

export function suppressNextHideOnUnfocus(label: string) {
  hideSuppressedLabels.add(label)
}

export function bindHideOnUnfocus(window: FocusHideWindow, label?: string) {
  if (focusHideBoundWindows.has(window)) return

  focusHideBoundWindows.add(window)
  window
    .onFocusChanged(({ payload: focused }) => {
      if (focused) {
        if (label) hideSuppressedLabels.delete(label)
        return
      }
      if (label && hideSuppressedLabels.has(label)) return
      void window.hide().catch(() => {})
    })
    .catch(() => {
      focusHideBoundWindows.delete(window)
    })
}
