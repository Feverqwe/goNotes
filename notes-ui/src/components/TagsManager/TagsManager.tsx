import React, {FC, useCallback, useContext, useRef, useState, useMemo, memo} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {arrayMove} from '@dnd-kit/sortable';
import {DragEndEvent} from '@dnd-kit/core';

import {api} from '../../tools/api';
import {useTags} from '../../hooks/useTags';
import {ReorderTagsRequest} from '../../tools/types';
import {SnackCtx} from '../../ctx/SnackCtx';
import TagsListContent from '../TagsListContent/TagsListContent';

interface TagsManagerProps {
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  onActionFinished: () => void;
}

const TagsManager: FC<TagsManagerProps> = memo(
  ({
    currentTags,
    setCurrentTags,
    showArchived,
    setShowArchived,
    onActionFinished,
  }: TagsManagerProps) => {
    const showSnackbar = useContext(SnackCtx);
    const queryClient = useQueryClient();

    const [isReorderMode, setIsReorderMode] = useState(false);
    const [dndTags, setDndTags] = useState<string[]>([]);
    const refDndTags = useRef(dndTags);
    refDndTags.current = dndTags;

    const {data: allTags = []} = useTags();

    const toggleTag = useCallback(
      (tag: string) => {
        setCurrentTags((prev) =>
          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
        onActionFinished();
      },
      [setCurrentTags, onActionFinished],
    );

    const handleToggleArchive = useCallback(() => {
      setShowArchived((v) => !v);
      onActionFinished();
    }, [setShowArchived, onActionFinished]);

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
        showSnackbar('Порядок сохранен');
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

    const setExclusiveTag = useCallback(
      (tag: string) => {
        setCurrentTags((prev) => (prev.length === 1 && prev[0] === tag ? [] : [tag]));
        onActionFinished();
      },
      [setCurrentTags, onActionFinished],
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
        isReorderMode={isReorderMode}
        handleToggleArchive={handleToggleArchive}
        handleToggleOrder={handleToggleOrder}
        handleDragEnd={handleDragEnd}
        moveStep={moveStep}
        toggleTag={toggleTag}
        setExclusiveTag={setExclusiveTag}
      />
    );
  },
);

export default TagsManager;
