import React, {FC, memo, useCallback} from 'react';

import {Close} from '@mui/icons-material';
import {Box, IconButton, Typography, alpha} from '@mui/material';

interface NewAttachmentChipProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}

const itemSx = {
  display: 'flex',
  alignItems: 'center',
  bgcolor: 'action.hover',
  pl: 1.5,
  pr: 0.5,
  borderRadius: '8px',
  border: '1px solid',
  borderColor: (theme: {palette: {primary: {main: string}}}) =>
    alpha(theme.palette.primary.main, 0.4),
  width: '100%',
  minWidth: 0,
  height: '40px',
  backgroundImage: (theme: {palette: {primary: {main: string}}}) =>
    `linear-gradient(${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.08)})`,
};

const textSx = {
  color: 'primary.main',
  flex: 1,
  minWidth: 0,
  fontSize: '0.85rem',
  fontWeight: 500,
};

const NewAttachmentChip: FC<NewAttachmentChipProps> = ({
  file,
  index,
  onRemove,
}: NewAttachmentChipProps) => {
  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);

  return (
    <Box sx={itemSx}>
      <Typography variant="body2" title={file.name} sx={textSx} noWrap>
        {file.name}
      </Typography>
      <IconButton
        size="small"
        onClick={handleRemove}
        sx={{ml: 0.5, p: 0.75, color: 'primary.main'}}
        aria-label={`Удалить ${file.name}`}
      >
        <Close sx={{fontSize: 20}} />
      </IconButton>
    </Box>
  );
};

export default memo(NewAttachmentChip);
