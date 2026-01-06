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

interface BatchDeleteDialogProps {
  deleteBatchDialogOpen: boolean;
  closeBatchDeleteDialog: () => void;
  selectedIds: number[];
  cancelSelectMode: () => void;
}

const BatchDeleteDialog: FC<BatchDeleteDialogProps> = ({
  deleteBatchDialogOpen,
  closeBatchDeleteDialog,
  selectedIds,
  cancelSelectMode,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();

  const batchDeleteMutation = useMutation({
    mutationFn: (params: BatchDeleteRequest) => api.messages.batchDelete(params),
    onSuccess: (_, {ids}) => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      showSnackbar(`Удалено сообщений: ${ids.length}`, 'info');
      cancelSelectMode();
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
      <DialogTitle>Удалить выбранные заметки?</DialogTitle>

      <DialogContent>
        <DialogContentText>
          Это действие нельзя отменить. <br />
          Все вложения будут стерты.
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={confirmBatchDelete} fullWidth variant="text" color="error">
          Удалить
        </Button>

        <Button onClick={closeBatchDeleteDialog} fullWidth variant="text">
          Отмена
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchDeleteDialog;
