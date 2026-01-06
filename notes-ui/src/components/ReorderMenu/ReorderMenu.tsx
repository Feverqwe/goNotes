import React, {FC} from 'react';
import {Box, Button, Container, IconButton, Paper, Typography} from '@mui/material';
import {Close, Done} from '@mui/icons-material';

const paperSx = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  bgcolor: 'rgba(18, 18, 18, 0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  backgroundImage: 'none',
  borderTop: '1px solid rgba(144, 202, 249, 0.5)',
  zIndex: 1200,
  animation: 'slideUp 0.2s ease-out',
};

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
  pt: 0.25,
  pb: 1,
};

const closeBtnSx = {color: '#8e8e93'};

const titleTextSx = {
  color: '#90caf9',
  fontSize: '0.85rem',
  ml: 0.5,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const saveBtnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  fontSize: '0.85rem',
  '&:hover': {
    bgcolor: 'rgba(144, 202, 249, 0.1)',
  },
};

interface ReorderMenuProps {
  cancelReorderMode: () => void;
  saveOrder: () => void;
}

const ReorderMenu: FC<ReorderMenuProps> = ({cancelReorderMode, saveOrder}) => {
  return (
    <Paper square elevation={0} sx={paperSx}>
      <Container maxWidth="sm" sx={containerSx}>
        <Box sx={infoBoxSx}>
          <IconButton onClick={cancelReorderMode} size="medium" sx={closeBtnSx}>
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
          onClick={saveOrder}
        >
          Готово
        </Button>
      </Container>
    </Paper>
  );
};

export default ReorderMenu;
