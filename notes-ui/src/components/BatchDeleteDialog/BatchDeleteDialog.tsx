import React, {FC} from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface BatchDeleteDialogProps {
  deleteBatchDialogOpen: boolean;
  closeBatchDeleteDialog: () => void;
  selectedIds: number[];
  confirmBatchDelete: () => void;
}

const BatchDeleteDialog: FC<BatchDeleteDialogProps> = ({
  deleteBatchDialogOpen,
  closeBatchDeleteDialog,
  selectedIds,
  confirmBatchDelete,
}) => {
  return (
    <Dialog open={deleteBatchDialogOpen} onClose={closeBatchDeleteDialog} transitionDuration={250}>
      <DialogTitle
        sx={{
          color: '#fff',
          fontWeight: 700,
          textAlign: 'center',
          fontSize: '1.1rem',
          pb: 1,
        }}
      >
        Удалить {selectedIds.length} сообщений?
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
