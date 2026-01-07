import React, {FC, useMemo} from 'react';
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
      border: '0',
      borderRadius: '12px',
    },
  },
};

const closeSx = {
  color: '#8e8e93',
  '&:focus-visible': {
    boxShadow: '0 0 0 2px #90caf9',
    borderColor: '#90caf9',
  },
};

export interface NoteEditorDialogProps extends Omit<BottomInputFormProps, 'isDialogMode'> {
  open: boolean;
}

const NoteEditorDialog: FC<NoteEditorDialogProps> = ({open, ...props}) => {
  const {onFinish, editingNote, inputText, files} = props;

  const hasChanges = useMemo(() => {
    const hasFiles = files.length > 0;

    if (editingNote) {
      return inputText !== editingNote.content || hasFiles || props.deletedAttachIds.length > 0;
    }

    return inputText.length > 0 || hasFiles;
  }, [inputText, files, editingNote, props.deletedAttachIds]);

  return (
    <Dialog
      open={open}
      onClose={onFinish}
      disableEscapeKeyDown={hasChanges}
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
        <IconButton onClick={onFinish} size="small" sx={closeSx}>
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
