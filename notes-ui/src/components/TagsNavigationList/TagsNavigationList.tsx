import React, {FC, memo} from 'react';

import {DndContext, DragEndEvent} from '@dnd-kit/core';
import {SortableContext} from '@dnd-kit/sortable';
import {Check, Clear, LightbulbOutlined, Search, Sort} from '@mui/icons-material';
import {
  Box,
  Divider,
  IconButton,
  InputBase,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

import SortableTagNavigationItem from './SortableTagNavigationItem';

const commonIconSx = {fontSize: 18};
const tagFilterRowSx = {
  minHeight: 40,
  display: 'flex',
  alignItems: 'center',
  px: 2,
  color: 'text.secondary',
  transition: (theme: {transitions: {create: (property: string) => string}}) =>
    theme.transitions.create('background-color'),
  '&:focus-within': {
    bgcolor: 'action.hover',
    color: 'primary.main',
  },
};
const tagFilterInputSx = {
  flex: 1,
  minWidth: 0,
  fontSize: '0.85rem',
  '& input': {py: 0.75},
};
const tagFilterClearSx = {mr: -0.75, color: 'text.secondary'};

interface TagsNavigationListProps {
  tags: string[];
  totalTagCount: number;
  tagFilter: string;
  currentTags: string[];
  showArchived: boolean;
  showTrash: boolean;
  isGlobalSearch: boolean;
  hasSelectedNote: boolean;
  isReorderMode: boolean;
  onResetFilters: () => void;
  onToggleReorder: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onMove: (tag: string, direction: 'up' | 'down') => void;
  onTagClick: (tag: string) => void;
  onTagFilterChange: (value: string) => void;
  onTagFilterClear: () => void;
}

const TagsNavigationList: FC<TagsNavigationListProps> = (props: TagsNavigationListProps) => {
  const {
    tags,
    totalTagCount,
    tagFilter,
    currentTags,
    showArchived,
    showTrash,
    isGlobalSearch,
    hasSelectedNote,
    isReorderMode,
    onResetFilters,
    onToggleReorder,
    onDragEnd,
    onMove,
    onTagClick,
    onTagFilterChange,
    onTagFilterClear,
  } = props;
  const isNotesSelected =
    !isGlobalSearch && !showArchived && !showTrash && !hasSelectedNote && currentTags.length === 0;

  return (
    <Box>
      <ListItemButton selected={isNotesSelected} onClick={onResetFilters}>
        <ListItemIcon>
          <LightbulbOutlined
            sx={{
              fontSize: 18,
              color: isNotesSelected ? 'primary.main' : 'text.secondary',
            }}
          />
        </ListItemIcon>
        <ListItemText primary="Заметки" slotProps={{primary: {sx: {fontSize: '0.85rem'}}}} />
      </ListItemButton>

      {totalTagCount > 0 && <Divider />}

      {totalTagCount > 0 && !isReorderMode && (
        <Box sx={tagFilterRowSx}>
          <Search sx={{fontSize: 16, mr: 2}} />
          <InputBase
            value={tagFilter}
            placeholder="Найти тег"
            onChange={(event) => onTagFilterChange(event.target.value)}
            inputProps={{'aria-label': 'Фильтр тегов'}}
            sx={tagFilterInputSx}
          />
          {tagFilter && (
            <IconButton
              aria-label="Очистить фильтр тегов"
              size="small"
              onClick={onTagFilterClear}
              sx={tagFilterClearSx}
            >
              <Clear sx={{fontSize: 16}} />
            </IconButton>
          )}
        </Box>
      )}

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

      {tags.length === 0 && totalTagCount > 0 && tagFilter.trim() && !isReorderMode && (
        <Typography sx={{pl: 6.5, pr: 2, py: 1, color: 'text.secondary', fontSize: '0.8rem'}}>
          Теги не найдены
        </Typography>
      )}

      {totalTagCount > 1 && <Divider />}

      {totalTagCount > 1 && (
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
