import React, {FC, memo, useCallback, useMemo} from 'react';
import {Box, IconButton, Typography} from '@mui/material';
import {Close, DeleteForever} from '@mui/icons-material';
import {Attachment} from '../../types';

interface ExistingAttachmentItemProps {
  att: Attachment;
  isDeleted: boolean;
  onToggle: (id: number) => void;
}

const ExistingAttachmentItem: FC<ExistingAttachmentItemProps> = memo(
  ({att, isDeleted, onToggle}: ExistingAttachmentItemProps) => {
    const filename = useMemo(() => att.file_path.split('_').slice(1).join('_'), [att.file_path]);

    const itemSx = useMemo(
      () => ({
        display: 'flex',
        alignItems: 'center',
        height: '42px',
        bgcolor: isDeleted ? 'rgba(255, 69, 58, 0.1)' : '#1c1c1e',
        pl: 2,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: isDeleted ? '#ff453a' : '#2c2c2e',
        opacity: isDeleted ? 0.6 : 1,
        minWidth: 'fit-content',
      }),
      [isDeleted],
    );

    const textSx = useMemo(
      () => ({
        color: isDeleted ? '#ff453a' : '#efefef',
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
        <IconButton onClick={handleToggle} sx={{ml: 0.5}}>
          {isDeleted ? (
            <Close sx={{fontSize: 22, color: '#ff453a'}} />
          ) : (
            <DeleteForever sx={{fontSize: 22, color: '#8e8e93'}} />
          )}
        </IconButton>
      </Box>
    );
  },
);

export default ExistingAttachmentItem;
