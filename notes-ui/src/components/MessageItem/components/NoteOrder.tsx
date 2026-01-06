import React, {FC, useCallback, useMemo} from 'react';
import {Box, IconButton, useMediaQuery, useTheme} from '@mui/material';
import {ArrowDownward, ArrowUpward, DragHandle} from '@mui/icons-material';
import {DraggableAttributes, DraggableSyntheticListeners} from '@dnd-kit/core';

const reorderIconSx = {cursor: 'grab', color: '#90caf9', p: 1};
const reorderArrowSx = {color: '#90caf9'};

interface NoteOrderProps {
  id: number;
  index: number;
  totalCount: number;
  moveStep?: (id: number, direction: 'up' | 'down') => void;
  attributes: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
}

const NoteOrder: FC<NoteOrderProps> = ({
  index,
  id,
  moveStep,
  totalCount,
  attributes,
  listeners,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleReorderUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveStep?.(id, 'up');
    },
    [moveStep, id],
  );

  const handleReorderDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveStep?.(id, 'down');
    },
    [moveStep, id],
  );

  const reorderBoxSx = useMemo(
    () => ({
      position: 'absolute',
      top: 4,
      right: 4,
      display: 'flex',
      gap: 0.5,
      zIndex: 10,

      bgcolor: isMobile ? 'rgba(18, 18, 18, 0.6)' : 'transparent',
      borderRadius: '8px',
      p: 0.2,
    }),
    [isMobile],
  );

  return (
    <Box sx={reorderBoxSx}>
      {isMobile ? (
        <>
          <IconButton
            size="medium"
            disabled={index === 0}
            onClick={handleReorderUp}
            sx={reorderArrowSx}
          >
            <ArrowUpward fontSize="small" />
          </IconButton>
          <IconButton
            size="medium"
            disabled={index === totalCount - 1}
            onClick={handleReorderDown}
            sx={reorderArrowSx}
          >
            <ArrowDownward fontSize="small" />
          </IconButton>
        </>
      ) : (
        <IconButton {...attributes} {...listeners} size="small" sx={reorderIconSx}>
          <DragHandle />
        </IconButton>
      )}
    </Box>
  );
};

export default NoteOrder;
