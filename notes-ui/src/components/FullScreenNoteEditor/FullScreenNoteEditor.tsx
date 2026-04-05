import React, {FC, memo, useCallback, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Box, CircularProgress, Dialog, DialogContent} from '@mui/material';
import {api} from '../../tools/api';
import FullScreenNoteEditorContent from './FullScreenNoteEditorContent';
import {Attachment} from '../../types';

export interface FullScreenNoteEditorProps {
  open: boolean;
  noteId: number | null;
  onClose: () => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  refInputText: React.RefObject<string>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  setDeletedAttachIds: React.Dispatch<React.SetStateAction<number[]>>;
  setExistingAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

const boxSx = {display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px'};

const FullScreenNoteEditor: FC<FullScreenNoteEditorProps> = ({
  open,
  noteId,
  onClose,
  files,
  setFiles,
  refInputText,
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
      currentNoteId
        ? api.messages.list({id: currentNoteId}).then((notes) => notes[0] || null)
        : null,
    enabled: open && Boolean(currentNoteId),
    staleTime: 0,
  });

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
    >
      <DialogContent sx={{p: 0}}>
        {currentNoteId && isLoading ? (
          <Box sx={boxSx}>
            <CircularProgress />
          </Box>
        ) : currentNoteId && !editingNote ? null : (
          <FullScreenNoteEditorContent
            editingNote={editingNote ?? undefined}
            onNoteCreated={setCurrentNoteId}
            onClose={onClose}
            files={files}
            setFiles={setFiles}
            refInputText={refInputText}
            setInputText={setInputText}
            existingAttachments={existingAttachments}
            deletedAttachIds={deletedAttachIds}
            setDeletedAttachIds={setDeletedAttachIds}
            setExistingAttachments={setExistingAttachments}
            fullscreen={isFullscreen}
            autoSave={autoSaveEnabled}
            onToggleAutoSave={toggleAutoSave}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default memo(FullScreenNoteEditor);
