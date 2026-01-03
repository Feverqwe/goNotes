import React, {FC, useCallback, useContext} from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import axios from 'axios';
import {API_BASE} from '../../constants';
import {SnackCtx} from '../../ctx/SnackCtx';

interface BatchDeleteDialogProps {
  deleteBatchDialogOpen: boolean;
  closeBatchDeleteDialog: () => void;
  selectedIds: number[];
  fetchMessages: (isInitial?: boolean) => Promise<void>;
  cancelSelectMode: () => void;
}

const BatchDeleteDialog: FC<BatchDeleteDialogProps> = ({
  deleteBatchDialogOpen,
  closeBatchDeleteDialog,
  selectedIds,
  fetchMessages,
  cancelSelectMode,
}) => {
  const showSnackbar = useContext(SnackCtx);

  const confirmBatchDelete = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/messages/batch-delete`, {ids: selectedIds});
      fetchMessages(true);
      showSnackbar(`Удалено сообщений: ${selectedIds.length}`, 'info');
      cancelSelectMode();
    } catch (e) {
      showSnackbar('Ошибка при массовом удалении', 'error');
    } finally {
      closeBatchDeleteDialog();
    }
  }, [selectedIds, fetchMessages, showSnackbar, cancelSelectMode, closeBatchDeleteDialog]);

  return (
    <Dialog open={deleteBatchDialogOpen} onClose={closeBatchDeleteDialog} transitionDuration={250}>
      <DialogTitle>
        Удалить выбранные заметки?
      </DialogTitle>

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
