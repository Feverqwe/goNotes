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
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onConfirmPermanently?: () => void;
  onClose: () => void;
}

const DeleteConfirmationDialog: FC<DeleteConfirmationDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onConfirmPermanently,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={loading ? undefined : onClose}
    transitionDuration={250}
    maxWidth={onConfirmPermanently ? 'sm' : 'xs'}
    fullWidth={Boolean(onConfirmPermanently)}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{description}</DialogContentText>
    </DialogContent>
    <DialogActions
      sx={{
        ...(onConfirmPermanently && {
          flexDirection: {xs: 'column', sm: 'row'},
          alignItems: {xs: 'flex-end', sm: 'center'},
          gap: 1,
          p: 2,
          '& > :not(style) ~ :not(style)': {ml: 0},
        }),
      }}
    >
      <Button
        onClick={onConfirm}
        loading={loading}
        variant={onConfirmPermanently ? 'contained' : 'text'}
        color={onConfirmPermanently ? 'primary' : 'error'}
        sx={buttonSx}
      >
        {confirmLabel}
      </Button>
      {onConfirmPermanently && (
        <Button
          onClick={onConfirmPermanently}
          disabled={loading}
          variant="outlined"
          color="error"
          sx={buttonSx}
        >
          Удалить навсегда
        </Button>
      )}
      <Button onClick={onClose} disabled={loading} variant="text" sx={buttonSx}>
        Отмена
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteConfirmationDialog;
