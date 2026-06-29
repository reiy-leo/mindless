import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import Select from '@/components/Select';

export function TaskGroupControls({
  disableTaskGroup = false,
  onChange,
}: { disableTaskGroup?: boolean; onChange?: (groupBy: string) => void } = {}) {
  const { t } = useTranslation('common');
  const { taskGroupBy, setTaskGroupBy } = useAppStore();
  const options = [
    { value: 'none', label: t('tasks.group.none') },
    { value: 'time', label: t('tasks.group.time') },
    { value: 'priority', label: t('tasks.group.priority') },
    ...(!disableTaskGroup ? [{ value: 'list', label: t('tasks.group.list') }] : []),
  ];

  return (
    <Select
      value={taskGroupBy}
      onChange={(val) => {
        setTaskGroupBy(val as 'none' | 'priority' | 'list' | 'time');
        onChange?.(val);
      }}
      options={options}
      className="w-36"
      aria-label={t('tasks.group.by')}
    />
  );
}
