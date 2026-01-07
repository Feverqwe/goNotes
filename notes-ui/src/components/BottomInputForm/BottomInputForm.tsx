import React, {FC, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Chip, Container, IconButton, Paper, TextField} from '@mui/material';
import {AttachFile, Check, Send} from '@mui/icons-material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {SnackCtx} from '../../ctx/SnackCtx';
import {Attachment, Note} from '../../types';
import {api} from '../../tools/api';
import {SendMessageRequest, UpdateMessageRequest} from '../../tools/types';
import EditHeader from './EditHeader';
import ExistingAttachmentItem from './ExistingAttachmentItem';
import NewFileItem from './NewFileItem';

const attachScrollBoxSx = {
  display: 'flex',
  gap: 1.5,
  px: 2,
  pt: 1.5,
  overflowX: 'auto',
  '&::-webkit-scrollbar': {display: 'none'},
};

const tagsContainerSx = {px: 2, pt: 1.5, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap'};

const tagChipSx = {
  bgcolor: 'rgba(144, 202, 249, 0.08)',
  color: '#90caf9',
  border: '1px solid rgba(144, 202, 249, 0.2)',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.85rem',
  height: '36px',
  '& .MuiChip-deleteIcon': {
    fontSize: 20,
    color: '#90caf9',
    ml: 1,
    mr: 0.5,
    '&:hover': {color: '#fff'},
  },
  '& .MuiChip-label': {px: 1.5},
};

const attachBtnSx = {
  color: '#8e8e93',
  mb: 0.5,
  '&:focus-visible': {
    boxShadow: '0 0 0 2px #90caf9',
    borderColor: '#90caf9',
  },
};

const sendBtnSx = {
  color: '#90caf9',
  mb: 0.5,
  '&.Mui-disabled': {color: '#3a3a3c'},
  '&:focus-visible': {
    boxShadow: '0 0 0 2px #90caf9',
    borderColor: '#90caf9',
  },
};

const checkIconSx = {
  fontSize: 26,
  color: '#90caf9',
};

const attachInputProps = {
  hidden: true,
  multiple: true,
  type: 'file',
} as const;

const attachIconRotationSx = {transform: 'rotate(45deg)'};

const sendIconSx = {fontSize: 26};

const progressSx = {
  color: '#90caf9',
  padding: '2px',
};

export interface BottomInputFormProps {
  editingNote: Note | null;
  endEditing: () => void;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  isDialogMode?: boolean;

  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  setDeletedAttachIds: React.Dispatch<React.SetStateAction<number[]>>;
  onFinish: () => void;
}

const BottomInputForm: FC<BottomInputFormProps> = ({
  editingNote,
  files,
  currentTags,
  setCurrentTags,
  setFiles,
  endEditing,
  isDialogMode,
  inputText,
  setInputText,
  existingAttachments,
  deletedAttachIds,
  setDeletedAttachIds,
  onFinish,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const refInputText = useRef(inputText);
  refInputText.current = inputText;

  useEffect(() => {
    if (!isDialogMode && !editingNote) return;
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDialogMode, editingNote]);

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
      showSnackbar('Заметка обновлена', 'success');
      onFinish();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при сохранении заметки', 'error');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (params: SendMessageRequest) => api.messages.send(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      showSnackbar('Заметка отправлена', 'success');
      onFinish();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при отправкезаметки', 'error');
    },
  });

  const isSending = sendMessageMutation.isPending || updateMessageMutation.isPending;

  const canSend = useMemo(() => {
    if (isSending) return false;
    const hasText = inputText.trim().length > 0;
    const hasNewFiles = files.length > 0;
    const hasRemainingFiles = existingAttachments.length > deletedAttachIds.length;
    return hasText || hasNewFiles || hasRemainingFiles;
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
      currentTags.forEach((tag) => {
        if (!finalContent.includes(`#${tag}`)) finalContent += `\n #${tag}`;
      });
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
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      }
    },
    [setFiles],
  );

  const handleFileKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.querySelector('input')?.dispatchEvent(new MouseEvent('click'));
    }
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
    },
    [setInputText],
  );

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

  const containerSx = useMemo(
    () => ({height: isDialogMode ? '100%' : 'auto', display: 'flex', flexDirection: 'column'}),
    [isDialogMode],
  );

  const paperSx = useMemo(
    () => ({
      position: isDialogMode ? 'relative' : 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      bgcolor: isDragging ? 'rgba(26, 31, 36, 0.9)' : 'rgba(18, 18, 18, 0.8)',
      backdropFilter: isDialogMode ? 'none' : 'blur(20px) saturate(180%)',
      backgroundImage: 'none',
      borderTop: isDialogMode
        ? 'none'
        : editingNote
          ? '1px solid rgba(144, 202, 249, 0.5)'
          : '#2c2c2e',
      zIndex: 1000,
      boxShadow: 'none',
    }),
    [isDragging, editingNote, isDialogMode],
  );

  const inputContainerSx = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'flex-end',
      px: 0.5,
      pb: 0.5,
      pt: 0,
      flexGrow: 0,
    }),
    [],
  );

  const textFieldSlotProps = useMemo(
    () =>
      ({
        input: {
          disableUnderline: true,
          sx: {color: '#fff', py: 1.5, px: 1, fontSize: '0.95rem'},
          inputProps: {
            tabIndex: 3,
            ref: inputRef,
          },
        },
      }) satisfies React.ComponentProps<typeof TextField>['slotProps'],
    [],
  );

  return (
    <Paper
      square
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      sx={paperSx}
    >
      <Container maxWidth="sm" disableGutters sx={containerSx}>
        {!isDialogMode && editingNote && <EditHeader onCancel={cancelEditing} />}

        {existingAttachments.length > 0 && editingNote && (
          <Box sx={attachScrollBoxSx}>
            {existingAttachments.map((att) => (
              <ExistingAttachmentItem
                key={att.id}
                att={att}
                isDeleted={deletedAttachIds.includes(att.id)}
                onToggle={toggleDeleteExisting}
              />
            ))}
          </Box>
        )}

        {files.length > 0 && (
          <Box sx={attachScrollBoxSx}>
            {files.map((file, idx) => (
              <NewFileItem
                key={`${file.name}-${idx}`}
                file={file}
                index={idx}
                onRemove={removeNewFile}
              />
            ))}
          </Box>
        )}

        {currentTags.length > 0 && !editingNote && (
          <Box sx={tagsContainerSx}>
            {currentTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => setCurrentTags((prev) => prev.filter((t) => t !== tag))}
                sx={tagChipSx}
              />
            ))}
          </Box>
        )}

        <Box sx={inputContainerSx}>
          <IconButton component="label" onKeyDown={handleFileKeyDown} tabIndex={3} sx={attachBtnSx}>
            <AttachFile sx={attachIconRotationSx} />
            <input {...attachInputProps} onChange={handleFileChange} />
          </IconButton>

          <TextField
            fullWidth
            multiline
            minRows={isDialogMode ? 10 : 1}
            maxRows={isDialogMode ? 20 : 10}
            variant="standard"
            placeholder={isDragging ? 'Сбросьте файлы...' : 'Заметка...'}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            slotProps={textFieldSlotProps}
          />

          <IconButton
            tabIndex={3}
            loading={isSending}
            onClick={handleSend}
            disabled={!canSend}
            sx={sendBtnSx}
          >
            {editingNote ? <Check sx={checkIconSx} /> : <Send sx={sendIconSx} />}
          </IconButton>
        </Box>
      </Container>
    </Paper>
  );
};

export default BottomInputForm;
