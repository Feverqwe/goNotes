import {useQuery} from '@tanstack/react-query';
import {api} from '../tools/api';

export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
    // АВТООБНОВЛЕНИЕ: Опрашивать сервер каждые 10 секунд
    refetchInterval: 10000,
    // Не показывать индикатор загрузки при фоновом обновлении
    refetchOnWindowFocus: true,
  });
};
