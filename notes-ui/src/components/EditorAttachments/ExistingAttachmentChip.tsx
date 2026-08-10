import React, {FC, memo, useCallback, useMemo} from 'react';

import {DeleteOutlined, Undo} from '@mui/icons-material';
import {Box, IconButton, Typography, alpha, useTheme} from '@mui/material';

import {Attachment} from '../../types';

interface ExistingAttachmentChipProps {
  attachment: Attachment;
  isDeleted: boolean;
  onToggle: (id: number) => void;
}

const ExistingAttachmentChip: FC<ExistingAttachmentChipProps> = ({
  attachment,
  isDeleted,
  onToggle,
}: ExistingAttachmentChipProps) => {
  const theme = useTheme();
  const filename = useMemo(
    () => attachment.file_path.split('_').slice(1).join('_'),
    [attachment.file_path],
  );

  const itemSx = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      height: '40px',
      bgcolor: isDeleted ? alpha(theme.palette.error.main, 0.12) : 'action.hover',
      pl: 1.5,
      pr: 0.5,
      borderRadius: '8px',
      border: '1px solid',
      borderColor: isDeleted
        ? alpha(theme.palette.error.main, 0.45)
        : alpha(theme.palette.text.primary, 0.12),
      opacity: isDeleted ? 0.75 : 1,
      width: '100%',
      minWidth: 0,
      transition: theme.transitions.create(['background-color', 'border-color', 'opacity']),
    }),
    [isDeleted, theme],
  );

  const textSx = useMemo(
    () => ({
      color: isDeleted ? 'error.main' : 'text.primary',
      flex: 1,
      minWidth: 0,
      fontSize: '0.85rem',
      textDecoration: isDeleted ? 'line-through' : 'none',
    }),
    [isDeleted],
  );

  const handleToggle = useCallback(() => onToggle(attachment.id), [onToggle, attachment.id]);

  return (
    <Box sx={itemSx}>
      <Typography variant="body2" title={filename} sx={textSx} noWrap>
        {filename}
      </Typography>
      <IconButton
        onClick={handleToggle}
        sx={{ml: 0.5, p: 0.75}}
        size="small"
        aria-label={isDeleted ? `Восстановить ${filename}` : `Удалить ${filename}`}
      >
        {isDeleted ? (
          <Undo sx={{fontSize: 20, color: 'error.main'}} />
        ) : (
          <DeleteOutlined sx={{fontSize: 20, color: 'text.secondary'}} />
        )}
      </IconButton>
    </Box>
  );
};
export default memo(ExistingAttachmentChip);
