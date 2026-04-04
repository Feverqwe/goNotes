import React, {FC, useCallback, useEffect, useMemo, useState} from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Theme,
  Typography,
} from '@mui/material';
import {AddCircleOutline, Close, Edit, Fullscreen} from '@mui/icons-material';
import BottomInputForm, {BottomInputFormProps} from '../BottomInputForm/BottomInputForm';

const dialogTitleSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 2,
};

const iconSx = {color: 'primary.main', fontSize: 22}; // Заменено с #90caf9
const dialogTitleBoxSx = {display: 'flex', alignItems: 'center', gap: 1.5};
const titleSx = {color: 'text.primary', fontSize: '1.2rem'}; // Заменено с #fff

const dividerSx = {borderColor: 'divider'}; // Заменено с rgba(255,255,255,0.1)

const dialogContentSx = {p: 0, display: 'flex', flexDirection: 'column'};

const closeSx = {
  color: 'text.secondary', // Заменено с #8e8e93
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

export interface NoteEditorDialogProps extends Omit<BottomInputFormProps, 'isDialogMode'> {
  open: boolean;
  onFullscreen?: () => void;
}

const NoteEditorDialog: FC<NoteEditorDialogProps> = ({open, onFullscreen, ...props}) => {
  const {onFinish, editingNote, inputText, files} = props;

  const hasChanges = useMemo(() => {
    const hasFiles = files.length > 0;
    if (editingNote) {
      return inputText !== editingNote.content || hasFiles || props.deletedAttachIds.length > 0;
    }
    return inputText.length > 0 || hasFiles;
  }, [inputText, files, editingNote, props.deletedAttachIds]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (window.confirm('У вас есть несохраненные изменения. Закрыть без сохранения?')) {
        onFinish();
      }
    } else {
      onFinish();
    }
  }, [hasChanges, onFinish]);

  // Block browser tab close when there are unsaved changes
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={hasChanges}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      transitionDuration={100}
      disableRestoreFocus={true}
    >
      <DialogTitle sx={dialogTitleSx}>
        <Box sx={dialogTitleBoxSx}>
          {editingNote ? <Edit sx={iconSx} /> : <AddCircleOutline sx={iconSx} />}
          <Typography variant="h6" sx={titleSx}>
            {editingNote ? 'Редактировать заметку' : 'Новая заметка'}
          </Typography>
        </Box>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
          {editingNote && onFullscreen && (
            <IconButton onClick={onFullscreen} size="small" sx={closeSx}>
              <Fullscreen />
            </IconButton>
          )}
          <IconButton onClick={handleClose} size="small" sx={closeSx}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider sx={dividerSx} />
      <DialogContent sx={dialogContentSx}>
        <BottomInputForm {...props} isDialogMode={true} />
      </DialogContent>
    </Dialog>
  );
};

export default NoteEditorDialog;
