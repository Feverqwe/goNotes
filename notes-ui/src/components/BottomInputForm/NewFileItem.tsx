import React, {FC, memo, useCallback, useMemo} from 'react';
import {Box, IconButton, Typography, alpha, useTheme} from '@mui/material';
import {Close} from '@mui/icons-material';

interface NewFileItemProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}

const NewFileItem: FC<NewFileItemProps> = memo(({file, index, onRemove}: NewFileItemProps) => {
  const theme = useTheme();
  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);

  const itemSx = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      bgcolor: 'action.hover', // Вместо #1c1c1e
      pl: 2,
      pr: 0.5,
      py: 0.5,
      borderRadius: '8px',
      border: '1px solid',
      borderColor: 'primary.main', // Вместо #90caf9
      minWidth: 'fit-content',
      height: '42px',
      // Добавляем легкую подсветку фона основным цветом
      backgroundImage: `linear-gradient(${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.05)})`,
    }),
    [theme],
  );

  const textSx = useMemo(
    () => ({
      color: 'primary.main', // Вместо #90caf9
      maxWidth: 150,
      fontSize: '0.9rem',
      fontWeight: 500,
    }),
    [],
  );

  return (
    <Box sx={itemSx}>
      <Typography variant="body2" title={file.name} sx={textSx} noWrap>
        {file.name}
      </Typography>
      <IconButton size="medium" onClick={handleRemove} sx={{ml: 1, color: 'primary.main'}}>
        <Close sx={{fontSize: 20}} />
      </IconButton>
    </Box>
  );
});

export default NewFileItem;
