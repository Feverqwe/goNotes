import React, {FC} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Box, CircularProgress, Dialog, DialogContent} from '@mui/material';
import {api} from '../../tools/api';
import FullScreenNoteEditorContent from './FullScreenNoteEditorContent';

export interface FullScreenNoteEditorProps {
  open: boolean;
  noteId: number | null;
  onClose: () => void;
}

const FullScreenNoteEditor: FC<FullScreenNoteEditorProps> = ({open, noteId, onClose}) => {
  const {data: editingNote, isLoading} = useQuery({
    queryKey: ['note', noteId],
    queryFn: () =>
      noteId ? api.messages.list({id: noteId}).then((notes) => notes[0] || null) : null,
    enabled: open && Boolean(noteId),
    staleTime: 0,
  });

  if (!open || !noteId) {
    return null;
  }

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box
            sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px'}}
          >
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!editingNote) {
    return null;
  }

  return <FullScreenNoteEditorContent editingNote={editingNote} onClose={onClose} />;
};

export default FullScreenNoteEditor;
