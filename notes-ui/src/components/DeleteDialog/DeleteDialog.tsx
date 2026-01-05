import React, {FC, useCallback, useContext} from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';

interface DeleteDialogProps {
  deleteDialogOpen: boolean;
  closeDeleteDialog: () => void;
  fetchMessages: (isInitial?: boolean) => Promise<void>;
  refMsgToDelete: React.RefObject<number | null>;
}

const DeleteDialog: FC<DeleteDialogProps> = ({
  deleteDialogOpen,
  closeDeleteDialog,
  fetchMessages,
  refMsgToDelete,
}) => {
  const showSnackbar = useContext(SnackCtx);

  // Сама функция удаления (обновленная)
  const confirmDelete = useCallback(async () => {
    const msgToDelete = refMsgToDelete.current;
    if (!msgToDelete) return;
    try {
      await api.messages.delete({id: msgToDelete});
      fetchMessages(true);
      showSnackbar('Заметка удалена', 'info');
    } catch (e) {
      showSnackbar('Ошибка при удалении', 'error');
    } finally {
      closeDeleteDialog();
    }
  }, [refMsgToDelete, fetchMessages, showSnackbar, closeDeleteDialog]);

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
