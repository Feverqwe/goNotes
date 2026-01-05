import {useInfiniteQuery} from '@tanstack/react-query';
import {api} from '../tools/api';
import {ListMessagesRequest} from '../tools/types';

const LIMIT = 6;

export const useNotes = (filters: {
  id: ListMessagesRequest['id'];
  q: string;
  tags: string[];
  archived: boolean;
}) => {
  return useInfiniteQuery({
    queryKey: ['notes', filters],
    queryFn: async ({pageParam = 0}) => {
      return api.messages.list({
        id: filters.id,
        limit: LIMIT,
        last_order: pageParam,
        q: filters.q,
        tags: filters.tags.join(','),
        archived: filters.archived ? '1' : '0',
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < LIMIT) return undefined;

      return lastPage[lastPage.length - 1].sort_order;
    },

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
};
