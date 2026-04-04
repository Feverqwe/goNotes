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
import {UpdateMessageRequest} from '../../tools/types';
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

export interface FullScreenNoteEditorProps {
  open: boolean;
  editingNote: Note | null;
  onClose: () => void;
}

const FullScreenNoteEditor: FC<FullScreenNoteEditorProps> = ({open, editingNote, onClose}) => {
  const showSnackbar = useContext(SnackCtx);
  const {mode} = useAppTheme();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [deletedAttachIds, setDeletedAttachIds] = useState<number[]>([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef('');
  const contentRef = useRef(content);
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  const monacoTheme = mode === 'dark' ? 'vs-dark' : 'vs';

  const updateMessageMutation = useMutation({
    mutationFn: (params: UpdateMessageRequest) => api.messages.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      lastSavedContentRef.current = contentRef.current;
      setHasUnsavedChanges(false);
    },
    onError: () => {
      showSnackbar('Ошибка при сохранении заметки', 'error');
    },
  });

  useEffect(() => {
    if (editingNote) {
      setContent(editingNote.content);
      lastSavedContentRef.current = editingNote.content;
      setHasUnsavedChanges(false);
      setFiles([]);
      setDeletedAttachIds([]);
    } else {
      setContent('');
      lastSavedContentRef.current = '';
      setHasUnsavedChanges(false);
      setFiles([]);
      setDeletedAttachIds([]);
    }
  }, [editingNote]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!editingNote || contentRef.current === lastSavedContentRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (autoSaveEnabled) {
      autoSaveTimerRef.current = setTimeout(() => {
        if (editingNote && contentRef.current !== lastSavedContentRef.current) {
          const formData = new FormData();
          formData.append('id', String(editingNote.id));
          formData.append('content', contentRef.current);
          updateMessageMutation.mutate(formData);
        }
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, editingNote, updateMessageMutation, autoSaveEnabled]);

  const handleContentChange = useCallback((value: string | undefined) => {
    contentRef.current = value || '';

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setContent(value || '');
      setHasUnsavedChanges(true);
    }, 300);
  }, []);

  const handleManualSave = useCallback(() => {
    if (
      !editingNote ||
      (contentRef.current === lastSavedContentRef.current &&
        files.length === 0 &&
        deletedAttachIds.length === 0)
    ) {
      return;
    }

    const formData = new FormData();
    formData.append('id', String(editingNote.id));
    formData.append('content', contentRef.current);

    files.forEach((file) => formData.append('attachments', file));

    if (deletedAttachIds.length > 0) {
      formData.append('delete_attachments', deletedAttachIds.join(','));
    }

    updateMessageMutation.mutate(formData);
  }, [editingNote, updateMessageMutation, files, deletedAttachIds]);

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
      setHasUnsavedChanges(true);
    }
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }, []);

  const toggleDeleteAttachment = useCallback((id: number) => {
    setDeletedAttachIds((prev) => {
      const newIds = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      setHasUnsavedChanges(true);
      return newIds;
    });
  }, []);

  useEffect(() => {
    if (!open) return;

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
  }, [open, handleManualSave]);

  if (!editingNote) {
    return null;
  }

  return (
    <Dialog
      open={open}
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
            loading={updateMessageMutation.isPending}
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
        {updateMessageMutation.isError && (
          <Alert severity="error" sx={{m: 2}}>
            Ошибка при сохранении заметки
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
              value={content}
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

export default FullScreenNoteEditor;
