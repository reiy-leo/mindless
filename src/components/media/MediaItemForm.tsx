import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CoverUploader from './CoverUploader';
import MultiValueInput from './MultiValueInput';
import RelationSelector from './RelationSelector';
import { useCreateMediaItem, useUpdateMediaItem, useMediaItemDetails } from '@/queries/useMediaQueries';
import type { MediaItem, CreateMediaItemInput, UpdateMediaItemInput } from '@/types/media';

interface MediaItemFormProps {
  item?: MediaItem | null;
  onClose: () => void;
}

export default function MediaItemForm({ item, onClose }: MediaItemFormProps) {
  const { t } = useTranslation('common');
  const createItem = useCreateMediaItem();
  const updateItem = useUpdateMediaItem();
  const { data: details } = useMediaItemDetails(item?.id || null);

  const [formData, setFormData] = useState({
    type: 'movie' as 'movie' | 'season',
    title: '',
    year: '',
    cover: null as string | null,
    rating: '',
    status: 'normal' as 'normal' | 'favorite' | 'watched' | 'archived',
    groupId: '',
    doubanUrl: '',
    imdbUrl: '',
    rottenTomatoesUrl: '',
    tvShowTitle: '',
    seasonNumber: '',
    otherNames: [] as { name: string; label?: string }[],
    watchLinks: [] as { url: string; platform?: string }[],
    relatedItemIds: [] as string[],
  });

  useEffect(() => {
    if (item) {
      setFormData({
        type: item.type,
        title: item.title,
        year: item.year?.toString() || '',
        cover: item.cover,
        rating: item.rating?.toString() || '',
        status: item.status,
        groupId: item.groupId || '',
        doubanUrl: item.doubanUrl || '',
        imdbUrl: item.imdbUrl || '',
        rottenTomatoesUrl: item.rottenTomatoesUrl || '',
        tvShowTitle: item.tvShowTitle || '',
        seasonNumber: item.seasonNumber?.toString() || '',
        otherNames: details?.otherNames?.map((n) => ({ name: n.name, label: n.label })) || [],
        watchLinks: details?.watchLinks?.map((l) => ({ url: l.url, platform: l.platform || undefined })) || [],
        relatedItemIds: details?.relations?.map((r) => r.relatedItemId) || [],
      });
    }
  }, [item, details]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateMediaItemInput | UpdateMediaItemInput = {
      type: formData.type,
      title: formData.title,
      year: formData.year ? parseInt(formData.year) : undefined,
      cover: formData.cover || undefined,
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      status: formData.status,
      groupId: formData.groupId || undefined,
      doubanUrl: formData.doubanUrl || undefined,
      imdbUrl: formData.imdbUrl || undefined,
      rottenTomatoesUrl: formData.rottenTomatoesUrl || undefined,
      tvShowTitle: formData.tvShowTitle || undefined,
      seasonNumber: formData.seasonNumber ? parseInt(formData.seasonNumber) : undefined,
      otherNames: formData.otherNames,
      watchLinks: formData.watchLinks,
      relatedItemIds: formData.relatedItemIds,
    };

    try {
      if (item) {
        await updateItem.mutateAsync({ id: item.id, ...data });
      } else {
        await createItem.mutateAsync(data as CreateMediaItemInput);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save media item:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {item ? t('media.actions.edit') : t('media.actions.new')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.type')}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'movie' | 'season' })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            >
              <option value="movie">{t('media.type.movie')}</option>
              <option value="season">{t('media.type.season')}</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
          </div>

          {/* TV Show fields */}
          {formData.type === 'season' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('media.fields.tvShowTitle')}
                </label>
                <input
                  type="text"
                  value={formData.tvShowTitle}
                  onChange={(e) => setFormData({ ...formData, tvShowTitle: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('media.fields.seasonNumber')}
                </label>
                <input
                  type="number"
                  value={formData.seasonNumber}
                  onChange={(e) => setFormData({ ...formData, seasonNumber: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          )}

          {/* Year and Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.year')}
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.rating')}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          {/* Status and Group */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              >
                <option value="normal">{t('media.status.normal')}</option>
                <option value="favorite">{t('media.status.favorite')}</option>
                <option value="watched">{t('media.status.watched')}</option>
                <option value="archived">{t('media.status.archived')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.group')}
              </label>
              <select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              >
                <option value="">None</option>
              </select>
            </div>
          </div>

          {/* Cover */}
          <CoverUploader
            value={formData.cover}
            onChange={(url) => setFormData({ ...formData, cover: url })}
          />

          {/* Other Names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.otherNames')}
            </label>
            <MultiValueInput
              value={formData.otherNames}
              onChange={(value) => setFormData({ ...formData, otherNames: value })}
              placeholder={t('media.placeholder.otherName')}
              showLabel
            />
          </div>

          {/* Links */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Links
            </label>
            <input
              type="url"
              value={formData.doubanUrl}
              onChange={(e) => setFormData({ ...formData, doubanUrl: e.target.value })}
              placeholder={t('media.placeholder.doubanUrl')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
            <input
              type="url"
              value={formData.imdbUrl}
              onChange={(e) => setFormData({ ...formData, imdbUrl: e.target.value })}
              placeholder={t('media.placeholder.imdbUrl')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
            <input
              type="url"
              value={formData.rottenTomatoesUrl}
              onChange={(e) => setFormData({ ...formData, rottenTomatoesUrl: e.target.value })}
              placeholder={t('media.placeholder.rottenTomatoesUrl')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
          </div>

          {/* Watch Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.watchLinks')}
            </label>
            <MultiValueInput
              value={formData.watchLinks.map((l) => ({ name: l.url, label: l.platform }))}
              onChange={(value) => setFormData({
                ...formData,
                watchLinks: value.map((v) => ({ url: v.name, platform: v.label })),
              })}
              placeholder={t('media.placeholder.watchLink')}
              showLabel
            />
          </div>

          {/* Relations */}
          <RelationSelector
            value={formData.relatedItemIds}
            onChange={(value) => setFormData({ ...formData, relatedItemIds: value })}
            currentItemId={item?.id}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={createItem.isPending || updateItem.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {t('media.actions.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {t('media.actions.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
