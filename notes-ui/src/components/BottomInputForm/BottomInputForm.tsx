import React, {FC, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Chip, Container, IconButton, Paper, TextField, Typography} from '@mui/material';
import {AttachFile, Check, Close, DeleteForever, Edit, Send} from '@mui/icons-material';
import axios from 'axios';
import {API_BASE} from '../../constants';
import {SnackCtx} from '../../ctx/SnackCtx';
import {Attachment, Note} from '../../types';

interface BottomInputFormProps {
  editingId: number | null;
  files: File[];
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>;
  fetchMessages: (isInitial?: boolean) => Promise<void>;
  messages: Note[]; // Добавьте этот пропс в App.tsx при вызове
}

const BottomInputForm: FC<BottomInputFormProps> = ({
  editingId,
  files,
  currentTags,
  setCurrentTags,
  setFiles,
  setEditingId,
  fetchMessages,
  messages,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const [isDragging, setIsDragging] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Состояния для редактирования существующих вложений
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [deletedAttachIds, setDeletedAttachIds] = useState<number[]>([]);

  const refInputText = useRef(inputText);
  refInputText.current = inputText;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === 'load-shared-files') {
        const sharedFiles = event.data.files as File[];
        setFiles((prev) => [...prev, ...sharedFiles]);
        if (event.data.text) setInputText(event.data.text);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Как только компонент смонтирован, спрашиваем у SW: "Есть что для меня?"
    const askForData = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({action: 'GET_SHARED_DATA'});
      }
    };

    // Небольшая задержка, чтобы стейты инициализировались
    const timeout = setTimeout(askForData, 500);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, [setFiles, setInputText]);

  // Инициализация при входе в режим редактирования
  useEffect(() => {
    if (editingId) {
      const msg = messages.find((m) => m.id === editingId);
      if (msg) {
        setInputText(msg.content);
        if (msg.attachments) {
          setExistingAttachments(msg.attachments);
        }
      }
      setDeletedAttachIds([]);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Перемещаем курсор в конец текста
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 100);
    } else {
      setExistingAttachments([]);
      setDeletedAttachIds([]);
    }
  }, [editingId, messages]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setInputText('');
    setFiles([]);
  }, [setEditingId, setInputText, setFiles]);

  const removeNewFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [setFiles],
  );

  const toggleDeleteExisting = useCallback((id: number) => {
    setDeletedAttachIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]),
    );
  }, []);

  const canSend = useMemo(() => {
    const hasText = inputText.trim().length > 0;
    const hasNewFiles = files.length > 0;
    const hasRemainingFiles = existingAttachments.length > deletedAttachIds.length;
    return hasText || hasNewFiles || hasRemainingFiles;
  }, [inputText, files, existingAttachments, deletedAttachIds]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const content = refInputText.current;
    const formData = new FormData();

    formData.append('content', content);
    files.forEach((f) => formData.append('attachments', f));

    try {
      if (editingId) {
        formData.append('id', editingId.toString());
        formData.append('delete_attachments', deletedAttachIds.join(','));
        await axios.post(`${API_BASE}/messages/update`, formData);
        showSnackbar('Сообщение обновлено', 'success');
      } else {
        // Добавляем активные теги к новому сообщению
        let finalContent = content;
        currentTags.forEach((tag) => {
          if (!finalContent.includes(`#${tag}`)) finalContent += ` #${tag}`;
        });
        formData.set('content', finalContent);
        await axios.post(`${API_BASE}/messages/send`, formData);
      }

      setInputText('');
      setFiles([]);
      setEditingId(null);
      fetchMessages(true);
    } catch (e) {
      showSnackbar('Ошибка при сохранении', 'error');
    }
  }, [
    canSend,
    editingId,
    files,
    deletedAttachIds,
    currentTags,
    fetchMessages,
    showSnackbar,
    setEditingId,
    setFiles,
    setInputText,
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

  // Drag & Drop логика
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

  return (
    <Paper
      square
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: isDragging ? '#1a1f24' : '#121212',
        borderTop: '1px solid',
        borderColor: editingId ? 'rgba(144, 202, 249, 0.5)' : '#2c2c2e',
        zIndex: 1000,
        transition: 'background-color 0.2s',
      }}
    >
      <Container maxWidth="sm" disableGutters>
        {editingId && (
          <Box
            sx={{
              px: 2,
              py: 0.5,
              bgcolor: 'rgba(144, 202, 249, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Edit sx={{fontSize: 14, color: '#90caf9'}} />
            <Typography variant="caption" sx={{color: '#90caf9', fontWeight: 600}}>
              РЕДАКТИРОВАНИЕ
            </Typography>
            <Box sx={{flexGrow: 1}} />
            <IconButton size="small" onClick={cancelEditing}>
              <Close sx={{fontSize: 16, color: '#90caf9'}} />
            </IconButton>
          </Box>
        )}

        {/* СУЩЕСТВУЮЩИЕ ВЛОЖЕНИЯ — адаптированы под тач */}
        {existingAttachments.length > 0 && editingId && (
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              px: 2,
              pt: 1.5,
              overflowX: 'auto',
              '&::-webkit-scrollbar': {display: 'none'},
            }}
          >
            {existingAttachments.map((att) => {
              const isDeleted = deletedAttachIds.includes(att.id);
              return (
                <Box
                  key={att.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '42px',
                    bgcolor: isDeleted ? 'rgba(255, 69, 58, 0.1)' : '#1c1c1e',
                    pl: 2,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isDeleted ? '#ff453a' : '#2c2c2e',
                    opacity: isDeleted ? 0.6 : 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    title={att.file_path.split('_').slice(1).join('_')}
                    sx={{
                      color: isDeleted ? '#ff453a' : '#efefef',
                      maxWidth: 150,
                      fontSize: '0.85rem',
                    }}
                    noWrap
                  >
                    {att.file_path.split('_').slice(1).join('_')}
                  </Typography>
                  <IconButton onClick={() => toggleDeleteExisting(att.id)} sx={{ml: 0.5}}>
                    {isDeleted ? (
                      <Close sx={{fontSize: 22, color: '#ff453a'}} />
                    ) : (
                      <DeleteForever sx={{fontSize: 22, color: '#8e8e93'}} />
                    )}
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}

        {/* КРАСИВЫЙ СПИСОК НОВЫХ ФАЙЛОВ — адаптирован под тач */}
        {files.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1.5, // Увеличили расстояние между файлами
              px: 2,
              pt: 1.5,
              pb: 0.5,
              overflowX: 'auto',
              '&::-webkit-scrollbar': {display: 'none'},
            }}
          >
            {files.map((file, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#1c1c1e',
                  pl: 2, // Больше отступ слева
                  pr: 0.5,
                  py: 0.5, // Добавили вертикальный отступ для высоты
                  borderRadius: '8px',
                  border: '1px solid #90caf9',
                  minWidth: 'fit-content',
                  height: '42px', // Фиксированная высота для удобства нажатия
                }}
              >
                <Typography
                  variant="body2"
                  title={file.name}
                  sx={{color: '#90caf9', maxWidth: 150, fontSize: '0.9rem'}}
                  noWrap
                >
                  {file.name}
                </Typography>
                <IconButton
                  size="medium" // Увеличили размер кнопки
                  onClick={() => removeNewFile(idx)}
                  sx={{ml: 1, color: '#90caf9'}}
                >
                  <Close sx={{fontSize: 20}} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* ЭСТЕТИЧНЫЕ ТЕГИ — адаптированы под тач */}
        {currentTags.length > 0 && !editingId && (
          <Box sx={{px: 2, pt: 1.5, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap'}}>
            {currentTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => setCurrentTags((prev) => prev.filter((t) => t !== tag))}
                // Убрали size="small" для стандартного (крупного) размера
                sx={{
                  bgcolor: 'rgba(144, 202, 249, 0.08)',
                  color: '#90caf9',
                  border: '1px solid rgba(144, 202, 249, 0.2)',
                  borderRadius: '6px', // Более строгий радиус
                  fontWeight: 600,
                  fontSize: '0.85rem', // Крупнее шрифт
                  height: '36px', // Комфортная высота для тапа
                  '& .MuiChip-deleteIcon': {
                    fontSize: 20, // Увеличили крестик
                    color: '#90caf9',
                    ml: 1,
                    mr: 0.5,
                    '&:hover': {color: '#fff'},
                  },
                  '& .MuiChip-label': {px: 1.5}, // Больше места для текста
                }}
              />
            ))}
          </Box>
        )}

        <Box sx={{display: 'flex', alignItems: 'flex-end', px: 0.5, pb: 0.5}}>
          <IconButton component="label" sx={{color: '#8e8e93', mb: 0.5}}>
            <AttachFile sx={{transform: 'rotate(45deg)'}} />
            <input
              hidden
              multiple
              type="file"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
          </IconButton>

          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={10}
            variant="standard"
            placeholder={isDragging ? 'Сбросьте файлы...' : 'Заметка...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {color: '#fff', py: 1.5, px: 1, fontSize: '0.95rem'},
              },
            }}
          />

          <IconButton
            onClick={handleSend}
            disabled={!canSend}
            sx={{color: '#90caf9', mb: 0.5, '&.Mui-disabled': {color: '#3a3a3c'}}}
          >
            {editingId ? <Check sx={{fontSize: 28}} /> : <Send sx={{fontSize: 26}} />}
          </IconButton>
        </Box>
      </Container>
    </Paper>
  );
};

export default BottomInputForm;
