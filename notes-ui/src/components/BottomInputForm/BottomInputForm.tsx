import React, {FC, useCallback, useContext, useMemo, useRef} from 'react';

import {Box, Chip, Container, IconButton, Paper, TextField, Typography} from '@mui/material';
import {AttachFile, Check, Close, Edit, Send} from '@mui/icons-material';
import axios from 'axios';
import {API_BASE} from '../../constants';
import {SnackCtx} from '../../ctx/SnackCtx';

interface BottomInputFormProps {
  editingId: number | null;
  files: File[];
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>;
  fetchMessages: (isInitial?: boolean) => Promise<void>;
}

const BottomInputForm: FC<BottomInputFormProps> = ({
  editingId,
  files,
  currentTags,
  setCurrentTags,
  setFiles,
  inputText,
  setInputText,
  setEditingId,
  fetchMessages,
}) => {
  const showSnackbar = useContext(SnackCtx);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setInputText('');
  }, [setEditingId, setInputText]);

  // Функция для удаления файла из списка выбранных перед отправкой
  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [setFiles],
  );

  const refInputText = useRef(inputText);
  refInputText.current = inputText;

  // Проверка: можно ли отправить (текст НЕ пустой ИЛИ есть файлы)
  const canSend = useMemo(
    () => inputText.trim().length > 0 || files.length > 0,
    [inputText, files.length],
  );

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const inputText = refInputText.current;

    if (editingId) {
      // ЛОГИКА ОБНОВЛЕНИЯ
      try {
        await axios.post(`${API_BASE}/messages/update`, {
          id: editingId,
          content: inputText,
        });
        setEditingId(null);
        setInputText('');
        fetchMessages(true); // Перегружаем, чтобы увидеть изменения
      } catch (e) {
        console.error(e);
        showSnackbar('Не удалось обновить сообщение', 'error');
      }
    } else {
      let content = inputText;
      currentTags.forEach((currentTag) => {
        if (currentTag && !content.includes(`#${currentTag}`)) {
          content += ` #${currentTag}`;
        }
      });

      const formData = new FormData();
      formData.append('content', content);
      files.forEach((f) => formData.append('attachments', f));

      try {
        await axios.post(`${API_BASE}/messages/send`, formData);
        setInputText('');
        setFiles([]); // Очищаем файлы после отправки
        fetchMessages(true);
      } catch (e) {
        console.error(e);
        showSnackbar('Не удалось отправить сообщение', 'error');
      }
    }
  }, [
    canSend,
    currentTags,
    editingId,
    fetchMessages,
    files,
    setEditingId,
    setFiles,
    setInputText,
    showSnackbar,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Проверяем, нажат ли Enter
      if (e.key === 'Enter') {
        // Проверяем нажатие Ctrl (Windows/Linux) или Meta (Cmd на Mac)
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault(); // Предотвращаем лишний перенос
          if (canSend) {
            handleSend();
          }
        }
        // Обычный Enter теперь всегда делает перенос строки автоматически,
        // так как мы не вызываем preventDefault() в остальных случаях.
      }
    },
    [handleSend, canSend],
  );

  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#121212',
        borderTop: '1px solid',
        borderColor: editingId ? 'rgba(144, 202, 249, 0.5)' : '#2c2c2e',
        zIndex: 1000,
        transition: 'border-color 0.3s ease',
      }}
    >
      <Container maxWidth="sm" disableGutters>
        {/* ИНДИКАТОР РЕДАКТИРОВАНИЯ (аккуратный градиент) */}
        {editingId && (
          <Box
            sx={{
              px: 2,
              py: 0.5,
              background: 'linear-gradient(90deg, rgba(144, 202, 249, 0.1) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Edit sx={{fontSize: 14, color: '#90caf9'}} />
            <Typography
              variant="caption"
              sx={{color: '#90caf9', fontWeight: 500, letterSpacing: 0.5}}
            >
              ИЗМЕНЕНИЕ ЗАМЕТКИ
            </Typography>
            <Box sx={{flexGrow: 1}} />
            <IconButton size="small" onClick={cancelEditing} sx={{color: '#90caf9'}}>
              <Close sx={{fontSize: 16}} />
            </IconButton>
          </Box>
        )}

        {/* КРАСИВЫЙ СПИСОК ФАЙЛОВ (в стиле вкладок) */}
        {files.length > 0 && !editingId && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              px: 2,
              py: 1.5,
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
                  gap: 1,
                  bgcolor: '#1c1c1e',
                  px: 1.5,
                  py: 0.8,
                  borderRadius: 3,
                  border: '1px solid #2c2c2e',
                  minWidth: 'fit-content',
                }}
              >
                <Typography variant="caption" sx={{color: '#efefef', maxWidth: 120}} noWrap>
                  {file.name}
                </Typography>
                <IconButton size="small" onClick={() => removeFile(idx)} color="error">
                  <Close sx={{fontSize: 14}} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* ЭСТЕТИЧНЫЕ ТЕГИ (Soft UI) */}
        {currentTags.length > 0 && (
          <Box sx={{px: 2, pt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap'}}>
            {currentTags.map((tag) => (
              <Chip
                key={tag}
                label={tag} // Убираем #, так как это дизайн-элемент
                onDelete={() => setCurrentTags((tags) => tags.filter((t) => t !== tag))}
                size="small"
                sx={{
                  bgcolor: 'rgba(144, 202, 249, 0.08)',
                  color: '#90caf9',
                  border: '1px solid rgba(144, 202, 249, 0.2)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  '& .MuiChip-deleteIcon': {color: '#90caf9', fontSize: 14},
                }}
              />
            ))}
          </Box>
        )}

        {/* ОСНОВНОЕ ПОЛЕ ВВОДА */}
        <Box sx={{display: 'flex', alignItems: 'flex-end', px: 1, pb: 1, pt: 0.5}}>
          <IconButton
            component="label"
            disabled={!!editingId}
            sx={{
              color: files.length > 0 ? '#90caf9' : '#8e8e93',
              mb: 0.3,
              transition: 'all 0.2s',
              visibility: editingId ? 'hidden' : 'visible',
              width: editingId ? 0 : 'auto',
            }}
          >
            <AttachFile sx={{transform: 'rotate(45deg)', fontSize: 24}} />
            <input
              hidden
              multiple
              type="file"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
          </IconButton>

          <TextField
            fullWidth
            multiline
            maxRows={10}
            variant="standard"
            placeholder={editingId ? 'Редактирование...' : 'Заметка...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  py: 1.2,
                  px: 1,
                  fontSize: '1.05rem',
                  color: '#fff', // Текст всегда белый
                  lineHeight: 1.4,
                },
              },
            }}
          />

          <IconButton
            onClick={handleSend}
            disabled={!canSend}
            sx={{
              color: '#90caf9',
              mb: 0.3,
              '&.Mui-disabled': {color: '#3a3a3c'},
            }}
          >
            {editingId ? <Check sx={{fontSize: 28}} /> : <Send sx={{fontSize: 26}} />}
          </IconButton>
        </Box>
      </Container>
    </Paper>
  );
};

export default BottomInputForm;
