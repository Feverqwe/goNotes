import React, {FC} from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface DeleteDialogProps {
  deleteDialogOpen: boolean;
  closeDeleteDialog: () => void;
  confirmDelete: () => void;
}

const DeleteDialog: FC<DeleteDialogProps> = ({
  deleteDialogOpen,
  closeDeleteDialog,
  confirmDelete,
}) => {
  return (
    <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} transitionDuration={250}>
      <DialogTitle
        sx={{
          color: '#fff',
          fontWeight: 700,
          textAlign: 'center',
          fontSize: '1.1rem',
          pb: 1,
        }}
      >
        Удалить заметку?
      </DialogTitle>

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
