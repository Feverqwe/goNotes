import React, {FC, memo} from 'react';
import {Box, IconButton, Typography, alpha, Theme} from '@mui/material';
import {Close, Edit} from '@mui/icons-material';

const editHeaderSx = {
  px: 2,
  py: 0.5,
  // Используем основной цвет темы с прозрачностью 0.1 для подложки
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

const editIconSx = {fontSize: 14, color: 'primary.main'}; // Заменено с #90caf9
const editTitleSx = {color: 'primary.main', fontWeight: 600}; // Заменено с #90caf9
const editCloseIconSx = {fontSize: 16, color: 'primary.main'}; // Заменено с #90caf9

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
