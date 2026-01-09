import React, {FC, memo, useCallback, useMemo} from 'react';
import {Box, IconButton, Typography, alpha, useTheme} from '@mui/material';
import {Close, DeleteForever} from '@mui/icons-material';
import {Attachment} from '../../types';

interface ExistingAttachmentItemProps {
  att: Attachment;
  isDeleted: boolean;
  onToggle: (id: number) => void;
}

const ExistingAttachmentItem: FC<ExistingAttachmentItemProps> = memo(
  ({att, isDeleted, onToggle}: ExistingAttachmentItemProps) => {
    const theme = useTheme();
    const filename = useMemo(() => att.file_path.split('_').slice(1).join('_'), [att.file_path]);

    const itemSx = useMemo(
      () => ({
        display: 'flex',
        alignItems: 'center',
        height: '42px',
        // Используем error.main с прозрачностью для удаленных и background.paper для обычных
        bgcolor: isDeleted ? alpha(theme.palette.error.main, 0.1) : 'action.hover',
        pl: 2,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: isDeleted ? 'error.main' : 'divider',
        opacity: isDeleted ? 0.6 : 1,
        minWidth: 'fit-content',
        transition: theme.transitions.create(['background-color', 'border-color', 'opacity']),
      }),
      [isDeleted, theme],
    );

    const textSx = useMemo(
      () => ({
        color: isDeleted ? 'error.main' : 'text.primary',
        maxWidth: 150,
        fontSize: '0.85rem',
      }),
      [isDeleted],
    );

    const handleToggle = useCallback(() => onToggle(att.id), [onToggle, att.id]);

    return (
      <Box sx={itemSx}>
        <Typography variant="body2" title={filename} sx={textSx} noWrap>
          {filename}
        </Typography>
        <IconButton onClick={handleToggle} sx={{ml: 0.5}} size="small">
          {isDeleted ? (
            <Close sx={{fontSize: 22, color: 'error.main'}} />
          ) : (
            <DeleteForever sx={{fontSize: 22, color: 'text.secondary'}} />
          )}
        </IconButton>
      </Box>
    );
  },
);

export default ExistingAttachmentItem;
