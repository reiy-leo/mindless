import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import Select from '@/components/Select';

export function TaskSortControls({ onChange }: { onChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void } = {}) {
  const { t } = useTranslation('common');
  const { taskSortBy, taskSortOrder, setTaskSortBy, setTaskSortOrder } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={taskSortBy}
        onChange={(val) => {
          setTaskSortBy(val as any);
          onChange?.(val, taskSortOrder);
        }}
        options={[
          { value: 'sortOrder', label: t('tasks.sort.manual') },
          { value: 'dueDate', label: t('tasks.sort.due_date') },
          { value: 'startDate', label: t('tasks.sort.start_date') },
          { value: 'priority', label: t('tasks.sort.priority') },
          { value: 'createdAt', label: t('tasks.sort.created_at') },
        ]}
        className="w-36"
        aria-label={t('tasks.sort.by')}
      />
      <Select
        value={taskSortOrder}
        onChange={(val) => {
          setTaskSortOrder(val as 'asc' | 'desc');
          onChange?.(taskSortBy, val as 'asc' | 'desc');
        }}
        options={[
          { value: 'asc', label: t('tasks.sort.asc') },
          { value: 'desc', label: t('tasks.sort.desc') },
        ]}
        className="w-28"
        aria-label={t('tasks.sort.order')}
      />
    </div>
  );
}