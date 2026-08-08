import React, {FC, useCallback, useMemo} from 'react';

import {DraggableAttributes, DraggableSyntheticListeners} from '@dnd-kit/core';
import {ArrowDownward, ArrowUpward, DragHandle} from '@mui/icons-material';
import {Box, IconButton, useMediaQuery, useTheme} from '@mui/material';

const reorderIconSx = {cursor: 'grab', color: 'primary.main', backdropFilter: 'blur(4px)'};
const reorderArrowSx = {color: 'primary.main', backdropFilter: 'blur(4px)'};

interface NoteOrderProps {
  id: number;
  index: number;
  totalCount: number;
  onMove?: (id: number, direction: 'up' | 'down') => void;
  attributes: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
}

const NoteOrder: FC<NoteOrderProps> = ({index, id, onMove, totalCount, attributes, listeners}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleReorderUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMove?.(id, 'up');
    },
    [onMove, id],
  );

  const handleReorderDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMove?.(id, 'down');
    },
    [onMove, id],
  );

  const reorderBoxSx = useMemo(
    () => ({
      position: 'absolute',
      top: 4,
      right: 4,
      display: 'flex',
      gap: 0.5,
      zIndex: 10,
      bgcolor: 'transparent',
      borderRadius: '8px',
      p: 0.2,
    }),
    [],
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
