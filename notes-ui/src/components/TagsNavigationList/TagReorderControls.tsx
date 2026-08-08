import React, {FC, useCallback} from 'react';

import {DraggableAttributes, DraggableSyntheticListeners} from '@dnd-kit/core';
import {ArrowDownward, ArrowUpward, DragHandle} from '@mui/icons-material';
import {IconButton, ListItemIcon, useMediaQuery, useTheme} from '@mui/material';

const mobileControlsBoxSx = {display: 'flex', gap: 0.5, ml: -0.5, mr: 2};
const mobileArrowBtnSx = {color: 'primary.main', fontSize: 14};
const dragHandleSx = {fontSize: 18};
const containerSx = {
  color: 'primary.main',
  cursor: 'grab',
  display: 'flex',
  alignItems: 'center',
};

interface TagReorderControlsProps {
  tag: string;
  index: number;
  totalCount: number;
  onMove: (id: string, direction: 'up' | 'down') => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

const TagReorderControls: FC<TagReorderControlsProps> = ({
  tag,
  index,
  totalCount,
  onMove,
  attributes,
  listeners,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMove(tag, 'up');
    },
    [tag, onMove],
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMove(tag, 'down');
    },
    [tag, onMove],
  );

  if (isMobile) {
    return (
      <ListItemIcon sx={mobileControlsBoxSx}>
        <IconButton
          size="small"
          disabled={index === 0}
          onClick={handleMoveUp}
          sx={mobileArrowBtnSx}
        >
          <ArrowUpward sx={dragHandleSx} />
        </IconButton>
        <IconButton
          size="small"
          disabled={index === totalCount - 1}
          onClick={handleMoveDown}
          sx={mobileArrowBtnSx}
        >
          <ArrowDownward sx={dragHandleSx} />
        </IconButton>
      </ListItemIcon>
    );
  }

  return (
    <ListItemIcon sx={containerSx} {...attributes} {...listeners}>
      <DragHandle sx={dragHandleSx} />
    </ListItemIcon>
  );
};

export default TagReorderControls;
