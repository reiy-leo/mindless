import OverlayWebviewWindow from '@/components/OverlayWebviewWindow';
import SettingsPage from '@/pages/SettingsPage';

export default function SettingsDialogPage() {
  return (
    <OverlayWebviewWindow closable={false}>
      <SettingsPage />
    </OverlayWebviewWindow>
  );
}
