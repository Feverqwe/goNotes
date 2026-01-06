import React, {FC, useCallback, useMemo} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {IconButton, ListItemIcon, ListItemText, MenuItem, Typography} from '@mui/material';
import {AddCircleOutline, CheckCircle} from '@mui/icons-material';
import TagOrder from './TagOrder';

const listItemIconBaseSx = {minWidth: '32px !important'};
const hashTypographySx = {fontSize: 14, fontFamily: 'monospace'};
const iconSx = {fontSize: 18};

interface SortableTagItemProps {
  tag: string;
  isActive: boolean;
  isReordering: boolean;
  toggleTag: (tag: string) => void;
  setExclusiveTag: (tag: string) => void;
  index: number;
  totalCount: number;
  moveStep: (id: string, direction: 'up' | 'down') => void;
}

const SortableTagItem: FC<SortableTagItemProps> = ({
  tag,
  isActive,
  isReordering,
  toggleTag,
  setExclusiveTag,
  index,
  moveStep,
  totalCount,
}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: tag,
    disabled: !isReordering,
  });

  const handleMainClick = useCallback(() => {
    if (!isReordering) setExclusiveTag(tag);
  }, [isReordering, setExclusiveTag, tag]);

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isReordering) toggleTag(tag);
    },
    [isReordering, toggleTag, tag],
  );

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
        '& .add-tag-btn': {opacity: 1},
      },
      ...(isDragging && {
        bgcolor: 'rgba(144, 202, 249, 0.1) !important',
      }),
    }),
    [isActive, isDragging, isReordering],
  );

  const listItemIconSx = useMemo(
    () => ({...listItemIconBaseSx, color: isActive ? '#90caf9' : '#48484a'}),
    [isActive],
  );

  const hashStyles = useMemo(
    () => ({...hashTypographySx, fontWeight: isActive ? 700 : 400}),
    [isActive],
  );

  const listItemTextSlotProps = useMemo(
    () => ({
      primary: {
        fontSize: '0.85rem',
        color: isActive ? '#90caf9' : '#efefef',
        fontWeight: isActive ? 600 : 400,
      },
    }),
    [isActive],
  );

  const iconBtnSx = useMemo(
    () => ({
      opacity: isActive ? 1 : 0,
      transition: 'opacity 0.2s',
      color: isActive ? '#90caf9' : '#8e8e93',
      visibility: isReordering ? 'hidden' : 'visible',
    }),
    [isActive, isReordering],
  );

  return (
    <MenuItem
      ref={setNodeRef}
      style={dndStyle}
      onClick={handleMainClick}
      sx={menuItemSx}
      disableRipple
    >
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

      <IconButton className="add-tag-btn" size="small" onClick={handleToggleClick} sx={iconBtnSx}>
        {isActive ? <CheckCircle sx={iconSx} /> : <AddCircleOutline sx={iconSx} />}
      </IconButton>
    </MenuItem>
  );
};

export default SortableTagItem;
