import React, {FC, memo, useCallback, useMemo} from 'react';

import {Close, DeleteForever} from '@mui/icons-material';
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
      height: '42px',
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

  const handleToggle = useCallback(() => onToggle(attachment.id), [onToggle, attachment.id]);

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
};
export default memo(ExistingAttachmentChip);
