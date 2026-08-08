import React, {FC, memo} from 'react';

import {Close, Edit} from '@mui/icons-material';
import {Box, IconButton, Theme, Typography, alpha} from '@mui/material';

const editHeaderSx = {
  px: 2,
  py: 0.5,
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

const editIconSx = {fontSize: 14, color: 'primary.main'};
const editTitleSx = {color: 'primary.main', fontWeight: 600};
const editCloseIconSx = {fontSize: 16, color: 'primary.main'};

interface EditingBannerProps {
  onCancel: () => void;
}

const EditingBanner: FC<EditingBannerProps> = ({onCancel}: EditingBannerProps) => (
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
);

export default memo(EditingBanner);
