import {useInfiniteQuery} from '@tanstack/react-query';
import {api} from '../tools/api';

const LIMIT = 6; // Сколько сообщений грузим за раз

export const useNotes = (filters: {q: string; tags: string[]; archived: boolean}) => {
  return useInfiniteQuery({
    queryKey: ['notes', filters],
    queryFn: async ({pageParam = 0}) => {
      return api.messages.list({
        limit: LIMIT,
        last_order: pageParam,
        q: filters.q,
        tags: filters.tags.join(','),
        archived: filters.archived ? '1' : '0',
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      // Если пришло меньше 6, значит больше страниц нет
      if (lastPage.length < LIMIT) return undefined;
      // Берем sort_order последней заметки для следующего запроса
      return lastPage[lastPage.length - 1].sort_order;
    },
    // АВТООБНОВЛЕНИЕ: Опрашивать сервер каждые 10 секунд
    refetchInterval: 10000,
    // Не показывать индикатор загрузки при фоновом обновлении
    refetchOnWindowFocus: true,
  });
};
