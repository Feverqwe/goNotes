import React, {FC, useCallback, useEffect, useRef, useState} from 'react';
import {useMediaQuery, useTheme} from '@mui/material';
import BottomInputForm from '../BottomInputForm/BottomInputForm';
import NoteEditorDialog, {NoteEditorDialogProps} from '../NoteEditorDialog/NoteEditorDialog';
import {Attachment} from '../../types';
import FullScreenNoteEditor from '../FullScreenNoteEditor/FullScreenNoteEditor';

interface NoteFormProps extends Pick<
  NoteEditorDialogProps,
  'editingNote' | 'endEditing' | 'currentTags' | 'setCurrentTags' | 'open' | 'innerRef'
> {
  setIsEditorDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onFullscreen?: () => void;
}

const NoteForm: FC<NoteFormProps> = (props) => {
  const {editingNote, endEditing, setIsEditorDialogOpen, open} = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [files, setFiles] = useState<File[]>([]);
  const refFiles = useRef<File[]>([]);
  refFiles.current = files;

  const [inputText, setInputText] = useState('');
  const refInputText = useRef('');
  refInputText.current = inputText;

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [deletedAttachIds, setDeletedAttachIds] = useState<number[]>([]);

  const [isFullScreenEditorOpen, setIsFullScreenEditorOpen] = useState(false);

  useEffect(() => {
    if (isMobile) return;
    if (refFiles.current.length || refInputText.current.length) {
      setIsEditorDialogOpen(true);
    }
  }, [isMobile, setIsEditorDialogOpen]);

  useEffect(() => {
    if (editingNote) {
      setInputText(editingNote.content);
      setExistingAttachments(editingNote.attachments ?? []);
      setDeletedAttachIds([]);
    } else {
      setExistingAttachments([]);
      setDeletedAttachIds([]);
    }
  }, [editingNote]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === 'load-shared-files') {
        const sharedFiles = event.data.files as File[];
        setFiles((prev) => [...prev, ...sharedFiles]);
        if (event.data.text) setInputText(event.data.text);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    const askForData = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({action: 'GET_SHARED_DATA'});
      }
    };

    const timeout = setTimeout(askForData, 500);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  const onFinish = useCallback(() => {
    endEditing();
    setInputText('');
    setFiles([]);
    setExistingAttachments([]);
    setDeletedAttachIds([]);
  }, [endEditing]);

  const openFullScreenEditor = useCallback(() => {
    setIsFullScreenEditorOpen(true);
  }, []);

  const closeFullScreenEditor = useCallback(() => {
    setIsFullScreenEditorOpen(false);
    onFinish();
  }, [onFinish]);

  const localProps = {
    files,
    setFiles,
    inputText,
    setInputText,
    existingAttachments,
    deletedAttachIds,
    setDeletedAttachIds,
    onFinish,
  };

  return (
    <>
      {isMobile && <BottomInputForm {...props} {...localProps} />}

      {!isMobile && !isFullScreenEditorOpen && open && (
        <NoteEditorDialog
          key={String(editingNote?.id || '-')}
          {...props}
          {...localProps}
          onFullscreen={openFullScreenEditor}
        />
      )}

      {!isMobile && isFullScreenEditorOpen && open && (
        <FullScreenNoteEditor
          key={String(editingNote?.id || '-')}
          open={open}
          noteId={editingNote?.id || null}
          onClose={closeFullScreenEditor}
          files={files}
          setFiles={setFiles}
          refInputText={refInputText}
          setInputText={setInputText}
          existingAttachments={existingAttachments}
          deletedAttachIds={deletedAttachIds}
          setDeletedAttachIds={setDeletedAttachIds}
          setExistingAttachments={setExistingAttachments}
        />
      )}
    </>
  );
};

export default NoteForm;
