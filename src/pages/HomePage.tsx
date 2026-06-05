import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation('common');

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{t('navigation.home')}</h1>

        {/* Today Tasks Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">今日任务</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-500">暂无今日任务，点击 + 添加新任务</p>
          </div>
        </section>

        {/* Upcoming Habits Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">即将到期的习惯</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-500">暂无习惯，点击 + 添加新习惯</p>
          </div>
        </section>

        {/* Nearby Countdowns Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">即将到来的倒数日</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-500">暂无倒数日，点击 + 添加新倒数日</p>
          </div>
        </section>
      </div>
    </div>
  );
}
