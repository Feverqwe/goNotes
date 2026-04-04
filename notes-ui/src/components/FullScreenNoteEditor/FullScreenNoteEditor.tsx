import React, {FC, memo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Box, CircularProgress, Dialog, DialogContent} from '@mui/material';
import {api} from '../../tools/api';
import FullScreenNoteEditorContent from './FullScreenNoteEditorContent';

export interface FullScreenNoteEditorProps {
  open: boolean;
  noteId: number | null;
  onClose: () => void;
}

const boxSx = {display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px'};

const FullScreenNoteEditor: FC<FullScreenNoteEditorProps> = ({open, noteId, onClose}) => {
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
    return <FullScreenNoteEditorContent onClose={onClose} onNoteCreated={setCurrentNoteId} />;
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

  return <FullScreenNoteEditorContent editingNote={editingNote} onClose={onClose} />;
};

export default memo(FullScreenNoteEditor);
