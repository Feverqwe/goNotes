import React, {FC, useCallback, useContext, useRef, useState} from 'react';

import {Divider, ListItemIcon, ListItemText, Menu, MenuItem} from '@mui/material';

import {Archive, Check, Sort} from '@mui/icons-material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {DndContext, DragEndEvent} from '@dnd-kit/core';
import {arrayMove, SortableContext} from '@dnd-kit/sortable';
import {api} from '../../tools/api';
import {useTags} from '../../hooks/useTags';
import SortableTagItem from './SortableTagItem';
import {ReorderTagsRequest} from '../../tools/types';
import {SnackCtx} from '../../ctx/SnackCtx';

interface TagsMenuProps {
  tagMenuAnchor: HTMLButtonElement | null;
  handleCloseTagMenu: () => void;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
}

const TagsMenu: FC<TagsMenuProps> = ({
  tagMenuAnchor,
  handleCloseTagMenu,
  currentTags,
  setCurrentTags,
  showArchived,
  setShowArchived,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const [isReorderMode, setIsReorderMode] = useState(false);

  const [dndTags, setDndTags] = useState<string[]>([]);
  const refDndTags = useRef(dndTags);
  refDndTags.current = dndTags;

  const {data: allTags = [] as string[]} = useTags();

  const toggleTag = useCallback(
    (tag: string) => {
      setCurrentTags((prev) => {
        if (prev.includes(tag)) {
          return prev.filter((t) => t !== tag);
        }

        return [...prev, tag];
      });
      handleCloseTagMenu();
    },
    [handleCloseTagMenu, setCurrentTags],
  );

  const reorderMutation = useMutation({
    mutationFn: (params: ReorderTagsRequest) => api.tags.reorder(params),
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({queryKey: ['tags']});
      } finally {
        showSnackbar('Порядок сохранен');
        setIsReorderMode(false);
        setDndTags([]);
      }
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка сохранения порядка', 'error');
    },
  });

  const saveTagsOrder = useCallback(() => {
    const localTags = refDndTags.current;
    reorderMutation.mutate({names: localTags});
  }, [reorderMutation]);

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

  const handleToggleArchive = useCallback(() => {
    setShowArchived((v) => !v);
    handleCloseTagMenu();
  }, [handleCloseTagMenu, setShowArchived]);

  const handleToggleOrder = useCallback(() => {
    if (isReorderMode) {
      saveTagsOrder();
    } else {
      setIsReorderMode(true);
      setDndTags(allTags);
    }
  }, [allTags, isReorderMode, saveTagsOrder]);

  const displayTags = isReorderMode ? dndTags : allTags;

  return (
    <Menu
      anchorEl={tagMenuAnchor}
      open={Boolean(tagMenuAnchor)}
      onClose={handleCloseTagMenu}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'rgba(24, 24, 26, 0.85)',
            backdropFilter: 'blur(15px) saturate(140%)',
            minWidth: 240,
            maxHeight: 450,
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            mt: 0.5,
            backgroundImage: 'none',
          },
        },
      }}
    >
      <MenuItem
        onClick={handleToggleArchive}
        sx={{
          py: 1.2,
          px: 2,
          bgcolor: showArchived ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
          '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.05)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '32px !important'}}>
          <Archive sx={{fontSize: 18, color: showArchived ? '#90caf9' : '#8e8e93'}} />
        </ListItemIcon>
        <ListItemText
          primary="Только архив"
          slotProps={{primary: {fontSize: '0.85rem', color: showArchived ? '#90caf9' : '#efefef'}}}
        />
      </MenuItem>

      {displayTags.length > 0 && <Divider sx={{borderColor: 'rgba(255, 255, 255, 0.08)'}} />}

      {displayTags.length > 0 && (
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={displayTags} disabled={!isReorderMode}>
            {displayTags.map((tag, index) => (
              <SortableTagItem
                key={tag}
                tag={tag}
                isReordering={isReorderMode}
                isActive={currentTags.includes(tag)}
                toggleTag={toggleTag}
                moveStep={moveStep}
                index={index}
                totalCount={tag.length}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {displayTags.length > 1 && <Divider sx={{borderColor: 'rgba(255, 255, 255, 0.08)'}} />}

      {displayTags.length > 1 && (
        <MenuItem onClick={handleToggleOrder}>
          <ListItemIcon>{isReorderMode ? <Check color="primary" /> : <Sort />}</ListItemIcon>
          <ListItemText
            primary={isReorderMode ? 'Сохранить порядок' : 'Изменить порядок'}
            slotProps={{
              primary: {fontSize: '0.85rem'},
            }}
          />
        </MenuItem>
      )}
    </Menu>
  );
};

export default TagsMenu;
