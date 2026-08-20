import React, {
  FC,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {Check, Send} from '@mui/icons-material';
import {Box, Container, IconButton, Paper, TextField, Theme, alpha, useTheme} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {CreateNoteRequest, UpdateNoteRequest} from '../../tools/types';
import {Attachment, Note} from '../../types';
import {getNoteBackgroundColor, getNoteBorderColor} from '../../utils/noteColors';
import EditorAttachments from '../EditorAttachments/EditorAttachments';

import EditingBanner from './EditingBanner';

const attachBtnSx = {
  color: 'text.secondary',
  mb: 0.5,
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const saveButtonSx = {
  color: 'primary.main',
  mb: 0.5,
  '&.Mui-disabled': {color: 'text.disabled'},
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const checkIconSx = {fontSize: 26, color: 'primary.main'};
const createIconSx = {fontSize: 26};

const editorActionsSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.25,
};

const dialogAttachBtnSx = {
  ...attachBtnSx,
  mb: 0,
};

const dialogSaveButtonSx = {
  ...saveButtonSx,
  mb: 0,
};

const dialogScrollableContentSx = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
};

const dialogBottomActionsSx = {
  flexShrink: 0,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 0.5,
};

export interface CompactNoteEditorProps {
  editingNote: Note | null;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  currentTags: string[];
  isDialogMode?: boolean;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  setDeletedAttachIds: React.Dispatch<React.SetStateAction<number[]>>;
  onFinish: () => void;
  innerRef?: React.RefObject<{focus: () => void} | null>;
  editorActions?: React.ReactNode;
}

const CompactNoteEditor: FC<CompactNoteEditorProps> = (props) => {
  const {
    editingNote,
    files,
    currentTags,
    setFiles,
    isDialogMode,
    inputText,
    setInputText,
    existingAttachments,
    deletedAttachIds,
    setDeletedAttachIds,
    onFinish,
    innerRef,
    editorActions,
  } = props;

  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputTextRef = useRef(inputText);
  inputTextRef.current = inputText;

  useImperativeHandle(innerRef, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (!isDialogMode && !editingNote) return;
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDialogMode, editingNote]);

  useEffect(() => {
    if (isDialogMode && editingNote) {
      inputRef.current?.scrollIntoView(false);
    }
  }, [editingNote, isDialogMode]);

  const cancelEditing = useCallback(() => {
    onFinish();
  }, [onFinish]);

  const removeNewFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [setFiles],
  );

  const toggleDeleteExisting = useCallback(
    (id: number) => {
      setDeletedAttachIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
    },
    [setDeletedAttachIds],
  );

  const updateNoteMutation = useMutation({
    mutationFn: (params: UpdateNoteRequest) => api.notes.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      onFinish();
    },
    onError: () => showSnackbar('Ошибка при сохранении заметки', 'error'),
  });

  const createNoteMutation = useMutation({
    mutationFn: (params: CreateNoteRequest) => api.notes.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      document.body.scrollIntoView(true);
      onFinish();
    },
    onError: () => showSnackbar('Ошибка при отправке заметки', 'error'),
  });

  const isSaving = createNoteMutation.isPending || updateNoteMutation.isPending;
  const canSave = useMemo(() => {
    if (isSaving) return false;
    return (
      inputText.trim().length > 0 ||
      files.length > 0 ||
      existingAttachments.length > deletedAttachIds.length
    );
  }, [inputText, files, existingAttachments, deletedAttachIds, isSaving]);

  const saveNote = useCallback(() => {
    if (!canSave) return;
    const formData = new FormData();
    files.forEach((f) => formData.append('attachments', f));
    let finalContent = inputTextRef.current;
    if (editingNote) {
      formData.append('id', String(editingNote.id));
      formData.append('content', finalContent);
      formData.append('delete_attachments', deletedAttachIds.join(','));
      updateNoteMutation.mutate(formData);
    } else {
      const addTags = currentTags
        .filter((tag) => !finalContent.includes(`#${tag}`))
        .map((tag) => `#${tag}`)
        .join(' ');
      if (addTags) finalContent += `\n ${addTags}`;
      formData.append('content', finalContent);
      createNoteMutation.mutate(formData);
    }
  }, [
    canSave,
    files,
    editingNote,
    deletedAttachIds,
    updateNoteMutation,
    currentTags,
    createNoteMutation,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveNote();
      }
    },
    [saveNote],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length > 0) {
        setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      }
    },
    [setFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = Array.from(e.target.files ?? []);
      if (newFiles.length > 0) setFiles((prev) => [...prev, ...newFiles]);
      e.target.value = '';
    },
    [setFiles],
  );

  const containerSx = useMemo(
    () => ({
      height: isDialogMode ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }),
    [isDialogMode],
  );

  const paperSx = useMemo(
    () => ({
      position: isDialogMode ? 'relative' : 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: isDialogMode ? '100%' : 'auto',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      bgcolor: isDragging
        ? alpha(theme.palette.primary.main, 0.05)
        : editingNote?.color
          ? getNoteBackgroundColor(editingNote.color, theme.palette.background.default)
          : isDialogMode
            ? 'background.paper'
            : alpha(theme.palette.background.paper, 0.8),
      backdropFilter: isDialogMode ? 'none' : 'blur(20px) saturate(180%)',
      ...(!isDialogMode && !editingNote?.color ? {backgroundImage: 'none'} : {}),
      border: isDialogMode ? '1px solid' : 'none',
      borderTop: '1px solid',
      borderColor: editingNote?.color
        ? getNoteBorderColor(editingNote.color)
        : isDialogMode
          ? 'divider'
          : editingNote
            ? alpha(theme.palette.primary.main, 0.5)
            : 'divider',
      zIndex: 1000,
      boxShadow: 'none',
      overflow: 'hidden',
      transition: theme.transitions.create(['background-color', 'border-color']),
    }),
    [isDragging, editingNote, isDialogMode, theme],
  );

  const textFieldSlotProps = useMemo(
    () => ({
      input: {
        disableUnderline: true,
        sx: {
          color: 'text.primary',
          pt: 1.5,
          pb: isDialogMode ? 0 : 1.5,
          px: isDialogMode ? 1.5 : 1,
          fontSize: '0.95rem',
        },
        inputProps: {tabIndex: 3, ref: inputRef},
      },
    }),
    [isDialogMode],
  );

  const placeholder = useMemo(() => {
    if (isDragging) return 'Сбросьте файлы...';
    if (!editingNote && currentTags.length > 0) {
      return `Заметка в ${currentTags.map((tag) => `#${tag}`).join(', ')}…`;
    }
    return 'Заметка...';
  }, [currentTags, editingNote, isDragging]);

  return (
    <Paper
      square={!isDialogMode}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      sx={paperSx}
    >
      <Container maxWidth={isDialogMode ? false : 'sm'} disableGutters sx={containerSx}>
        {!isDialogMode && editingNote && <EditingBanner onCancel={cancelEditing} />}

        <Box sx={isDialogMode ? dialogScrollableContentSx : undefined}>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              px: isDialogMode ? 0 : 0.5,
              pb: isDialogMode ? 0 : 0.5,
              pt: 0,
            }}
          >
            {!isDialogMode && (
              <EditorAttachments
                existingAttachments={existingAttachments}
                deletedAttachIds={deletedAttachIds}
                files={files}
                onToggleDeleteAttachment={toggleDeleteExisting}
                onRemoveFile={removeNewFile}
                onFileChange={handleFileChange}
                buttonSx={attachBtnSx}
                tabIndex={3}
              />
            )}

            <TextField
              fullWidth
              multiline
              minRows={isDialogMode ? 10 : 1}
              maxRows={isDialogMode ? undefined : 10}
              variant="standard"
              placeholder={placeholder}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              slotProps={textFieldSlotProps}
            />

            {!isDialogMode && (
              <IconButton
                tabIndex={3}
                loading={isSaving}
                onClick={saveNote}
                disabled={!canSave}
                sx={saveButtonSx}
              >
                {editingNote ? <Check sx={checkIconSx} /> : <Send sx={createIconSx} />}
              </IconButton>
            )}
          </Box>
        </Box>

        {isDialogMode && (
          <Box sx={dialogBottomActionsSx}>
            <EditorAttachments
              existingAttachments={existingAttachments}
              deletedAttachIds={deletedAttachIds}
              files={files}
              onToggleDeleteAttachment={toggleDeleteExisting}
              onRemoveFile={removeNewFile}
              onFileChange={handleFileChange}
              buttonSx={dialogAttachBtnSx}
              tabIndex={3}
            />
            <Box sx={editorActionsSx}>
              {editorActions}
              <IconButton
                tabIndex={3}
                loading={isSaving}
                onClick={saveNote}
                disabled={!canSave}
                sx={dialogSaveButtonSx}
              >
                {editingNote ? <Check sx={checkIconSx} /> : <Send sx={createIconSx} />}
              </IconButton>
            </Box>
          </Box>
        )}
      </Container>
    </Paper>
  );
};

export default CompactNoteEditor;
