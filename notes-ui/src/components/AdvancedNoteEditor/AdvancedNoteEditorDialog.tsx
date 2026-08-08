import React, {FC, memo, useCallback, useEffect, useState} from 'react';

import {Box, CircularProgress, Dialog, DialogContent} from '@mui/material';
import {useQuery} from '@tanstack/react-query';

import {api} from '../../tools/api';
import {Attachment} from '../../types';

import AdvancedNoteEditor from './AdvancedNoteEditor';

export interface AdvancedNoteEditorDialogProps {
  open: boolean;
  noteId: number | null;
  onClose: () => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  inputTextRef: React.RefObject<string>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  setDeletedAttachIds: React.Dispatch<React.SetStateAction<number[]>>;
  setExistingAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

const boxSx = {display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'};

const dialogContentSx = {
  p: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const AdvancedNoteEditorDialog: FC<AdvancedNoteEditorDialogProps> = ({
  open,
  noteId,
  onClose,
  files,
  setFiles,
  inputTextRef,
  setInputText,
  existingAttachments,
  deletedAttachIds,
  setDeletedAttachIds,
  setExistingAttachments,
}) => {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  const {data: editingNote, isLoading} = useQuery({
    queryKey: ['note', currentNoteId],
    queryFn: () =>
      currentNoteId ? api.notes.list({id: currentNoteId}).then((notes) => notes[0] || null) : null,
    enabled: open && Boolean(currentNoteId),
    staleTime: 0,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!editingNote) return;

    setExistingAttachments(editingNote.attachments ?? []);
  }, [editingNote, setExistingAttachments]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => !prev);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isFullscreen ? false : 'lg'}
      fullWidth
      fullScreen={isFullscreen}
      scroll="paper"
      disableRestoreFocus={true}
      disableEnforceFocus={true}
      slotProps={{
        paper: {
          sx: {height: isFullscreen ? '100%' : 'calc(100% - 64px)'},
        },
      }}
    >
      <DialogContent sx={dialogContentSx}>
        {currentNoteId && isLoading ? (
          <Box sx={boxSx}>
            <CircularProgress />
          </Box>
        ) : currentNoteId && !editingNote ? null : (
          <AdvancedNoteEditor
            editingNote={editingNote ?? undefined}
            onNoteCreated={setCurrentNoteId}
            onClose={onClose}
            files={files}
            setFiles={setFiles}
            inputTextRef={inputTextRef}
            existingAttachments={existingAttachments}
            deletedAttachIds={deletedAttachIds}
            setInputText={setInputText}
            setDeletedAttachIds={setDeletedAttachIds}
            isFullscreen={isFullscreen}
            autoSaveEnabled={autoSaveEnabled}
            onToggleAutoSave={toggleAutoSave}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default memo(AdvancedNoteEditorDialog);
