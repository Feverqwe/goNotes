import React, {FC} from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import {AddCircleOutline, Close, Edit} from '@mui/icons-material';
import BottomInputForm, {BottomInputFormProps} from '../BottomInputForm/BottomInputForm';

const dialogPaperSx = {
  paper: {
    sx: {
      bgcolor: '#1c1c1e',
      backgroundImage: 'none',
      border: '1px solid #2c2c2e',
      borderRadius: '12px',
    },
  },
};

export interface NoteEditorDialogProps extends Omit<BottomInputFormProps, 'isDialogMode'> {
  open: boolean;
}

const NoteEditorDialog: FC<NoteEditorDialogProps> = ({open, ...props}) => {
  const {onFinish, editingNote} = props;

  return (
    <Dialog
      open={open}
      onClose={onFinish}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      slotProps={dialogPaperSx}
      transitionDuration={100}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
          {editingNote ? (
            <Edit sx={{color: '#90caf9', fontSize: 22}} />
          ) : (
            <AddCircleOutline sx={{color: '#90caf9', fontSize: 22}} />
          )}
          <Typography variant="h6" sx={{color: '#fff', fontSize: '1.2rem'}}>
            {editingNote ? 'Редактировать заметку' : 'Новая заметка'}
          </Typography>
        </Box>
        <IconButton onClick={onFinish} size="small" sx={{color: '#8e8e93'}}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider sx={{borderColor: 'rgba(255,255,255,0.1)'}} />

      <DialogContent sx={{p: 0, display: 'flex', flexDirection: 'column'}}>
        <BottomInputForm {...props} isDialogMode={true} />
      </DialogContent>
    </Dialog>
  );
};

export default NoteEditorDialog;
