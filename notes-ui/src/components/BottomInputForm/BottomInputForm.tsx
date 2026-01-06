import React, {FC, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Chip, CircularProgress, Container, IconButton, Paper, TextField} from '@mui/material';
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

const inputRowSx = {display: 'flex', alignItems: 'flex-end', px: 0.5, pb: 0.5};

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

const textFieldSlotProps = {
  input: {
    disableUnderline: true,
    sx: {color: '#fff', py: 1.5, px: 1, fontSize: '0.95rem'},
    slotProps: {
      input: {
        tabIndex: 3,
      },
    },
  },
};

const checkIconSx = {
  fontSize: 14,
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
  padding: '2px', // Чтобы лоадер визуально соответствовал размеру иконки
};

interface BottomInputFormProps {
  editingNote: Note | null;
  files: File[];
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setEditingNote: React.Dispatch<React.SetStateAction<Note | null>>;
}

const BottomInputForm: FC<BottomInputFormProps> = ({
  editingNote,
  files,
  currentTags,
  setCurrentTags,
  setFiles,
  setEditingNote,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [deletedAttachIds, setDeletedAttachIds] = useState<number[]>([]);

  const refInputText = useRef(inputText);
  refInputText.current = inputText;

  const paperSx = useMemo(
    () => ({
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      bgcolor: isDragging ? 'rgba(26, 31, 36, 0.9)' : 'rgba(18, 18, 18, 0.8)',
      backdropFilter: 'blur(20px) saturate(180%)',
      backgroundImage: 'none',
      borderTop: '1px solid',
      borderColor: editingNote ? 'rgba(144, 202, 249, 0.5)' : '#2c2c2e',
      zIndex: 1000,
      transition: 'background-color 0.2s, border-color 0.2s',
    }),
    [isDragging, editingNote],
  );

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
  }, [setFiles, setInputText]);

  useEffect(() => {
    if (editingNote) {
      setInputText(editingNote.content);
      if (editingNote.attachments) {
        setExistingAttachments(editingNote.attachments);
      }
      setDeletedAttachIds([]);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();

          const {length} = inputRef.current.value;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 100);
    } else {
      setExistingAttachments([]);
      setDeletedAttachIds([]);
    }
  }, [editingNote]);

  const cancelEditing = useCallback(() => {
    setEditingNote(null);
    setInputText('');
    setFiles([]);
  }, [setEditingNote, setInputText, setFiles]);

  const removeNewFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [setFiles],
  );

  const toggleDeleteExisting = useCallback((id: number) => {
    setDeletedAttachIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const onSuccess = useCallback(() => {
    setEditingNote(null);
    setInputText('');
    setFiles([]);
    setExistingAttachments([]);
    setDeletedAttachIds([]);
  }, [setEditingNote, setFiles]);

  const updateMessageMutation = useMutation({
    mutationFn: (params: UpdateMessageRequest) => api.messages.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      showSnackbar('Заметка обновлена', 'success');
      onSuccess();
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
      onSuccess();
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

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const formData = new FormData();
    files.forEach((f) => formData.append('attachments', f));

    let finalContent = refInputText.current;
    if (editingNote) {
      formData.append('id', editingNote.toString());
      formData.append('content', finalContent);
      formData.append('delete_attachments', deletedAttachIds.join(','));
      updateMessageMutation.mutate(formData);
    } else {
      currentTags.forEach((tag) => {
        if (!finalContent.includes(`#${tag}`)) finalContent += ` #${tag}`;
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

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  }, []);

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

  return (
    <Paper
      square
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      sx={paperSx}
    >
      <Container maxWidth="sm" disableGutters>
        {editingNote && <EditHeader onCancel={cancelEditing} />}

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

        <Box sx={inputRowSx}>
          <IconButton component="label" onKeyDown={handleFileKeyDown} tabIndex={3} sx={attachBtnSx}>
            <AttachFile sx={attachIconRotationSx} />
            <input {...attachInputProps} onChange={handleFileChange} />
          </IconButton>

          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={10}
            variant="standard"
            placeholder={isDragging ? 'Сбросьте файлы...' : 'Заметка...'}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            slotProps={textFieldSlotProps}
          />

          <IconButton tabIndex={3} onClick={handleSend} disabled={!canSend} sx={sendBtnSx}>
            {isSending ? (
              <CircularProgress size={24} sx={progressSx} />
            ) : editingNote ? (
              <Check sx={checkIconSx} />
            ) : (
              <Send sx={sendIconSx} />
            )}
          </IconButton>
        </Box>
      </Container>
    </Paper>
  );
};

export default BottomInputForm;
