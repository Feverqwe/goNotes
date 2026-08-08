import React, {FC, memo} from 'react';

import {DndContext, DragEndEvent} from '@dnd-kit/core';
import {SortableContext} from '@dnd-kit/sortable';
import {Check, LightbulbOutlined, Sort} from '@mui/icons-material';
import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from '@mui/material';

import SortableTagNavigationItem from './SortableTagNavigationItem';

const commonIconSx = {fontSize: 18};

interface TagsNavigationListProps {
  tags: string[];
  currentTags: string[];
  showTrash: boolean;
  isGlobalSearch: boolean;
  isReorderMode: boolean;
  onResetFilters: () => void;
  onToggleReorder: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onMove: (tag: string, direction: 'up' | 'down') => void;
  onTagClick: (tag: string) => void;
}

const TagsNavigationList: FC<TagsNavigationListProps> = (props: TagsNavigationListProps) => {
  const {
    tags,
    currentTags,
    showTrash,
    isGlobalSearch,
    isReorderMode,
    onResetFilters,
    onToggleReorder,
    onDragEnd,
    onMove,
    onTagClick,
  } = props;

  return (
    <Box>
      <ListItemButton
        selected={!isGlobalSearch && !showTrash && currentTags.length === 0}
        onClick={onResetFilters}
      >
        <ListItemIcon>
          <LightbulbOutlined
            sx={{
              fontSize: 18,
              color:
                !isGlobalSearch && !showTrash && currentTags.length === 0
                  ? 'primary.main'
                  : 'text.secondary',
            }}
          />
        </ListItemIcon>
        <ListItemText primary="Заметки" slotProps={{primary: {sx: {fontSize: '0.85rem'}}}} />
      </ListItemButton>

      {tags.length > 0 && <Divider />}

      {tags.length > 0 && (
        <DndContext onDragEnd={onDragEnd}>
          <SortableContext items={tags} disabled={!isReorderMode}>
            {tags.map((tag, index) => (
              <SortableTagNavigationItem
                key={tag}
                tag={tag}
                isReordering={isReorderMode}
                isActive={currentTags.includes(tag)}
                onTagClick={onTagClick}
                onMove={onMove}
                index={index}
                totalCount={tags.length}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {tags.length > 1 && <Divider />}

      {tags.length > 1 && (
        <ListItemButton onClick={onToggleReorder}>
          <ListItemIcon>
            {isReorderMode ? (
              <Check color="primary" sx={commonIconSx} />
            ) : (
              <Sort sx={{...commonIconSx, color: 'text.secondary'}} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={isReorderMode ? 'Сохранить порядок' : 'Изменить порядок'}
            slotProps={{
              primary: {
                sx: {fontSize: '0.85rem'},
              },
            }}
          />
        </ListItemButton>
      )}
    </Box>
  );
};

export default memo(TagsNavigationList);
