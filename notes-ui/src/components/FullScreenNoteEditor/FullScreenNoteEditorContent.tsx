import React, {
  FC,
  Suspense,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
} from '@mui/material';
import {Close, Fullscreen, FullscreenExit, Save} from '@mui/icons-material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {SnackCtx} from '../../ctx/SnackCtx';
import {useAppTheme} from '../../ctx/ThemeCtx';
import {Note} from '../../types';
import {api} from '../../tools/api';
import {SendMessageRequest, SendMessageResponse, UpdateMessageRequest} from '../../tools/types';
import AttachmentsPanel from './AttachmentsPanel';
import {editor} from 'monaco-editor';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const dialogTitleSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 1,
  pr: 1,
  minHeight: '48px',
};

const dialogTitleBoxSx = {display: 'flex', alignItems: 'center', gap: 1};

const closeSx = {
  color: 'text.secondary',
  '&:focus-visible': {
    boxShadow: (theme: {palette: {primary: {main: string}}}) =>
      `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const editorContainerSx = {
  height: 'calc(100vh - 200px)',
  minHeight: '400px',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  overflow: 'hidden',
};

const editorContainerFullscreenSx = {
  height: 'calc(100vh - 120px)',
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
};

export interface FullScreenNoteEditorContentProps {
  editingNote?: Note;
  onClose: () => void;
  onNoteCreated?: (noteId: number) => void;
}

const FullScreenNoteEditorContent: FC<FullScreenNoteEditorContentProps> = ({
  editingNote,
  onClose,
  onNoteCreated,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const {mode} = useAppTheme();
  const queryClient = useQueryClient();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef('');
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  const [files, setFiles] = useState<File[]>([]);
  const refFiles = useRef(files);
  refFiles.current = files;

  const [deletedAttachIds, setDeletedAttachIds] = useState<number[]>([]);
  const refDeletedAttachIds = useRef(deletedAttachIds);
  refDeletedAttachIds.current = deletedAttachIds;

  const contentRef = useRef(editingNote?.content ?? '');

  useEffect(() => {
    if (editingNote) {
      lastSavedContentRef.current = editingNote.content;
      contentRef.current = editingNote.content;
      setHasUnsavedChanges(false);
    } else {
      lastSavedContentRef.current = '';
      contentRef.current = '';
      setHasUnsavedChanges(false);
    }
  }, [editingNote?.id]);

  const monacoTheme = mode === 'dark' ? 'vs-dark' : 'vs';

  const sendMessageMutation = useMutation({
    mutationFn: (params: SendMessageRequest) => api.messages.send(params),
    onSuccess: (response: SendMessageResponse) => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      lastSavedContentRef.current = contentRef.current;
      setHasUnsavedChanges(false);
      setFiles([]);
      setDeletedAttachIds([]);

      if (onNoteCreated) {
        onNoteCreated(response.id);
      } else {
        onClose();
      }
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
      lastSavedContentRef.current = contentRef.current;
      setHasUnsavedChanges(false);
      setFiles([]);
      setDeletedAttachIds([]);
    },
    onError: () => {
      showSnackbar('Ошибка при сохранении заметки', 'error');
    },
  });

  useEffect(() => {
    if (!editorRef.current || !editingNote) return;

    if (editorRef.current.getValue() !== editingNote.content) {
      editorRef.current.setValue(editingNote.content);
    }
  }, [editingNote]);

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
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (autoSaveEnabled) {
      autoSaveTimerRef.current = setTimeout(() => {
        if (contentRef.current !== lastSavedContentRef.current) {
          const formData = new FormData();
          formData.append('content', contentRef.current);

          if (editingNote) {
            formData.append('id', String(editingNote.id));
            updateMessageMutation.mutate(formData);
          } else {
            sendMessageMutation.mutate(formData);
          }
        }
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editingNote, updateMessageMutation, sendMessageMutation, autoSaveEnabled]);

  useEffect(() => {
    const hasChanges =
      contentRef.current !== lastSavedContentRef.current ||
      files.length > 0 ||
      deletedAttachIds.length > 0;
    setHasUnsavedChanges(hasChanges);
  }, [files.length, deletedAttachIds.length]);

  const handleContentChange = useCallback((value: string | undefined) => {
    contentRef.current = value || '';

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const hasChanges =
        contentRef.current !== lastSavedContentRef.current ||
        refFiles.current.length > 0 ||
        refDeletedAttachIds.current.length > 0;
      setHasUnsavedChanges(hasChanges);
    }, 300);
  }, []);

  const handleManualSave = useCallback(() => {
    if (
      contentRef.current === lastSavedContentRef.current &&
      files.length === 0 &&
      deletedAttachIds.length === 0
    ) {
      return;
    }

    const formData = new FormData();
    formData.append('content', contentRef.current);

    files.forEach((file) => formData.append('attachments', file));

    if (editingNote) {
      formData.append('id', String(editingNote.id));
      if (deletedAttachIds.length > 0) {
        formData.append('delete_attachments', deletedAttachIds.join(','));
      }
      updateMessageMutation.mutate(formData);
    } else {
      sendMessageMutation.mutate(formData);
    }
  }, [editingNote, updateMessageMutation, sendMessageMutation, files, deletedAttachIds]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('У вас есть несохраненные изменения. Закрыть без сохранения?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(!autoSaveEnabled);
  }, [autoSaveEnabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDeleteAttachment = useCallback((id: number) => {
    setDeletedAttachIds((prev) => {
      return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleManualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleManualSave]);

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      disableEscapeKeyDown={hasUnsavedChanges}
      maxWidth={isFullscreen ? false : 'lg'}
      fullWidth
      fullScreen={isFullscreen}
      scroll="paper"
      transitionDuration={100}
      disableRestoreFocus={true}
      sx={{
        '& .MuiDialog-container': {
          alignItems: isFullscreen ? 'flex-start' : 'center',
        },
      }}
      disableEnforceFocus={true}
    >
      <DialogTitle sx={dialogTitleSx}>
        <Box sx={dialogTitleBoxSx}>
          <FormControlLabel
            control={
              <Switch
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
                size="small"
                color="primary"
              />
            }
            label="Автосохранение"
            sx={{mr: 0, '& .MuiFormControlLabel-label': {fontSize: '0.75rem'}}}
          />
        </Box>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
          <IconButton
            onClick={handleManualSave}
            disabled={!hasUnsavedChanges}
            loading={updateMessageMutation.isPending || sendMessageMutation.isPending}
            size="small"
            color="primary"
            sx={{p: 0.5}}
          >
            <Save fontSize="small" />
          </IconButton>
          <IconButton onClick={toggleFullscreen} size="small" sx={{p: 0.5}}>
            {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
          <IconButton onClick={handleClose} size="small" sx={{...closeSx, p: 0.5}}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{p: 0}}>
        {(updateMessageMutation.isError || sendMessageMutation.isError) && (
          <Alert severity="error" sx={{m: 2}}>
            {editingNote ? 'Ошибка при сохранении заметки' : 'Ошибка при создании заметки'}
          </Alert>
        )}

        <Box sx={isFullscreen ? editorContainerFullscreenSx : editorContainerSx}>
          <Suspense
            fallback={
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress />
              </Box>
            }
          >
            <MonacoEditor
              height="100%"
              defaultLanguage="markdown"
              defaultValue={contentRef.current}
              onChange={handleContentChange}
              theme={monacoTheme}
              options={{
                minimap: {enabled: false},
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                padding: {top: 16, bottom: 16},
              }}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
            />
          </Suspense>
        </Box>

        <AttachmentsPanel
          existingAttachments={editingNote?.attachments ?? []}
          deletedAttachIds={deletedAttachIds}
          files={files}
          onToggleDeleteAttachment={toggleDeleteAttachment}
          onRemoveFile={removeFile}
          onFileChange={handleFileChange}
          isEditorMode={true}
        />
      </DialogContent>
    </Dialog>
  );
};

export default FullScreenNoteEditorContent;
