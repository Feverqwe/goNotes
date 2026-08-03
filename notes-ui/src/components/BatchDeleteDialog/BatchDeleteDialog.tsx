import React, {FC, useCallback, useContext} from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {BatchDeleteRequest} from '../../tools/types';

const btnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

interface BatchDeleteDialogProps {
  deleteBatchDialogOpen: boolean;
  closeBatchDeleteDialog: () => void;
  selectedIds: number[];
  cancelSelectMode: () => void;
  permanent: boolean;
}

const BatchDeleteDialog: FC<BatchDeleteDialogProps> = ({
  deleteBatchDialogOpen,
  closeBatchDeleteDialog,
  selectedIds,
  cancelSelectMode,
  permanent,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();

  const batchDeleteMutation = useMutation({
    mutationFn: (params: BatchDeleteRequest) => api.messages.batchDelete(params),
    onSuccess: (_, {ids}) => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      cancelSelectMode();
      closeBatchDeleteDialog();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при массовом удалении', 'error');
    },
  });

  const confirmBatchDelete = useCallback(() => {
    batchDeleteMutation.mutate({ids: selectedIds});
  }, [batchDeleteMutation, selectedIds]);

  return (
    <Dialog open={deleteBatchDialogOpen} onClose={closeBatchDeleteDialog} transitionDuration={250}>
      <DialogTitle>
        {permanent ? 'Удалить выбранные заметки навсегда?' : 'Переместить заметки в корзину?'}
      </DialogTitle>

      <DialogContent>
        <DialogContentText>
          {permanent ? (
            <>
              Это действие нельзя отменить. <br />
              Все вложения будут стерты.
            </>
          ) : (
            'Заметки можно будет восстановить из корзины.'
          )}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={confirmBatchDelete} fullWidth variant="text" color="error" sx={btnSx}>
          {permanent ? 'Удалить навсегда' : 'В корзину'}
        </Button>

        <Button onClick={closeBatchDeleteDialog} fullWidth variant="text" sx={btnSx}>
          Отмена
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchDeleteDialog;
