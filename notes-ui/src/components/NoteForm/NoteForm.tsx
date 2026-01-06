import React, {FC, useCallback, useEffect, useRef, useState} from 'react';
import {useMediaQuery, useTheme} from '@mui/material';
import BottomInputForm from '../BottomInputForm/BottomInputForm';
import NoteEditorDialog, {NoteEditorDialogProps} from '../NoteEditorDialog/NoteEditorDialog';
import {Attachment} from '../../types';

interface NoteFormProps extends Pick<
  NoteEditorDialogProps,
  'editingNote' | 'endEditing' | 'currentTags' | 'setCurrentTags' | 'open'
> {
  setIsEditorDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NoteForm: FC<NoteFormProps> = (props) => {
  const {editingNote, endEditing, setIsEditorDialogOpen} = props;
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

  useEffect(() => {
    if (isMobile) return;
    if (refFiles.current.length || refInputText.current.length) {
      setIsEditorDialogOpen(true);
    }
  }, [isMobile, setIsEditorDialogOpen]);

  useEffect(() => {
    if (editingNote) {
      setInputText(editingNote.content);
      if (editingNote.attachments) {
        setExistingAttachments(editingNote.attachments);
      }
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

      {!isMobile && (
        <NoteEditorDialog key={String(editingNote ? 1 : 0)} {...props} {...localProps} />
      )}
    </>
  );
};

export default NoteForm;
