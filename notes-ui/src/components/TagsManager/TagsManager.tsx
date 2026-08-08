import React, {FC, memo, useCallback, useMemo, useRef, useState} from 'react';

import {DragEndEvent} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {useTags} from '../../hooks/useTags';
import {api} from '../../tools/api';
import {ReorderTagsRequest} from '../../tools/types';
import TagsListContent from '../TagsListContent/TagsListContent';

interface TagsManagerProps {
  currentTags: string[];
  showArchived: boolean;
  showTrash: boolean;
  isGlobalSearch: boolean;
  onResetFilters: () => void;
  onArchiveClick: () => void;
  onTagClick: (tag: string) => void;
  onActionFinished: () => void;
}

const TagsManager: FC<TagsManagerProps> = ({
  currentTags,
  showArchived,
  showTrash,
  isGlobalSearch,
  onResetFilters,
  onArchiveClick,
  onTagClick,
  onActionFinished,
}: TagsManagerProps) => {
  const queryClient = useQueryClient();

  const [isReorderMode, setIsReorderMode] = useState(false);
  const [dndTags, setDndTags] = useState<string[]>([]);
  const refDndTags = useRef(dndTags);
  refDndTags.current = dndTags;

  const {data: allTags = []} = useTags();

  const handleResetFilters = useCallback(() => {
    onResetFilters();
    onActionFinished();
  }, [onActionFinished, onResetFilters]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setDndTags((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const moveStep = useCallback((tag: string, direction: 'up' | 'down') => {
    setDndTags((prev) => {
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
      setDndTags([]);
    },
  });

  const handleToggleOrder = useCallback(() => {
    if (isReorderMode) {
      reorderMutation.mutate({names: refDndTags.current});
    } else {
      setIsReorderMode(true);
      setDndTags(allTags);
    }
  }, [allTags, isReorderMode, reorderMutation]);

  const handleNavigateToTag = useCallback(
    (tag: string) => {
      onTagClick(tag);
      onActionFinished();
    },
    [onActionFinished, onTagClick],
  );

  const displayTags = useMemo(
    () => (isReorderMode ? dndTags : allTags),
    [isReorderMode, dndTags, allTags],
  );

  return (
    <TagsListContent
      displayTags={displayTags}
      currentTags={currentTags}
      showArchived={showArchived}
      showTrash={showTrash}
      isGlobalSearch={isGlobalSearch}
      isReorderMode={isReorderMode}
      handleResetFilters={handleResetFilters}
      onArchiveClick={onArchiveClick}
      handleToggleOrder={handleToggleOrder}
      handleDragEnd={handleDragEnd}
      moveStep={moveStep}
      onTagClick={handleNavigateToTag}
    />
  );
};
export default memo(TagsManager);
