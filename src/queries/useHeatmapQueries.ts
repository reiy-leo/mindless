import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useHeatmapData() {
  return useQuery({
    queryKey: ['heatmap-data'],
    queryFn: () => api.getHeatmapData(),
    staleTime: 5 * 60 * 1000,
  });
}
