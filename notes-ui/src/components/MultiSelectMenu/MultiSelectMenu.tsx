import React, {FC} from 'react';
import {Box, Button, Container, IconButton, Paper, Typography} from '@mui/material';
import {Close, Delete} from '@mui/icons-material';

const paperSx = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  bgcolor: 'rgba(18, 18, 18, 0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  backgroundImage: 'none',
  borderTop: '1px solid rgba(144, 202, 249, 0.3)',
  zIndex: 1100,
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

const countTextSx = {
  color: '#fff',
  ml: 0.5,
};

const deleteBtnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  '&:hover': {
    bgcolor: 'rgba(255, 69, 58, 0.1)',
  },
};

interface SelectMenuProps {
  cancelSelectMode: () => void;
  selectedIds: number[];
  askBatchDeleteConfirmation: () => void;
}

const MultiSelectMenu: FC<SelectMenuProps> = ({
  cancelSelectMode,
  selectedIds,
  askBatchDeleteConfirmation,
}) => {
  const isDeleteDisabled = selectedIds.length === 0;

  return (
    <Paper square elevation={0} sx={paperSx}>
      <Container maxWidth="sm" sx={containerSx}>
        <Box sx={infoBoxSx}>
          <IconButton onClick={cancelSelectMode} size="medium" sx={closeBtnSx}>
            <Close />
          </IconButton>
          <Typography variant="body2" sx={countTextSx}>
            Выбрано: {selectedIds.length}
          </Typography>
        </Box>

        <Button
          size="medium"
          variant="text"
          color="error"
          disabled={isDeleteDisabled}
          startIcon={<Delete />}
          sx={deleteBtnSx}
          onClick={askBatchDeleteConfirmation}
        >
          Удалить
        </Button>
      </Container>
    </Paper>
  );
};

export default MultiSelectMenu;
