export const TASK_COMPLETION_ACTION_DELAY_MS = 500

type Wait = (ms: number) => Promise<void>

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runAfterTaskCompletionDelay(action: () => void | Promise<void>, waitFor: Wait = wait) {
  await waitFor(TASK_COMPLETION_ACTION_DELAY_MS)
  await action()
}
