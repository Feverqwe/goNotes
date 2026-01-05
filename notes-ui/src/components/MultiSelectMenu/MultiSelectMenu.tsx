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
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'rgba(18, 18, 18, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        backgroundImage: 'none',
        borderTop: '1px solid rgba(144, 202, 249, 0.3)', // Сделали границу тоньше и прозрачнее
        zIndex: 1100,
        animation: 'slideUp 0.2s ease-out',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1,
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, pt: 0.25, pb: 1}}>
          <IconButton
            onClick={cancelSelectMode}
            size="medium" // Сделали кнопку закрытия компактнее
            sx={{color: '#8e8e93'}}
          >
            <Close />
          </IconButton>
          <Typography
            variant="body2" // Перешли на более компактный вариант текста
            sx={{
              color: '#fff',
              ml: 0.5,
            }}
          >
            Выбрано: {selectedIds.length}
          </Typography>
        </Box>

        <Button
          size="medium"
          variant="text" // Заменили contained на text для снижения визуального веса
          color="error"
          disabled={selectedIds.length === 0}
          startIcon={<Delete />}
          sx={{
            borderRadius: '6px',
            textTransform: 'none',
            // Убрали заливку, оставили только текст и иконку
            '&:hover': {
              bgcolor: 'rgba(255, 69, 58, 0.1)',
            },
          }}
          onClick={askBatchDeleteConfirmation}
        >
          Удалить
        </Button>
      </Container>
    </Paper>
  );
};

export default MultiSelectMenu;
