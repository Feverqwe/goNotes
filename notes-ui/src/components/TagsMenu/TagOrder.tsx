import React, {FC, useMemo, useCallback} from 'react';
import {Box, IconButton, useMediaQuery, useTheme} from '@mui/material';
import {ArrowDownward, ArrowUpward, DragHandle} from '@mui/icons-material';
import {DraggableAttributes, DraggableSyntheticListeners} from '@dnd-kit/core';

const mobileControlsBoxSx = {display: 'flex', gap: 0.5};
const mobileArrowBtnSx = {color: '#90caf9', p: 0.5};
const dragHandleSx = {fontSize: 18};
const listItemIconBaseSx = {minWidth: '32px !important'};

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

  const containerSx = useMemo(
    () => ({
      ...listItemIconBaseSx,
      color: '#90caf9',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
    }),
    [],
  );

  if (isMobile) {
    return (
      <Box sx={mobileControlsBoxSx}>
        <IconButton
          size="small"
          disabled={index === 0}
          onClick={handleMoveUp}
          sx={mobileArrowBtnSx}
        >
          <ArrowUpward fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          disabled={index === totalCount - 1}
          onClick={handleMoveDown}
          sx={mobileArrowBtnSx}
        >
          <ArrowDownward fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={containerSx} {...attributes} {...listeners}>
      <DragHandle sx={dragHandleSx} />
    </Box>
  );
};

export default TagOrder;
