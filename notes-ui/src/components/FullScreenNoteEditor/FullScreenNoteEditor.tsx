import React, {FC, memo, useState} from 'react';
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
}) => {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);

  const {data: editingNote, isLoading} = useQuery({
    queryKey: ['note', currentNoteId],
    queryFn: () =>
      currentNoteId
        ? api.messages.list({id: currentNoteId}).then((notes) => notes[0] || null)
        : null,
    enabled: open && Boolean(currentNoteId),
    staleTime: 0,
  });

  if (!open) {
    return null;
  }

  if (!currentNoteId) {
    return (
      <FullScreenNoteEditorContent
        onClose={onClose}
        onNoteCreated={setCurrentNoteId}
        files={files}
        setFiles={setFiles}
        refInputText={refInputText}
        setInputText={setInputText}
        existingAttachments={existingAttachments}
        deletedAttachIds={deletedAttachIds}
        setDeletedAttachIds={setDeletedAttachIds}
      />
    );
  }

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box sx={boxSx}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!editingNote) {
    return null;
  }
  return (
    <FullScreenNoteEditorContent
      editingNote={editingNote}
      onClose={onClose}
      files={files}
      setFiles={setFiles}
      refInputText={refInputText}
      setInputText={setInputText}
      existingAttachments={existingAttachments}
      deletedAttachIds={deletedAttachIds}
      setDeletedAttachIds={setDeletedAttachIds}
    />
  );
};

export default memo(FullScreenNoteEditor);
