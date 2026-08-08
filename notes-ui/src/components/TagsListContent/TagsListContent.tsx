import React, {FC, memo} from 'react';

import {DndContext, DragEndEvent} from '@dnd-kit/core';
import {SortableContext} from '@dnd-kit/sortable';
import {Archive, Check, LightbulbOutlined, Sort} from '@mui/icons-material';
import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from '@mui/material';

import SortableTagItem from './SortableTagItem';

const commonIconSx = {fontSize: 18};

interface TagsListContentProps {
  displayTags: string[];
  currentTags: string[];
  showArchived: boolean;
  showTrash: boolean;
  isGlobalSearch: boolean;
  isReorderMode: boolean;
  handleResetFilters: () => void;
  onArchiveClick: () => void;
  handleToggleOrder: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
  moveStep: (tag: string, direction: 'up' | 'down') => void;
  onTagClick: (tag: string) => void;
}

const TagsListContent: FC<TagsListContentProps> = (props: TagsListContentProps) => {
  const {
    displayTags,
    currentTags,
    showArchived,
    showTrash,
    isGlobalSearch,
    isReorderMode,
    handleResetFilters,
    onArchiveClick,
    handleToggleOrder,
    handleDragEnd,
    moveStep,
    onTagClick,
  } = props;

  return (
    <Box>
      <ListItemButton
        selected={!isGlobalSearch && !showArchived && !showTrash && currentTags.length === 0}
        onClick={handleResetFilters}
      >
        <ListItemIcon>
          <LightbulbOutlined
            sx={{
              fontSize: 18,
              color:
                !isGlobalSearch && !showArchived && !showTrash && currentTags.length === 0
                  ? 'primary.main'
                  : 'text.secondary',
            }}
          />
        </ListItemIcon>
        <ListItemText primary="Заметки" slotProps={{primary: {sx: {fontSize: '0.85rem'}}}} />
      </ListItemButton>

      <ListItemButton selected={showArchived && currentTags.length === 0} onClick={onArchiveClick}>
        <ListItemIcon>
          <Archive
            sx={{
              fontSize: 18,
              color: showArchived && currentTags.length === 0 ? 'primary.main' : 'text.secondary',
            }}
          />
        </ListItemIcon>
        <ListItemText
          primary="Архив"
          slotProps={{
            primary: {
              sx: {fontSize: '0.85rem'},
            },
          }}
        />
      </ListItemButton>

      {displayTags.length > 0 && <Divider />}

      {displayTags.length > 0 && (
        <>
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={displayTags} disabled={!isReorderMode}>
              {displayTags.map((tag, index) => (
                <SortableTagItem
                  key={tag}
                  tag={tag}
                  isReordering={isReorderMode}
                  isActive={currentTags.includes(tag)}
                  onTagClick={onTagClick}
                  moveStep={moveStep}
                  index={index}
                  totalCount={displayTags.length}
                />
              ))}
            </SortableContext>
          </DndContext>
        </>
      )}

      {displayTags.length > 1 && <Divider />}

      {displayTags.length > 1 && (
        <ListItemButton onClick={handleToggleOrder}>
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

export default memo(TagsListContent);
