import {useInfiniteQuery} from '@tanstack/react-query';

import {POST_LIMIT} from '../constants';
import {api} from '../tools/api';
import {ListNotesRequest} from '../tools/types';

export const useNotes = (filters: {
  id: ListNotesRequest['id'];
  q: string;
  tags: string[];
  archived: boolean;
  deleted: boolean;
}) => {
  return useInfiniteQuery({
    queryKey: ['notes', filters],
    queryFn: async ({pageParam = {sortOrder: 0, isArchived: 0}}) => {
      return api.notes.list({
        id: filters.id,
        limit: POST_LIMIT,
        last_order: pageParam.sortOrder,
        last_archived: pageParam.isArchived,
        q: filters.q,
        tags: filters.tags.join(','),
        archived: filters.archived ? '1' : '0',
        deleted: filters.deleted ? '1' : '0',
      });
    },
    initialPageParam: {sortOrder: 0, isArchived: 0},
    getNextPageParam: (lastPage) => {
      if (lastPage.length < POST_LIMIT) return undefined;

      const lastNote = lastPage[lastPage.length - 1];
      return {sortOrder: lastNote.sort_order, isArchived: lastNote.is_archived};
    },

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
};
