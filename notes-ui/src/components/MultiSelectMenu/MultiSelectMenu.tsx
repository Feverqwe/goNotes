import React, {FC} from 'react';
import {Box, Button, Container, IconButton, Paper, Typography} from '@mui/material';
// MUI Icons
import {Close, Delete} from '@mui/icons-material';

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
  return (
    <Paper
      square
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#1c1c1e',
        borderTop: '1px solid #90caf9',
        zIndex: 1100,
        p: 1,
        animation: 'slideUp 0.3s ease',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
      >
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
          <IconButton onClick={cancelSelectMode} color="inherit">
            <Close />
          </IconButton>
          <Typography variant="body1" sx={{fontWeight: 'bold'}}>
            Выбрано: {selectedIds.length}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="error"
          disabled={selectedIds.length === 0}
          startIcon={<Delete />}
          onClick={askBatchDeleteConfirmation}
          sx={{borderRadius: '12px', textTransform: 'none'}}
        >
          Удалить
        </Button>
      </Container>
    </Paper>
  );
};

export default MultiSelectMenu;
