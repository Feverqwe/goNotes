import React, {FC, useCallback} from 'react';
import {IconButton, ListItemIcon, useMediaQuery, useTheme} from '@mui/material';
import {ArrowDownward, ArrowUpward, DragHandle} from '@mui/icons-material';
import {DraggableAttributes, DraggableSyntheticListeners} from '@dnd-kit/core';

const mobileControlsBoxSx = {display: 'flex', gap: 0.5, ml: -0.5, mr: 2};
const mobileArrowBtnSx = {color: 'primary.main', fontSize: 14};
const dragHandleSx = {fontSize: 18};
const containerSx = {
  color: 'primary.main',
  cursor: 'grab',
  display: 'flex',
  alignItems: 'center',
};

interface TagOrderProps {
  tag: string;
  index: number;
  totalCount: number;
  moveStep: (id: string, direction: 'up' | 'down') => void;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

const TagOrder: FC<TagOrderProps> = ({tag, index, totalCount, moveStep, attributes, listeners}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveStep(tag, 'up');
    },
    [tag, moveStep],
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveStep(tag, 'down');
    },
    [tag, moveStep],
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

export default TagOrder;
