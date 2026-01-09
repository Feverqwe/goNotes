import React, {FC, useMemo} from 'react';
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
import {AddCircleOutline, Close, Edit} from '@mui/icons-material';
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
        <IconButton onClick={onFinish} size="small" sx={closeSx}>
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider sx={dividerSx} />
      <DialogContent sx={dialogContentSx}>
        <BottomInputForm {...props} isDialogMode={true} />
      </DialogContent>
    </Dialog>
  );
};

export default NoteEditorDialog;
