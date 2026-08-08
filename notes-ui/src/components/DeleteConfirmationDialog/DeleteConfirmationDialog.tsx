import React, {FC, ReactNode} from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

const buttonSx = {
  borderRadius: '6px',
  textTransform: 'none',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmationDialog: FC<DeleteConfirmationDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}) => (
  <Dialog open={open} onClose={loading ? undefined : onClose} transitionDuration={250}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{description}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button
        onClick={onConfirm}
        loading={loading}
        fullWidth
        variant="text"
        color="error"
        sx={buttonSx}
      >
        {confirmLabel}
      </Button>
      <Button onClick={onClose} disabled={loading} fullWidth variant="text" sx={buttonSx}>
        Отмена
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteConfirmationDialog;
