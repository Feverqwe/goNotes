import React, {FC, useMemo, useCallback} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ListItemIcon, ListItemText, MenuItem, Typography} from '@mui/material';
import {Check} from '@mui/icons-material';
import TagOrder from './TagOrder';

const listItemIconBaseSx = {minWidth: '32px !important'};
const hashTypographySx = {fontSize: 14, fontFamily: 'monospace'};
const checkIconSx = {fontSize: 14, color: '#90caf9'};

interface SortableTagItemProps {
  tag: string;
  isActive: boolean;
  isReordering: boolean;
  toggleTag: (tag: string) => void;
  index: number;
  totalCount: number;
  moveStep: (id: string, direction: 'up' | 'down') => void;
}

const SortableTagItem: FC<SortableTagItemProps> = ({
  tag,
  isActive,
  isReordering,
  toggleTag,
  index,
  moveStep,
  totalCount,
}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: tag,
    disabled: !isReordering,
  });

  const handleToggle = useCallback(() => {
    if (!isReordering) toggleTag(tag);
  }, [isReordering, toggleTag, tag]);

  const dndStyle = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1400 : 'auto',
      opacity: isDragging ? 0.6 : 1,
      cursor: isReordering ? 'default' : 'pointer',
    }),
    [isDragging, isReordering, transform, transition],
  );

  const menuItemSx = useMemo(
    () => ({
      py: 0.8,
      px: 2,
      bgcolor: isActive ? 'rgba(144, 202, 249, 0.05)' : 'transparent',
      '&:hover': {
        bgcolor: isReordering ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
      },
      ...(isDragging && {
        bgcolor: 'rgba(144, 202, 249, 0.1) !important',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }),
    }),
    [isActive, isReordering, isDragging],
  );

  const listItemIconSx = useMemo(
    () => ({
      ...listItemIconBaseSx,
      color: isActive ? '#90caf9' : '#48484a',
    }),
    [isActive],
  );

  const hashStyles = useMemo(
    () => ({
      ...hashTypographySx,
      fontWeight: isActive ? 700 : 400,
    }),
    [isActive],
  );

  const listItemTextSlotProps = useMemo(
    () => ({
      primary: {
        fontSize: '0.85rem',
        color: isActive ? '#fff' : isReordering ? '#efefef' : '#8e8e93',
        fontWeight: isActive ? 600 : 400,
      },
    }),
    [isActive, isReordering],
  );

  return (
    <MenuItem ref={setNodeRef} style={dndStyle} onClick={handleToggle} sx={menuItemSx}>
      {!isReordering && (
        <ListItemIcon sx={listItemIconSx}>
          <Typography sx={hashStyles}>#</Typography>
        </ListItemIcon>
      )}

      {isReordering && (
        <TagOrder
          tag={tag}
          index={index}
          totalCount={totalCount}
          moveStep={moveStep}
          attributes={attributes}
          listeners={listeners}
        />
      )}

      <ListItemText primary={tag} slotProps={listItemTextSlotProps} />

      {isActive && !isReordering && <Check sx={checkIconSx} />}
    </MenuItem>
  );
};

export default SortableTagItem;
