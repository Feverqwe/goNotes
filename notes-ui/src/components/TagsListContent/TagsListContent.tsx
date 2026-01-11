import React, {FC, memo} from 'react';
import {Box, Divider, ListItemButton, ListItemIcon, ListItemText} from '@mui/material';
import {Archive, Check, Sort} from '@mui/icons-material';
import {DndContext, DragEndEvent} from '@dnd-kit/core';
import {SortableContext} from '@dnd-kit/sortable';
import SortableTagItem from './SortableTagItem';

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
  setExclusiveTag: (tag: string) => void;
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
    setExclusiveTag,
  } = props;

  return (
    <Box>
      <ListItemButton selected={showArchived} onClick={handleToggleArchive}>
        <ListItemIcon>
          <Archive sx={{fontSize: 18, color: showArchived ? 'primary.main' : 'text.secondary'}} />
        </ListItemIcon>
        <ListItemText
          primary="Архив"
          slotProps={{
            primary: {
              fontSize: '0.85rem',
            },
          }}
        />
      </ListItemButton>

      {displayTags.length > 0 && <Divider />}

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
                setExclusiveTag={setExclusiveTag}
              />
            ))}
          </SortableContext>
        </DndContext>
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
                fontSize: '0.85rem',
              },
            }}
          />
        </ListItemButton>
      )}
    </Box>
  );
});

export default TagsListContent;
