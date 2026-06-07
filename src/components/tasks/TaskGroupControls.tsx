import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import Select from '@/components/Select';

export function TaskGroupControls({ onChange }: { onChange?: (groupBy: string) => void } = {}) {
  const { t } = useTranslation('common');
  const { taskGroupBy, setTaskGroupBy } = useAppStore();

  return (
    <Select
      value={taskGroupBy}
      onChange={(val) => {
        setTaskGroupBy(val as 'none' | 'priority' | 'list');
        onChange?.(val);
      }}
      options={[
        { value: 'none', label: t('tasks.group.none') },
        { value: 'priority', label: t('tasks.group.priority') },
        { value: 'list', label: t('tasks.group.list') },
      ]}
      className="w-36"
      aria-label={t('tasks.group.by')}
    />
  );
}