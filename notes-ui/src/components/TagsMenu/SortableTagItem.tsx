import React, {FC, useMemo} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {ArrowDownward, ArrowUpward, Check, DragHandle} from '@mui/icons-material';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: tag,
    disabled: !isReordering, // Отключаем логику DND, если режим выключен
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1400 : 'auto',
      opacity: isDragging ? 0.6 : 1,
      cursor: isReordering ? 'default' : 'pointer',
    }),
    [isDragging, isReordering, transform, transition],
  );

  return (
    <MenuItem
      ref={setNodeRef}
      style={style}
      // В режиме сортировки клик не должен срабатывать как фильтр
      onClick={() => !isReordering && toggleTag(tag)}
      sx={{
        py: 0.8,
        px: 2,
        bgcolor: isActive ? 'rgba(144, 202, 249, 0.05)' : 'transparent',
        '&:hover': {
          bgcolor: isReordering ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
        },
        // Подсветка при перетаскивании
        ...(isDragging && {
          bgcolor: 'rgba(144, 202, 249, 0.1) !important',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }),
      }}
    >
      <ListItemIcon
        // В режиме сортировки иконка становится "ручкой" для захвата
        {...(isReordering ? {...attributes, ...listeners} : {})}
        sx={{
          minWidth: '32px !important',
          color: isReordering ? '#90caf9' : isActive ? '#90caf9' : '#48484a',
          cursor: isReordering ? 'grab' : 'inherit',
          '&:active': {cursor: isReordering ? 'grabbing' : 'inherit'},
        }}
      >
        {isReordering && !isMobile ? (
          <DragHandle sx={{fontSize: 18}} />
        ) : (
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: isActive ? 700 : 400,
              fontFamily: 'monospace',
            }}
          >
            #
          </Typography>
        )}
      </ListItemIcon>

      <ListItemText
        primary={tag}
        slotProps={{
          primary: {
            fontSize: '0.85rem',
            color: isActive ? '#fff' : isReordering ? '#efefef' : '#8e8e93',
            fontWeight: isActive ? 600 : 400,
          },
        }}
      />

      {isReordering && isMobile && (
        <Box sx={{display: 'flex', gap: 0.5}}>
          <IconButton
            size="small"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              moveStep(tag, 'up');
            }}
            sx={{color: '#90caf9', p: 0.5}}
          >
            <ArrowUpward fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={index === totalCount - 1}
            onClick={(e) => {
              e.stopPropagation();
              moveStep(tag, 'down');
            }}
            sx={{color: '#90caf9', p: 0.5}}
          >
            <ArrowDownward fontSize="small" />
          </IconButton>
        </Box>
      )}

      {isActive && !isReordering && <Check sx={{fontSize: 14, color: '#90caf9'}} />}
    </MenuItem>
  );
};

export default SortableTagItem;
