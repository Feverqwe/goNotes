import React, {FC, useCallback, useContext, useEffect, useMemo} from 'react';
import {
  alpha,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import {Archive, Close, Delete, Unarchive} from '@mui/icons-material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {api} from '../../tools/api';
import {SnackCtx} from '../../ctx/SnackCtx';

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

const countTextSx = {
  color: 'text.primary', // Заменено с #fff
  ml: 0.5,
};

const btnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

const btnCtrSx = {display: 'flex', gap: 1};

interface SelectMenuProps {
  cancelSelectMode: () => void;
  selectedIds: number[];
  askBatchDeleteConfirmation: () => void;
  showArchived: boolean;
}

const MultiSelectMenu: FC<SelectMenuProps> = ({
  cancelSelectMode,
  selectedIds,
  askBatchDeleteConfirmation,
  showArchived,
}) => {
  const theme = useTheme();
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const isActionDisabled = selectedIds.length === 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelSelectMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelSelectMode]);

  const batchArchiveMutation = useMutation({
    mutationFn: (archive: number) => api.messages.batchArchive({ids: selectedIds, archive}),
    onSuccess: (_, archive) => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      showSnackbar(archive ? 'Заметки архивированы' : 'Заметки восстановлены', 'success');
      cancelSelectMode();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка действия', 'error');
    },
  });

  const handleArchive = useCallback(() => {
    batchArchiveMutation.mutate(showArchived ? 0 : 1);
  }, [batchArchiveMutation, showArchived]);

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
          <IconButton onClick={cancelSelectMode} size="medium" sx={{color: 'text.secondary'}}>
            <Close />
          </IconButton>
          <Typography variant="body2" sx={countTextSx}>
            Выбрано: {selectedIds.length}
          </Typography>
        </Box>
        <Box sx={btnCtrSx}>
          <Button
            size="medium"
            variant="text"
            disabled={isActionDisabled}
            startIcon={showArchived ? <Unarchive /> : <Archive />}
            onClick={handleArchive}
            sx={{...btnSx, color: 'primary.main'}}
          >
            {showArchived ? 'Восстановить' : 'В архив'}
          </Button>
          <Button
            size="medium"
            variant="text"
            color="error"
            disabled={isActionDisabled}
            startIcon={<Delete />}
            sx={btnSx}
            onClick={askBatchDeleteConfirmation}
          >
            Удалить
          </Button>
        </Box>
      </Container>
    </Paper>
  );
};

export default MultiSelectMenu;
