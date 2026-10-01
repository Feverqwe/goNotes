import React, {FC, useCallback, useEffect, useRef, useState} from 'react';

import {useMediaQuery, useTheme} from '@mui/material';

import {Attachment} from '../../types';
import AdvancedNoteEditorDialog from '../AdvancedNoteEditor/AdvancedNoteEditorDialog';
import CompactNoteEditor from '../CompactNoteEditor/CompactNoteEditor';
import CompactNoteEditorDialog, {
  CompactNoteEditorDialogProps,
} from '../CompactNoteEditorDialog/CompactNoteEditorDialog';

interface NoteEditorProps extends Pick<
  CompactNoteEditorDialogProps,
  'editingNote' | 'currentTags' | 'open' | 'innerRef'
> {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}

const NoteEditor: FC<NoteEditorProps> = (props) => {
  const {editingNote, onClose, setOpen, open, ...editorProps} = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [files, setFiles] = useState<File[]>([]);
  const filesRef = useRef<File[]>([]);
  filesRef.current = files;

  const [inputText, setInputText] = useState('');
  const inputTextRef = useRef('');
  inputTextRef.current = inputText;

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [deletedAttachIds, setDeletedAttachIds] = useState<number[]>([]);

  const [isAdvancedEditorOpen, setIsAdvancedEditorOpen] = useState(false);

  useEffect(() => {
    if (isMobile) return;
    if (filesRef.current.length || inputTextRef.current.length) {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

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
    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker) return;

    const shareId = new URLSearchParams(window.location.search).get('shared');
    let requestedWorker: ServiceWorker | null = null;
    let disposed = false;
    let received = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'load-shared-files' && !received) {
        received = true;
        const sharedFiles = event.data.files as File[];
        setFiles((prev) => [...prev, ...sharedFiles]);
        if (event.data.text) setInputText(event.data.text);
        setOpen(true);

        const url = new URL(window.location.href);
        url.searchParams.delete('shared');
        window.history.replaceState(window.history.state, '', url);
      }
    };

    serviceWorker.addEventListener('message', handleMessage);

    const askForData = () => {
      const worker = serviceWorker.controller;
      if (!disposed && !received && shareId && worker && worker !== requestedWorker) {
        requestedWorker = worker;
        worker.postMessage({action: 'GET_SHARED_DATA', shareId});
      }
    };

    serviceWorker.addEventListener('controllerchange', askForData);
    // Registration/activation can take longer than an arbitrary startup timeout.
    askForData();
    serviceWorker.ready.then(askForData);

    return () => {
      disposed = true;
      serviceWorker.removeEventListener('message', handleMessage);
      serviceWorker.removeEventListener('controllerchange', askForData);
    };
  }, [setOpen]);

  const onFinish = useCallback(() => {
    onClose();
    setInputText('');
    setFiles([]);
    setExistingAttachments([]);
    setDeletedAttachIds([]);
  }, [onClose]);

  const openAdvancedEditor = useCallback(() => {
    setIsAdvancedEditorOpen(true);
  }, []);

  const closeAdvancedEditor = useCallback(() => {
    setIsAdvancedEditorOpen(false);
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
      {isMobile && <CompactNoteEditor editingNote={editingNote} {...editorProps} {...localProps} />}

      {!isMobile && !isAdvancedEditorOpen && open && (
        <CompactNoteEditorDialog
          key={String(editingNote?.id || '-')}
          editingNote={editingNote}
          open={open}
          {...editorProps}
          {...localProps}
          onOpenAdvancedEditor={openAdvancedEditor}
        />
      )}

      {!isMobile && isAdvancedEditorOpen && open && (
        <AdvancedNoteEditorDialog
          open={open}
          noteId={editingNote?.id ?? null}
          onClose={closeAdvancedEditor}
          files={files}
          setFiles={setFiles}
          inputTextRef={inputTextRef}
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

export default NoteEditor;
