import React, {FC, useEffect, useMemo} from 'react';

import {Close, Done} from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';

const containerSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  px: 1,
};

const infoBoxSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
};

const titleTextSx = {
  color: 'primary.main',
  ml: 0.5,
};

const saveBtnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

interface NoteReorderBarProps {
  onCancel: () => void;
  onSave: () => void;
}

const NoteReorderBar: FC<NoteReorderBarProps> = ({onCancel, onSave}) => {
  const theme = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const paperSx = useMemo(
    () => ({
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      bgcolor: alpha(theme.palette.background.paper, 0.85),
      backdropFilter: 'blur(20px) saturate(180%)',
      backgroundImage: 'none',
      borderTop: '1px solid',
      borderColor: alpha(theme.palette.primary.main, 0.3),
      zIndex: 1200,
      animation: 'slideUp 0.2s ease-out',
    }),
    [theme.palette.background.paper, theme.palette.primary.main],
  );

  return (
    <Paper square elevation={0} sx={paperSx}>
      <Container maxWidth="sm" sx={containerSx}>
        <Box sx={infoBoxSx}>
          <IconButton onClick={onCancel} size="medium" sx={{color: 'text.secondary'}}>
            <Close />
          </IconButton>
          <Typography variant="body2" sx={titleTextSx}>
            Сортировка
          </Typography>
        </Box>
        <Button
          size="medium"
          variant="text"
          color="primary"
          startIcon={<Done />}
          sx={saveBtnSx}
          onClick={onSave}
        >
          Готово
        </Button>
      </Container>
    </Paper>
  );
};

export default NoteReorderBar;
