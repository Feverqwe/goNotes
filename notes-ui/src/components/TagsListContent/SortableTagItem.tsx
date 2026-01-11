import React, {FC, useCallback, useMemo} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {IconButton, ListItemButton, ListItemIcon, ListItemText} from '@mui/material';
import {AddCircleOutline, CheckCircle} from '@mui/icons-material';
import TagIcon from '@mui/icons-material/Tag';
import TagOrder from './TagOrder';

const iconSx = {fontSize: '18px'};

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
        '& .add-tag-btn': {opacity: 1},
      },
    }),
    [isDragging, isReordering],
  );

  const listItemTextSlotProps = useMemo(
    () => ({
      primary: {
        fontSize: '0.85rem',
        color: isActive ? 'primary.main' : 'text.primary',
        fontWeight: isActive ? 600 : 400,
      },
    }),
    [isActive],
  );

  const iconBtnSx = useMemo(
    () => ({
      opacity: isActive ? 1 : 0,
      transition: 'opacity 0.2s',
      color: isActive ? 'primary.main' : 'text.secondary',
      visibility: isReordering ? 'hidden' : 'visible',
    }),
    [isActive, isReordering],
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
    </ListItemButton>
  );
};

export default SortableTagItem;
