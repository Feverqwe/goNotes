import React, {FC, useCallback, useMemo} from 'react';

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import TagIcon from '@mui/icons-material/Tag';
import {ListItemButton, ListItemIcon, ListItemText} from '@mui/material';

import TagReorderControls from './TagReorderControls';

interface SortableTagNavigationItemProps {
  tag: string;
  isActive: boolean;
  isReordering: boolean;
  onTagClick: (tag: string) => void;
  index: number;
  totalCount: number;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const SortableTagNavigationItem: FC<SortableTagNavigationItemProps> = ({
  tag,
  isActive,
  isReordering,
  onTagClick,
  index,
  onMove,
  totalCount,
}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: tag,
    disabled: !isReordering,
  });

  const handleMainClick = useCallback(() => {
    if (!isReordering) onTagClick(tag);
  }, [isReordering, onTagClick, tag]);

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
      ...(isDragging
        ? {
            bgcolor: 'action.active',
          }
        : {}),
      '&:hover': {
        ...(isReordering
          ? {
              bgcolor: 'transparent',
            }
          : {}),
      },
    }),
    [isDragging, isReordering],
  );

  const listItemTextSlotProps = useMemo(
    () => ({
      primary: {
        sx: {
          fontSize: '0.85rem',
          color: isActive ? 'primary.main' : 'text.primary',
          fontWeight: isActive ? 600 : 400,
        },
      },
    }),
    [isActive],
  );

  const tagIconSx = useMemo(
    () => ({fontSize: '14px', color: isActive ? 'primary.main' : 'text.disabled'}),
    [isActive],
  );

  return (
    <ListItemButton
      selected={isActive}
      ref={setNodeRef}
      style={dndStyle}
      onClick={handleMainClick}
      sx={menuItemSx}
    >
      {!isReordering && (
        <ListItemIcon>
          <TagIcon sx={tagIconSx} />
        </ListItemIcon>
      )}
      {isReordering && (
        <TagReorderControls
          tag={tag}
          index={index}
          totalCount={totalCount}
          onMove={onMove}
          attributes={attributes}
          listeners={listeners}
        />
      )}
      <ListItemText primary={tag} slotProps={listItemTextSlotProps} />
    </ListItemButton>
  );
};

export default SortableTagNavigationItem;
