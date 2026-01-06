import React, {FC, memo} from 'react';
import {Divider, ListItemIcon, ListItemText, MenuItem, Box} from '@mui/material';
import {Archive, Check, Sort} from '@mui/icons-material';
import {DndContext, DragEndEvent} from '@dnd-kit/core';
import {SortableContext} from '@dnd-kit/sortable';
import SortableTagItem from '../TagsMenu/SortableTagItem';

const iconBtnSx = {minWidth: '32px !important'};
const dividerSx = {borderColor: 'rgba(255, 255, 255, 0.08)'};
const commonIconSx = {fontSize: 18};

interface TagsListContentProps {
  displayTags: string[];
  currentTags: string[];
  showArchived: boolean;
  isReorderMode: boolean;
  handleToggleArchive: () => void;
  handleToggleOrder: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
  moveStep: (tag: string, direction: 'up' | 'down') => void;
  toggleTag: (tag: string) => void;
}

const TagsListContent: FC<TagsListContentProps> = memo((props: TagsListContentProps) => {
  const {
    displayTags,
    currentTags,
    showArchived,
    isReorderMode,
    handleToggleArchive,
    handleToggleOrder,
    handleDragEnd,
    moveStep,
    toggleTag,
  } = props;

  return (
    <Box>
      <MenuItem
        onClick={handleToggleArchive}
        sx={{
          py: 1.2,
          px: 2,
          bgcolor: showArchived ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
          '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.05)'},
        }}
      >
        <ListItemIcon sx={iconBtnSx}>
          <Archive sx={{...commonIconSx, color: showArchived ? '#90caf9' : '#8e8e93'}} />
        </ListItemIcon>
        <ListItemText
          primary="Архив"
          slotProps={{primary: {fontSize: '0.85rem', color: showArchived ? '#90caf9' : '#efefef'}}}
        />
      </MenuItem>

      {displayTags.length > 0 && <Divider sx={dividerSx} />}

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
                totalCount={displayTags.length}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {displayTags.length > 1 && <Divider sx={dividerSx} />}

      {displayTags.length > 1 && (
        <MenuItem onClick={handleToggleOrder} sx={{py: 1, px: 2}}>
          <ListItemIcon sx={iconBtnSx}>
            {isReorderMode ? (
              <Check color="primary" sx={commonIconSx} />
            ) : (
              <Sort sx={commonIconSx} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={isReorderMode ? 'Сохранить порядок' : 'Изменить порядок'}
            slotProps={{primary: {fontSize: '0.85rem', color: '#efefef'}}}
          />
        </MenuItem>
      )}
    </Box>
  );
});

export default TagsListContent;
