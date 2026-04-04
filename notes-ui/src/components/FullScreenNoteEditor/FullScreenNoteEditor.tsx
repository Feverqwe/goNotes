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
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import {Close, Fullscreen, FullscreenExit, Save} from '@mui/icons-material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {SnackCtx} from '../../ctx/SnackCtx';
import {useAppTheme} from '../../ctx/ThemeCtx';
import {Attachment, Note} from '../../types';
import {api} from '../../tools/api';
import {UpdateMessageRequest} from '../../tools/types';

// Lazy load Monaco Editor
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const dialogTitleSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 1,
  pr: 1,
  minHeight: '48px',
};

const iconSx = {color: 'primary.main', fontSize: 20};
const dialogTitleBoxSx = {display: 'flex', alignItems: 'center', gap: 1};

const closeSx = {
  color: 'text.secondary',
  '&:focus-visible': {
    boxShadow: (theme: {palette: {primary: {main: string}}}) =>
      `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const editorContainerSx = {
  height: 'calc(100vh - 140px)',
  minHeight: '400px',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  overflow: 'hidden',
};

const editorContainerFullscreenSx = {
  height: 'calc(100vh - 60px)',
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
};

export interface FullScreenNoteEditorProps {
  open: boolean;
  editingNote: Note | null;
  onClose: () => void;
  onSave?: () => void;
}

const FullScreenNoteEditor: FC<FullScreenNoteEditorProps> = ({
  open,
  editingNote,
  onClose,
  onSave,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const {mode} = useAppTheme();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef('');
  const contentRef = useRef(content);
  const editorRef = useRef<any>(null);

  // Используем стандартную тему Monaco в зависимости от темы приложения
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

  // Initialize content when editingNote changes
  useEffect(() => {
    if (editingNote) {
      setContent(editingNote.content);
      lastSavedContentRef.current = editingNote.content;
      setHasUnsavedChanges(false);
    } else {
      setContent('');
      lastSavedContentRef.current = '';
      setHasUnsavedChanges(false);
    }
  }, [editingNote]);

  // Block browser tab close when there are unsaved changes
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

  // Auto-save functionality
  useEffect(() => {
    if (!editingNote || contentRef.current === lastSavedContentRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (3 seconds delay) only if auto-save is enabled
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
    if (!editingNote || contentRef.current === lastSavedContentRef.current) {
      return;
    }

    const formData = new FormData();
    formData.append('id', String(editingNote.id));
    formData.append('content', contentRef.current);
    updateMessageMutation.mutate(formData);
  }, [editingNote, updateMessageMutation]);

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

  // Ctrl+S hotkey handler
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
      </DialogContent>
    </Dialog>
  );
};

export default FullScreenNoteEditor;
