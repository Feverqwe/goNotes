import React, {FC, memo, useCallback, useMemo, useRef, useState} from 'react';

import {DragEndEvent} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {useTags} from '../../hooks/useTags';
import {api} from '../../tools/api';
import {ReorderTagsRequest} from '../../tools/types';
import TagsNavigationList from '../TagsNavigationList/TagsNavigationList';

interface TagsNavigationProps {
  currentTags: string[];
  showTrash: boolean;
  isGlobalSearch: boolean;
  onResetFilters: () => void;
  onTagClick: (tag: string) => void;
  onActionFinished: () => void;
}

const TagsNavigation: FC<TagsNavigationProps> = ({
  currentTags,
  showTrash,
  isGlobalSearch,
  onResetFilters,
  onTagClick,
  onActionFinished,
}: TagsNavigationProps) => {
  const queryClient = useQueryClient();

  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedTags, setOrderedTags] = useState<string[]>([]);
  const orderedTagsRef = useRef(orderedTags);
  orderedTagsRef.current = orderedTags;

  const {data: allTags = []} = useTags();

  const resetFiltersAndClose = useCallback(() => {
    onResetFilters();
    onActionFinished();
  }, [onActionFinished, onResetFilters]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setOrderedTags((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const moveTag = useCallback((tag: string, direction: 'up' | 'down') => {
    setOrderedTags((prev) => {
      const idx = prev.indexOf(tag);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newArray = [...prev];
      const [movedItem] = newArray.splice(idx, 1);
      newArray.splice(newIdx, 0, movedItem);
      return newArray;
    });
  }, []);

  const reorderMutation = useMutation({
    mutationFn: (params: ReorderTagsRequest) => api.tags.reorder(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['tags']});
      setIsReorderMode(false);
      setOrderedTags([]);
    },
  });

  const toggleReorderMode = useCallback(() => {
    if (isReorderMode) {
      reorderMutation.mutate({names: orderedTagsRef.current});
    } else {
      setIsReorderMode(true);
      setOrderedTags(allTags);
    }
  }, [allTags, isReorderMode, reorderMutation]);

  const handleNavigateToTag = useCallback(
    (tag: string) => {
      onTagClick(tag);
      onActionFinished();
    },
    [onActionFinished, onTagClick],
  );

  const visibleTags = useMemo(
    () => (isReorderMode ? orderedTags : allTags),
    [isReorderMode, orderedTags, allTags],
  );

  return (
    <TagsNavigationList
      tags={visibleTags}
      currentTags={currentTags}
      showTrash={showTrash}
      isGlobalSearch={isGlobalSearch}
      isReorderMode={isReorderMode}
      onResetFilters={resetFiltersAndClose}
      onToggleReorder={toggleReorderMode}
      onDragEnd={handleDragEnd}
      onMove={moveTag}
      onTagClick={handleNavigateToTag}
    />
  );
};
export default memo(TagsNavigation);
