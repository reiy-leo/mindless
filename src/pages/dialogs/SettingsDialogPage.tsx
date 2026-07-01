import SettingsPage from '#/SettingsPage'
import ErrorBoundary from '%/ErrorBoundary'
import OverlayWebviewWindow from '%/OverlayWebviewWindow'

export default function SettingsDialogPage() {
  return (
    <OverlayWebviewWindow closable={false}>
      <ErrorBoundary>
        <SettingsPage />
      </ErrorBoundary>
    </OverlayWebviewWindow>
  )
}
