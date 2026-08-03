import React, {
  FC,
  Suspense,
  lazy,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {Close, Fullscreen, FullscreenExit, Save} from '@mui/icons-material';
import {Alert, Box, CircularProgress, FormControlLabel, IconButton, Switch} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {editor} from 'monaco-editor';

import {SnackCtx} from '../../ctx/SnackCtx';
import {useAppTheme} from '../../ctx/ThemeCtx';
import {api} from '../../tools/api';
import {SendMessageRequest, SendMessageResponse, UpdateMessageRequest} from '../../tools/types';
import {Attachment, Note} from '../../types';

import AttachmentsPanel from './AttachmentsPanel';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const HEADER_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 2,
  py: 1,
  pr: 1,
  minHeight: '48px',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const HEADER_BOX_SX = {display: 'flex', alignItems: 'center', gap: 1};

const CLOSE_SX = {
  color: 'text.secondary',
  '&:focus-visible': {
    boxShadow: (theme: {palette: {primary: {main: string}}}) =>
      `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const EDITOR_CONTAINER_SX = {
  height: 'calc(100vh - 248px)',
  minHeight: '400px',
  borderColor: 'divider',
  overflow: 'hidden',
};

const EDITOR_CONTAINER_FULLSCREEN_SX = {
  height: 'calc(100vh - 106px)',
  borderColor: 'divider',
  overflow: 'hidden',
};

const MONACO_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: {enabled: false},
  fontSize: 13,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
};
const formControlLabelSx = {mr: 0, '& .MuiFormControlLabel-label': {fontSize: '0.75rem'}};
const iconButtonBoxSx = {display: 'flex', alignItems: 'center', gap: 0.5};
const saveIconButtonSx = {p: 0.5};
const suspenseBoxSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
};
export interface FullScreenNoteEditorContentProps {
  editingNote?: Note;
  onClose: () => void;
  onNoteCreated: (noteId: number) => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  refInputText: React.RefObject<string>;
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  setDeletedAttachIds: React.Dispatch<React.SetStateAction<number[]>>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  isFullscreen: boolean;
  autoSaveEnabled: boolean;
  onToggleAutoSave: () => void;
  onToggleFullscreen: () => void;
}

const FullScreenNoteEditorContent: FC<FullScreenNoteEditorContentProps> = ({
  editingNote,
  onClose,
  onNoteCreated,
  files,
  setFiles,
  setInputText,
  refInputText: inputTextRef,
  existingAttachments,
  deletedAttachIds,
  setDeletedAttachIds,
  isFullscreen,
  autoSaveEnabled,
  onToggleAutoSave: handleToggleAutoSave,
  onToggleFullscreen: handleToggleFullscreen,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const {mode} = useAppTheme();
  const queryClient = useQueryClient();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasRemoteChanges, setHasRemoteChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const changesTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<null | string>(editingNote?.content ?? '');

  const refEditor = useRef<editor.IStandaloneCodeEditor>(null);

  const refFiles = useRef(files);
  refFiles.current = files;

  const refDeletedAttachIds = useRef(deletedAttachIds);
  refDeletedAttachIds.current = deletedAttachIds;

  const refEditingNote = useRef(editingNote);
  refEditingNote.current = editingNote;

  const monacoTheme = useMemo(() => (mode === 'dark' ? 'vs-dark' : 'vs'), [mode]);

  const getHasChanges = useCallback(() => {
    return (
      inputTextRef.current !== lastSavedContentRef.current ||
      refFiles.current.length > 0 ||
      refDeletedAttachIds.current.length > 0
    );
  }, [inputTextRef]);

  useEffect(() => {
    if (!editingNote) return;
    const content = editingNote.content;

    const hasLocalContentChanges = inputTextRef.current !== lastSavedContentRef.current;

    if (content !== lastSavedContentRef.current) {
      if (hasLocalContentChanges) {
        setHasRemoteChanges(true);
      } else {
        inputTextRef.current = content;
        refEditor.current?.setValue(content);
        setHasRemoteChanges(false);
      }
    } else {
      setHasRemoteChanges(false);
    }

    setHasUnsavedChanges(getHasChanges());
  }, [editingNote, getHasChanges, inputTextRef]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setHasUnsavedChanges(getHasChanges());
  }, [files.length, deletedAttachIds.length, getHasChanges]);

  const sendMessageMutation = useMutation({
    mutationFn: (params: SendMessageRequest) => api.messages.send(params),
    onSuccess: (response: SendMessageResponse) => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      lastSavedContentRef.current = inputTextRef.current;
      setFiles([]);
      setDeletedAttachIds([]);
      setHasUnsavedChanges(false);

      onNoteCreated(response.id);
    },
    onError: () => {
      showSnackbar('Ошибка при создании заметки', 'error');
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: (params: UpdateMessageRequest) => api.messages.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      if (editingNote) {
        queryClient.invalidateQueries({queryKey: ['note', editingNote.id]});
      }
      lastSavedContentRef.current = inputTextRef.current;
      setFiles([]);
      setDeletedAttachIds([]);
      setHasUnsavedChanges(false);
    },
    onError: () => {
      showSnackbar('Ошибка при сохранении заметки', 'error');
    },
  });

  const saveNote = useCallback(() => {
    if (!getHasChanges()) return;

    const formData = new FormData();
    formData.append('content', inputTextRef.current);

    files.forEach((file) => formData.append('attachments', file));

    const editingNote = refEditingNote.current;
    if (editingNote) {
      formData.append('id', String(editingNote.id));

      if (deletedAttachIds.length > 0) {
        formData.append('delete_attachments', deletedAttachIds.join(','));
      }

      updateMessageMutation.mutate(formData);
    } else {
      sendMessageMutation.mutate(formData);
    }
  }, [
    deletedAttachIds,
    files,
    getHasChanges,
    inputTextRef,
    sendMessageMutation,
    updateMessageMutation,
  ]);

  useEffect(() => {
    if (!autoSaveEnabled) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveNote();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveEnabled, saveNote]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveNote]);

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      inputTextRef.current = value || '';

      if (changesTimerRef.current) {
        clearTimeout(changesTimerRef.current);
      }

      changesTimerRef.current = setTimeout(() => {
        setInputText(inputTextRef.current);
        setHasUnsavedChanges(getHasChanges());
      }, 300);
    },
    [inputTextRef, setInputText, getHasChanges],
  );

  const handleUpdateFromRemote = useCallback(() => {
    const editingNote = refEditingNote.current;
    if (!editingNote) return;
    const content = editingNote.content;

    inputTextRef.current = content;
    lastSavedContentRef.current = content;
    refEditor.current?.setValue(content);
    setHasRemoteChanges(false);
    setHasUnsavedChanges(getHasChanges());
  }, [inputTextRef, getHasChanges]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('У вас есть несохраненные изменения. Закрыть без сохранения?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files ?? []);
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
      e.target.value = '';
    },
    [setFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [setFiles],
  );

  const toggleDeleteAttachment = useCallback(
    (id: number) => {
      setDeletedAttachIds((prev) => {
        return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      });
    },
    [setDeletedAttachIds],
  );

  return (
    <Box>
      {/* Header moved to body as part of the content */}
      <Box sx={HEADER_SX}>
        <Box sx={HEADER_BOX_SX}>
          <FormControlLabel
            control={
              <Switch
                checked={autoSaveEnabled}
                onChange={handleToggleAutoSave}
                size="small"
                color="primary"
              />
            }
            label="Автосохранение"
            sx={formControlLabelSx}
          />
        </Box>
        <Box sx={iconButtonBoxSx}>
          <IconButton
            onClick={saveNote}
            disabled={!hasUnsavedChanges}
            loading={updateMessageMutation.isPending || sendMessageMutation.isPending}
            size="small"
            color="primary"
            sx={saveIconButtonSx}
          >
            <Save fontSize="small" />
          </IconButton>
          <IconButton onClick={handleToggleFullscreen} size="small" sx={saveIconButtonSx}>
            {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
          <IconButton onClick={handleClose} size="small" sx={{...CLOSE_SX, ...saveIconButtonSx}}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box>
        {hasRemoteChanges && (
          <Alert
            severity="info"
            action={
              <IconButton color="inherit" size="small" onClick={handleUpdateFromRemote}>
                <Save fontSize="small" />
              </IconButton>
            }
          >
            Заметка была изменена на другом устройстве. Нажмите значок сохранения, чтобы обновить
            содержимое.
          </Alert>
        )}
        {(updateMessageMutation.isError || sendMessageMutation.isError) && (
          <Alert severity="error">
            {editingNote ? 'Ошибка при сохранении заметки' : 'Ошибка при создании заметки'}
          </Alert>
        )}

        <Box sx={isFullscreen ? EDITOR_CONTAINER_FULLSCREEN_SX : EDITOR_CONTAINER_SX}>
          <Suspense
            fallback={
              <Box sx={suspenseBoxSx}>
                <CircularProgress />
              </Box>
            }
          >
            <MonacoEditor
              height="100%"
              defaultLanguage="markdown"
              defaultValue={inputTextRef.current}
              onChange={handleContentChange}
              theme={monacoTheme}
              options={MONACO_EDITOR_OPTIONS}
              onMount={(editor) => {
                refEditor.current = editor;
              }}
            />
          </Suspense>
        </Box>

        <AttachmentsPanel
          existingAttachments={existingAttachments}
          deletedAttachIds={deletedAttachIds}
          files={files}
          onToggleDeleteAttachment={toggleDeleteAttachment}
          onRemoveFile={removeFile}
          onFileChange={handleFileChange}
          isEditorMode={true}
        />
      </Box>
    </Box>
  );
};

export default memo(FullScreenNoteEditorContent);
