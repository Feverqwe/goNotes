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

import {AttachFile, Check, Send} from '@mui/icons-material';
import {
  Box,
  Chip,
  Container,
  IconButton,
  Paper,
  TextField,
  Theme,
  alpha,
  useTheme,
} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {SendMessageRequest, UpdateMessageRequest} from '../../tools/types';
import {Attachment, Note} from '../../types';
import AttachmentsPanel from '../FullScreenNoteEditor/AttachmentsPanel';
import {getBgColor, getBorderColor} from '../MessageItem/utils';

import EditHeader from './EditHeader';

const tagsContainerSx = {px: 2, pt: 1.5, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap'};

const tagChipSx = {
  bgcolor: 'action.selected', // Заменено с rgba(144, 202, 249, 0.08)
  color: 'primary.main', // Заменено с #90caf9
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.85rem',
  height: '36px',
  '& .MuiChip-deleteIcon': {
    fontSize: 20,
    color: 'primary.main',
    ml: 1,
    mr: 0.5,
    '&:hover': {color: 'text.primary'},
  },
  '& .MuiChip-label': {px: 1.5},
};

const attachBtnSx = {
  color: 'text.secondary', // Заменено с #8e8e93
  mb: 0.5,
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const sendBtnSx = {
  color: 'primary.main', // Заменено с #90caf9
  mb: 0.5,
  '&.Mui-disabled': {color: 'text.disabled'}, // Заменено с #3a3a3c
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const checkIconSx = {fontSize: 26, color: 'primary.main'};
const attachInputProps = {hidden: true, multiple: true, type: 'file'} as const;
const attachIconRotationSx = {transform: 'rotate(45deg)'};
const sendIconSx = {fontSize: 26};

const editorActionsSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.25,
};

const dialogAttachBtnSx = {
  ...attachBtnSx,
  mb: 0,
};

const dialogSendBtnSx = {
  ...sendBtnSx,
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

export interface BottomInputFormProps {
  editingNote: Note | null;
  endEditing: () => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  currentTags: string[];
  onRemoveCurrentTag: (tag: string) => void;
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

const BottomInputForm: FC<BottomInputFormProps> = (props) => {
  const {
    editingNote,
    files,
    currentTags,
    onRemoveCurrentTag,
    setFiles,
    endEditing,
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
  const refInputText = useRef(inputText);
  refInputText.current = inputText;

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
    endEditing();
    setInputText('');
    setFiles([]);
  }, [endEditing, setInputText, setFiles]);

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

  const updateMessageMutation = useMutation({
    mutationFn: (params: UpdateMessageRequest) => api.messages.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      onFinish();
    },
    onError: () => showSnackbar('Ошибка при сохранении заметки', 'error'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (params: SendMessageRequest) => api.messages.send(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      document.body.scrollIntoView(true);
      onFinish();
    },
    onError: () => showSnackbar('Ошибка при отправке заметки', 'error'),
  });

  const isSending = sendMessageMutation.isPending || updateMessageMutation.isPending;
  const canSend = useMemo(() => {
    if (isSending) return false;
    return (
      inputText.trim().length > 0 ||
      files.length > 0 ||
      existingAttachments.length > deletedAttachIds.length
    );
  }, [inputText, files, existingAttachments, deletedAttachIds, isSending]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const formData = new FormData();
    files.forEach((f) => formData.append('attachments', f));
    let finalContent = refInputText.current;
    if (editingNote) {
      formData.append('id', String(editingNote.id));
      formData.append('content', finalContent);
      formData.append('delete_attachments', deletedAttachIds.join(','));
      updateMessageMutation.mutate(formData);
    } else {
      const addTags = currentTags
        .filter((tag) => !finalContent.includes(`#${tag}`))
        .map((tag) => `#${tag}`)
        .join(' ');
      if (addTags) finalContent += `\n ${addTags}`;
      formData.append('content', finalContent);
      sendMessageMutation.mutate(formData);
    }
  }, [
    canSend,
    files,
    editingNote,
    deletedAttachIds,
    updateMessageMutation,
    currentTags,
    sendMessageMutation,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
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
          ? getBgColor(editingNote.color, theme.palette.background.default)
          : isDialogMode
            ? 'background.paper'
            : alpha(theme.palette.background.paper, 0.8),
      backdropFilter: isDialogMode ? 'none' : 'blur(20px) saturate(180%)',
      ...(!isDialogMode && !editingNote?.color ? {backgroundImage: 'none'} : {}),
      border: isDialogMode ? '1px solid' : 'none',
      borderTop: '1px solid',
      borderColor: editingNote?.color
        ? getBorderColor(editingNote.color)
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

  return (
    <Paper
      square={!isDialogMode}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      sx={paperSx}
    >
      <Container maxWidth="sm" disableGutters sx={containerSx}>
        {!isDialogMode && editingNote && <EditHeader onCancel={cancelEditing} />}

        <Box sx={isDialogMode ? dialogScrollableContentSx : undefined}>
          <AttachmentsPanel
            existingAttachments={existingAttachments}
            deletedAttachIds={deletedAttachIds}
            files={files}
            onToggleDeleteAttachment={toggleDeleteExisting}
            onRemoveFile={removeNewFile}
          />

          {currentTags.length > 0 && !editingNote && (
            <Box sx={tagsContainerSx}>
              {currentTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => onRemoveCurrentTag(tag)}
                  sx={tagChipSx}
                />
              ))}
            </Box>
          )}

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
              <IconButton component="label" tabIndex={3} sx={attachBtnSx}>
                <AttachFile sx={attachIconRotationSx} />
                <input {...attachInputProps} onChange={handleFileChange} />
              </IconButton>
            )}

            <TextField
              fullWidth
              multiline
              minRows={isDialogMode ? 10 : 1}
              maxRows={isDialogMode ? undefined : 10}
              variant="standard"
              placeholder={isDragging ? 'Сбросьте файлы...' : 'Заметка...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              slotProps={textFieldSlotProps}
            />

            {!isDialogMode && (
              <IconButton
                tabIndex={3}
                loading={isSending}
                onClick={handleSend}
                disabled={!canSend}
                sx={sendBtnSx}
              >
                {editingNote ? <Check sx={checkIconSx} /> : <Send sx={sendIconSx} />}
              </IconButton>
            )}
          </Box>
        </Box>

        {isDialogMode && (
          <Box sx={dialogBottomActionsSx}>
            <IconButton component="label" tabIndex={3} sx={dialogAttachBtnSx}>
              <AttachFile sx={attachIconRotationSx} />
              <input {...attachInputProps} onChange={handleFileChange} />
            </IconButton>
            <Box sx={editorActionsSx}>
              {editorActions}
              <IconButton
                tabIndex={3}
                loading={isSending}
                onClick={handleSend}
                disabled={!canSend}
                sx={dialogSendBtnSx}
              >
                {editingNote ? <Check sx={checkIconSx} /> : <Send sx={sendIconSx} />}
              </IconButton>
            </Box>
          </Box>
        )}
      </Container>
    </Paper>
  );
};

export default BottomInputForm;
