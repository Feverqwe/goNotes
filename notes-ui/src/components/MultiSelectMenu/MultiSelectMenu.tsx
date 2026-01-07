import React, {FC, useCallback, useContext} from 'react';
import {Box, Button, Container, IconButton, Paper, Typography} from '@mui/material';
import {Archive, Close, Delete, Unarchive} from '@mui/icons-material'; // Добавьте импорты
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {api} from '../../tools/api';
import {SnackCtx} from '../../ctx/SnackCtx';

const paperSx = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  bgcolor: 'rgba(18, 18, 18, 0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  backgroundImage: 'none',
  borderTop: '1px solid rgba(144, 202, 249, 0.3)',
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

const countTextSx = {
  color: '#fff',
  ml: 0.5,
};

const btnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  '&:hover': {
    bgcolor: 'rgba(255, 69, 58, 0.1)',
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
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const isActionDisabled = selectedIds.length === 0;

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

        <Box sx={btnCtrSx}>
          <Button
            size="medium"
            variant="text"
            disabled={isActionDisabled}
            startIcon={showArchived ? <Unarchive /> : <Archive />}
            onClick={handleArchive}
            sx={btnSx}
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
