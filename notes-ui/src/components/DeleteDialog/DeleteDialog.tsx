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
import {DeleteMessageRequest} from '../../tools/types';

interface DeleteDialogProps {
  deleteDialogOpen: boolean;
  closeDeleteDialog: () => void;
  refMsgToDelete: React.RefObject<number | null>;
}

const DeleteDialog: FC<DeleteDialogProps> = ({
  deleteDialogOpen,
  closeDeleteDialog,
  refMsgToDelete,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (params: DeleteMessageRequest) => api.messages.delete(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      showSnackbar('Заметка удалена', 'info');
      closeDeleteDialog();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при удалении', 'error');
      closeDeleteDialog();
    },
  });

  const confirmDelete = useCallback(() => {
    const msgToDelete = refMsgToDelete.current;
    if (!msgToDelete) return;
    deleteMutation.mutate({id: msgToDelete});
  }, [refMsgToDelete, deleteMutation]);

  return (
    <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} transitionDuration={250}>
      <DialogTitle>Удалить заметку?</DialogTitle>

      <DialogContent>
        <DialogContentText>
          Это действие нельзя отменить. <br />
          Все вложения будут стерты.
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={confirmDelete} fullWidth variant="text" color="error">
          Удалить
        </Button>

        <Button onClick={closeDeleteDialog} fullWidth variant="text">
          Отмена
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;
