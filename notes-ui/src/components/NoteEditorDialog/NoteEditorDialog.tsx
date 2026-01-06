import React, {FC, useCallback} from 'react';
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
import BottomInputForm from '../BottomInputForm/BottomInputForm';
import {Note} from '../../types';

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

interface NoteEditorDialogProps {
  open: boolean;
  editingNote: Note | null;
  endEditing: () => void;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const NoteEditorDialog: FC<NoteEditorDialogProps> = ({
  open,
  editingNote,
  endEditing,
  currentTags,
  setCurrentTags,
  files,
  setFiles,
}) => {
  const handleClose = useCallback(() => {
    endEditing();
    setFiles([]);
  }, [endEditing, setFiles]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
        <IconButton onClick={handleClose} size="small" sx={{color: '#8e8e93'}}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider sx={{borderColor: 'rgba(255,255,255,0.1)'}} />

      <DialogContent sx={{p: 0, display: 'flex', flexDirection: 'column'}}>
        <BottomInputForm
          editingNote={editingNote}
          endEditing={endEditing}
          currentTags={currentTags}
          setCurrentTags={setCurrentTags}
          files={files}
          setFiles={setFiles}
          isDialogMode={true}
        />
      </DialogContent>
    </Dialog>
  );
};

export default NoteEditorDialog;
