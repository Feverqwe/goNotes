import React, {FC, useCallback, useEffect, useMemo, useState} from 'react';

import {Close, Fullscreen} from '@mui/icons-material';
import {Dialog, DialogContent, IconButton, Theme} from '@mui/material';

import CompactNoteEditor, {CompactNoteEditorProps} from '../CompactNoteEditor/CompactNoteEditor';

const dialogContentSx = {
  p: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const closeSx = {
  color: 'text.secondary',
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const headerIconSx = {fontSize: 24};

export interface CompactNoteEditorDialogProps extends Omit<CompactNoteEditorProps, 'isDialogMode'> {
  open: boolean;
  onOpenAdvancedEditor?: () => void;
}

const CompactNoteEditorDialog: FC<CompactNoteEditorDialogProps> = ({
  open,
  onOpenAdvancedEditor,
  ...props
}) => {
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

  const handleDialogClose = useCallback(
    (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason !== 'escapeKeyDown' || !hasChanges) {
        handleClose();
      }
    },
    [handleClose, hasChanges],
  );

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

  const editorActions = (
    <>
      {onOpenAdvancedEditor && (
        <IconButton
          onClick={onOpenAdvancedEditor}
          size="small"
          sx={closeSx}
          aria-label="Открыть полноэкранный редактор"
        >
          <Fullscreen sx={headerIconSx} />
        </IconButton>
      )}
      <IconButton onClick={handleClose} size="small" sx={closeSx} aria-label="Закрыть редактор">
        <Close sx={headerIconSx} />
      </IconButton>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      aria-label={editingNote ? 'Редактирование заметки' : 'Новая заметка'}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      transitionDuration={100}
      disableRestoreFocus={true}
    >
      <DialogContent sx={dialogContentSx}>
        <CompactNoteEditor {...props} isDialogMode={true} editorActions={editorActions} />
      </DialogContent>
    </Dialog>
  );
};

export default CompactNoteEditorDialog;
