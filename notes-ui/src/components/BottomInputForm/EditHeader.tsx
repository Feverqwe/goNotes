import React, {FC, memo} from 'react';
import {Box, IconButton, Typography} from '@mui/material';
import {Close, Edit} from '@mui/icons-material';

const editHeaderSx = {
  px: 2,
  py: 0.5,
  bgcolor: 'rgba(144, 202, 249, 0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

const editIconSx = {fontSize: 14, color: '#90caf9'};
const editTitleSx = {color: '#90caf9', fontWeight: 600};
const editCloseIconSx = {fontSize: 16, color: '#90caf9'};

interface EditHeaderProps {
  onCancel: () => void;
}

const EditHeader: FC<EditHeaderProps> = memo(({onCancel}: EditHeaderProps) => (
  <Box sx={editHeaderSx}>
    <Edit sx={editIconSx} />
    <Typography variant="caption" sx={editTitleSx}>
      РЕДАКТИРОВАНИЕ
    </Typography>
    <Box sx={{flexGrow: 1}} />
    <IconButton size="small" onClick={onCancel}>
      <Close sx={editCloseIconSx} />
    </IconButton>
  </Box>
));

export default EditHeader;
