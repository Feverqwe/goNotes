import {useQuery} from '@tanstack/react-query';
import {api} from '../tools/api';

export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),

    refetchInterval: 10000,

    refetchOnWindowFocus: true,
  });
};
