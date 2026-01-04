import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';

// MUI Core Components
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  createTheme,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from '@mui/material';

// MUI Icons
import {
  AttachFile,
  Check,
  CheckCircleOutline,
  Clear,
  Close,
  ContentCopy,
  Delete,
  Edit,
  FilterList,
  Send,
  Tag as TagIcon,
} from '@mui/icons-material';

// Markdown & Syntax Highlighting
import {AlertColor} from '@mui/material/Alert/Alert';
import {Note} from './types';
import MessageItem from './components/MessageItem/MessageItem';
import {API_BASE} from './constants';
import {SnackCtx} from './ctx/SnackCtx';

const LIMIT = 6; // Сколько сообщений грузим за раз

function App() {
  const [allTags, setAllTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tagsStr = params.get('q');
    return tagsStr ?? '';
  });
  const refSearchQuery = useRef(searchQuery);
  refSearchQuery.current = searchQuery;

  const [messages, setMessages] = useState<Note[]>([]);
  const refMessages = useRef<Note[]>(messages);
  refMessages.current = messages;

  const [inputText, setInputText] = useState('');
  const refInputText = useRef(inputText);
  refInputText.current = inputText;

  const [files, setFiles] = useState<File[]>([]);

  const [currentTags, setCurrentTags] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tagsStr = params.get('tags');
    return tagsStr ? tagsStr.split(',') : [];
  });
  const refCurrentTags = useRef(currentTags);
  refCurrentTags.current = currentTags;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Note | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');

  // Состояния для диалога подтверждения
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<number | null>(null);
  const refGoBack = useRef(false);

  const [deleteBatchDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]); // Массив ID выбранных сообщений
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [tagMenuAnchor, setTagMenuAnchor] = useState<HTMLButtonElement | null>(null);

  const handleOpenTagMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setTagMenuAnchor(event.currentTarget);
  }, []);
  const handleCloseTagMenu = useCallback(() => setTagMenuAnchor(null), []);

  const observer = useRef<IntersectionObserver | undefined>(undefined);

  const handleCloseSnackbar = useCallback((event: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/tags/list`);
      setAllTags(res.data);
    } catch (e) {
      console.error('Ошибка загрузки тегов', e);
      showSnackbar('Не удалось загрузить теги', 'error');
    }
  }, [showSnackbar]);

  // Вызываем при старте и после изменений данных
  useEffect(() => {
    fetchTags();
  }, [messages, fetchTags]); // Обновляем список, если изменились сообщения

  // 3. Обработка кнопок "Назад/Вперед" в браузере
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tags = params.get('tags');
      const searchQuery = params.get('q');
      refGoBack.current = true;
      setCurrentTags(tags ? tags.split(',') : []);
      setSearchQuery(searchQuery ?? '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Слушаем сообщение от Service Worker о том, что нам что-то "расшарили"
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.action === 'load-shared-files') {
        const sharedFiles = event.data.files as File[]; // Массив файлов из другого приложения
        setFiles((prev) => [...prev, ...sharedFiles]);
        if (event.data.text) setInputText(event.data.text);
      }
    });
  }, []);

  // Функция открытия диалога
  const askDeleteConfirmation = useCallback((id: number) => {
    setMsgToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  // Функция закрытия диалога
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setMsgToDelete(null);
  }, []);

  // Функция открытия диалога
  const askBatchDeleteConfirmation = useCallback(() => {
    setBatchDeleteDialogOpen(true);
  }, []);

  // Функция закрытия диалога
  const closeBatchDeleteDialog = useCallback(() => {
    setBatchDeleteDialogOpen(false);
  }, []);

  // Функция для удаления файла из списка выбранных перед отправкой
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Проверка: можно ли отправить (текст НЕ пустой ИЛИ есть файлы)
  const canSend = useMemo(
    () => inputText.trim().length > 0 || files.length > 0,
    [inputText, files.length],
  );

  const scrollToBottom = useCallback(() => {
    window.scrollTo({top: document.documentElement.scrollHeight});
  }, []);

  // Загрузка сообщений
  const fetchMessages = useCallback(
    async (isInitial = false) => {
      setIsLoading(true);
      const messages = refMessages.current;
      const currentTags = refCurrentTags.current;
      const searchQuery = refSearchQuery.current;
      try {
        const lastId = !isInitial && messages.length > 0 ? messages[0].id : 0;

        const res = await axios.get(`${API_BASE}/messages/list`, {
          params: {
            limit: LIMIT,
            last_id: lastId,
            tags: currentTags.join(','),
            q: searchQuery,
          },
        });

        const newMessages = res.data;

        if (isInitial) {
          setMessages(newMessages);
          setHasMore(newMessages.length === LIMIT);
          requestAnimationFrame(scrollToBottom);
        } else {
          if (newMessages.length > 0) {
            const scrollPos = document.documentElement.scrollHeight - window.scrollY;

            setMessages((prev) => [...newMessages, ...prev]);

            requestAnimationFrame(() =>
              window.scrollTo(0, document.documentElement.scrollHeight - scrollPos),
            );
          }
          if (newMessages.length < LIMIT) setHasMore(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [scrollToBottom],
  );

  // Сама функция удаления (обновленная)
  const confirmDelete = useCallback(async () => {
    if (!msgToDelete) return;

    try {
      await axios.delete(`${API_BASE}/messages/delete`, {params: {id: msgToDelete}});
      fetchMessages(true);
      showSnackbar('Заметка удалена', 'info');
    } catch (e) {
      showSnackbar('Ошибка при удалении', 'error');
    } finally {
      closeDeleteDialog();
    }
  }, [fetchMessages, msgToDelete, closeDeleteDialog, showSnackbar]);

  // Синхронизация с URL и загрузка данных
  useEffect(() => {
    // 1. Мгновенно обновляем URL
    if (!refGoBack.current) {
      const url = new URL(window.location.href);

      // Работа с тегами
      if (currentTags.length > 0) {
        url.searchParams.set('tags', currentTags.join(','));
      } else {
        url.searchParams.delete('tags');
      }

      // Работа с поиском (q)
      if (searchQuery) {
        url.searchParams.set('q', searchQuery);
      } else {
        url.searchParams.delete('q');
      }

      window.history.pushState({}, '', url);
    }

    refGoBack.current = false;

    // 2. Дебаунс загрузки данных (особенно важно для поиска)
    const delayDebounceFn = setTimeout(() => {
      setHasMore(true);
      fetchMessages(true); // Загружаем с нуля при любом изменении фильтров
    }, 400); // 400мс — оптимальное время задержки

    // Очистка таймера при следующем изменении (если пользователь нажал клавишу быстрее чем 400мс)
    return () => clearTimeout(delayDebounceFn);
  }, [currentTags, searchQuery, fetchMessages]); // Добавили searchQuery в зависимости

  // Коллбэк для отслеживания самого верхнего элемента
  const firstMessageRef = useCallback(
    (node: Element) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMessages(false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, fetchMessages],
  );

  // Только темная тема
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {main: '#90caf9'},
          background: {default: '#000', paper: '#121212'},
        },
        // Глобальное отключение эффектов
        components: {
          MuiButtonBase: {
            defaultProps: {
              disableRipple: true, // Отключает пульсацию для всех кнопок и иконок
            },
          },
          MuiButton: {
            defaultProps: {
              disableElevation: true, // Опционально: убирает тени у кнопок для плоского стиля
            },
          },
        },
      }),
    [],
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
  }, [canSend, currentTags, editingId, fetchMessages, files, showSnackbar]);

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

  const startEditing = useCallback((msg: Note) => {
    setEditingId(msg.id);
    setInputText(msg.content);
    // Скроллим к полю ввода
    window.scrollTo({top: document.documentElement.scrollHeight});
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setInputText('');
  }, []);

  const handleOpenMenu = useCallback((event: React.MouseEvent, msg: Note) => {
    setAnchorEl(event.currentTarget);
    setSelectedMsg(msg);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setSelectedMsg(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (selectedMsg) {
      navigator.clipboard.writeText(selectedMsg.content);
      handleCloseMenu();
      showSnackbar('Текст скопирован в буфер обмена', 'success');
    }
  }, [selectedMsg, handleCloseMenu, showSnackbar]);

  const onEditClick = useCallback(() => {
    if (!selectedMsg) return;
    startEditing(selectedMsg);
    handleCloseMenu();
  }, [selectedMsg, handleCloseMenu, startEditing]);

  const onDeleteClick = useCallback(() => {
    if (!selectedMsg) return;
    askDeleteConfirmation(selectedMsg.id);
    handleCloseMenu();
  }, [selectedMsg, handleCloseMenu, askDeleteConfirmation]);

  const toggleTag = useCallback((tag: string) => {
    setCurrentTags((prev) => {
      if (prev.includes(tag)) {
        // Если тег уже есть — удаляем его
        return prev.filter((t) => t !== tag);
      }
      // Если нет — добавляем в массив
      return [...prev, tag];
    });
  }, []);

  // Функция переключения выбора
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  // Вход в режим выбора через меню
  const enterSelectMode = useCallback(
    (msg: Note) => {
      setIsSelectMode(true);
      setSelectedIds([msg.id]);
      handleCloseMenu();
    },
    [handleCloseMenu],
  );

  const cancelSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds([]);
  }, []);

  const confirmBatchDelete = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/messages/batch-delete`, {ids: selectedIds});
      fetchMessages(true);
      showSnackbar(`Удалено сообщений: ${selectedIds.length}`, 'info');
      cancelSelectMode();
    } catch (e) {
      showSnackbar('Ошибка при массовом удалении', 'error');
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  }, [fetchMessages, cancelSelectMode, selectedIds, showSnackbar]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
        <Paper
          square
          elevation={0}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 11,
            // Более глубокое размытие и мягкий фон
            bgcolor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            p: 1.5, // Увеличим отступы для «воздуха»
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              maxWidth: 'sm',
              mx: 'auto',
              transition: 'all 0.3s ease',
            }}
          >
            <TextField
              fullWidth
              size="small"
              variant="standard"
              placeholder="Поиск заметок..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  disableUnderline: true,
                  startAdornment: (
                    <Badge
                      badgeContent={currentTags.length}
                      color="primary"
                      // Настроим Badge, чтобы он был аккуратнее
                      sx={{
                        mr: 1,
                        '& .MuiBadge-badge': {
                          fontSize: '0.6rem',
                          height: 16,
                          minWidth: 16,
                          top: 4,
                          right: 4,
                          border: '2px solid #1c1c1e',
                        },
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={handleOpenTagMenu}
                        sx={{
                          color: currentTags.length > 0 ? '#90caf9' : '#8e8e93',
                          transition: 'color 0.2s',
                          bgcolor:
                            currentTags.length > 0 ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                          '&:hover': {bgcolor: 'rgba(255,255,255,0.05)'},
                        }}
                      >
                        <FilterList sx={{fontSize: 20}} />
                      </IconButton>
                    </Badge>
                  ),
                  endAdornment: searchQuery && (
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      sx={{color: '#8e8e93', '&:hover': {color: '#efefef'}}}
                    >
                      <Clear sx={{fontSize: 18}} />
                    </IconButton>
                  ),
                  sx: {
                    bgcolor: '#1c1c1e',
                    px: 1.5,
                    py: 0.8, // Чуть больше высоты для современного вида
                    borderRadius: '12px', // Более скругленные углы
                    border: '1px solid transparent',
                    transition: 'all 0.2s ease-in-out',
                    '&:focus-within': {
                      bgcolor: '#252527',
                      border: '1px solid rgba(144, 202, 249, 0.3)',
                      boxShadow: '0 0 0 2px rgba(144, 202, 249, 0.05)',
                    },
                  },
                },
              }}
            />
          </Box>
        </Paper>

        <Container
          maxWidth="sm"
          sx={{flexGrow: 1, pt: 2, pb: 9 + (files.length ? 7 : 0) + (currentTags.length ? 5 : 0)}}
        >
          {hasMore && (
            <Box sx={{display: 'flex', justifyContent: 'center', p: 2}}>
              <CircularProgress size={20} />
            </Box>
          )}

          <SnackCtx.Provider value={showSnackbar}>
            <Stack spacing={1.5}>
              {messages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  onTagClick={setCurrentTags}
                  firstRef={index === 0 ? firstMessageRef : null}
                  handleOpenMenu={handleOpenMenu}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                />
              ))}
            </Stack>
          </SnackCtx.Provider>
        </Container>

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
                  background:
                    'linear-gradient(90deg, rgba(144, 202, 249, 0.1) 0%, transparent 100%)',
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
                  onChange={(e) =>
                    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])
                  }
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

        {isSelectMode && (
          <Paper
            square
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: '#1c1c1e',
              borderTop: '1px solid #90caf9',
              zIndex: 1100,
              p: 1,
              animation: 'slideUp 0.3s ease',
            }}
          >
            <Container
              maxWidth="sm"
              sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
            >
              <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                <IconButton onClick={cancelSelectMode} color="inherit">
                  <Close />
                </IconButton>
                <Typography variant="body1" sx={{fontWeight: 'bold'}}>
                  Выбрано: {selectedIds.length}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="error"
                disabled={selectedIds.length === 0}
                startIcon={<Delete />}
                onClick={askBatchDeleteConfirmation}
                sx={{borderRadius: '12px', textTransform: 'none'}}
              >
                Удалить
              </Button>
            </Container>
          </Paper>
        )}
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transitionDuration={150}
        slotProps={{
          // Убираем стандартные отступы списка, чтобы кастомизировать их
          list: {sx: {py: 0.8}},
          paper: {
            sx: {
              bgcolor: 'rgba(28, 28, 30, 0.85)', // Стекло
              backdropFilter: 'blur(25px)', // Сильный блюр
              minWidth: 220,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              backgroundImage: 'none', // Убираем стандартное наложение MUI
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (!selectedMsg) return;
            enterSelectMode(selectedMsg);
          }}
          sx={{
            mx: 1,
            my: 0.2,
            borderRadius: '10px',
            transition: 'all 0.2s',
            '&:hover': {bgcolor: 'rgba(144, 202, 249, 0.12)'},
          }}
        >
          <ListItemIcon sx={{minWidth: '36px !important'}}>
            <CheckCircleOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText slotProps={{primary: {fontSize: '0.9rem', color: '#efefef'}}}>
            Выбрать
          </ListItemText>
        </MenuItem>

        <MenuItem
          onClick={handleCopy}
          sx={{
            mx: 1,
            my: 0.2,
            borderRadius: '10px',
            transition: 'all 0.2s',
            '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.08)'},
          }}
        >
          <ListItemIcon sx={{minWidth: '36px !important'}}>
            <ContentCopy fontSize="small" sx={{color: '#efefef'}} />
          </ListItemIcon>
          <ListItemText
            primary="Копировать"
            slotProps={{primary: {fontSize: '0.9rem', color: '#efefef'}}}
          />
        </MenuItem>

        <MenuItem
          onClick={onEditClick}
          sx={{
            mx: 1,
            my: 0.2,
            borderRadius: '10px',
            transition: 'all 0.2s',
            '&:hover': {bgcolor: 'rgba(144, 202, 249, 0.12)'},
          }}
        >
          <ListItemIcon sx={{minWidth: '36px !important'}}>
            <Edit fontSize="small" sx={{color: '#90caf9'}} />
          </ListItemIcon>
          <ListItemText
            primary="Изменить"
            slotProps={{primary: {fontSize: '0.9rem', color: '#efefef'}}}
          />
        </MenuItem>

        {/* Разделитель перед опасным действием */}
        <Box sx={{height: '1px', bgcolor: 'rgba(255, 255, 255, 0.05)', my: 0.8, mx: 2}} />

        <MenuItem
          onClick={onDeleteClick}
          sx={{
            mx: 1,
            my: 0.2,
            borderRadius: '10px',
            transition: 'all 0.2s',
            '&:hover': {bgcolor: 'rgba(255, 69, 58, 0.15)'},
          }}
        >
          <ListItemIcon sx={{minWidth: '36px !important'}}>
            <Delete fontSize="small" sx={{color: '#ff453a'}} />
          </ListItemIcon>
          <ListItemText
            primary="Удалить"
            slotProps={{
              primary: {
                fontSize: '0.9rem',
                color: '#ff453a',
                fontWeight: 600,
              },
            }}
          />
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{width: '100%', bgcolor: theme.palette.background.paper}}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} transitionDuration={250}>
        <DialogTitle
          sx={{
            color: '#fff',
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.1rem',
            pb: 1,
          }}
        >
          Удалить заметку?
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            Это действие нельзя отменить. <br />
            Все вложения будут стерты.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={confirmDelete} fullWidth variant="text" color="error">
            Удалить
          </Button>

          <Button onClick={closeDeleteDialog} fullWidth variant="text">
            Отмена
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteBatchDialogOpen}
        onClose={closeBatchDeleteDialog}
        transitionDuration={250}
      >
        <DialogTitle
          sx={{
            color: '#fff',
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.1rem',
            pb: 1,
          }}
        >
          Удалить {selectedIds.length} сообщений?
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            Это действие нельзя отменить. <br />
            Все вложения будут стерты.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={confirmBatchDelete} fullWidth variant="text" color="error">
            Удалить
          </Button>

          <Button onClick={closeBatchDeleteDialog} fullWidth variant="text">
            Отмена
          </Button>
        </DialogActions>
      </Dialog>

      {/* МЕНЮ ТЕГОВ — ДИЗАЙН УРОВНЯ 2026 */}
      <Menu
        anchorEl={tagMenuAnchor}
        open={Boolean(tagMenuAnchor)}
        onClose={handleCloseTagMenu}
        transitionDuration={250}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(20, 20, 22, 0.8)',
              backdropFilter: 'blur(25px) saturate(180%)', // Более сочный блюр
              minWidth: 260,
              maxHeight: 500,
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              mt: 1.5,
              overflow: 'hidden',
              backgroundImage: 'none',
            },
          },
        }}
      >
        {/* Кастомный заголовок с кнопкой закрытия */}
        <Box
          sx={{
            px: 2.5,
            pt: 2,
            pb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <FilterList sx={{fontSize: 18, color: '#90caf9'}} />
            ФИЛЬТРЫ
          </Typography>

          {currentTags.length > 0 && (
            <Typography
              variant="caption"
              onClick={() => setCurrentTags([])}
              sx={{
                color: '#90caf9',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 600,
                '&:hover': {textDecoration: 'underline'},
              }}
            >
              Сбросить ({currentTags.length})
            </Typography>
          )}
        </Box>

        {/* Список тегов в виде сетки или списка */}
        <Box
          sx={{
            px: 1,
            pb: 1.5,
            maxHeight: 380,
            overflowY: 'auto',
            // Стилизация скроллбара
            '&::-webkit-scrollbar': {width: '4px'},
            '&::-webkit-scrollbar-thumb': {bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px'},
          }}
        >
          {allTags.length === 0 ? (
            <Box sx={{py: 4, textAlign: 'center', opacity: 0.5}}>
              <TagIcon sx={{fontSize: 40, mb: 1}} />
              <Typography variant="body2">Теги еще не созданы</Typography>
            </Box>
          ) : (
            <Stack spacing={0.5}>
              {allTags.map((tag) => {
                const isActive = currentTags.includes(tag);
                return (
                  <MenuItem
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    disableRipple // Отключаем стандартный рипл для чистоты
                    sx={{
                      borderRadius: '12px',
                      py: 1,
                      px: 1.5,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid',
                      borderColor: isActive ? 'rgba(144, 202, 249, 0.3)' : 'transparent',
                      bgcolor: isActive ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive
                          ? 'rgba(144, 202, 249, 0.12)'
                          : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{minWidth: '32px !important'}}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: isActive ? '#90caf9' : 'rgba(255,255,255,0.05)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {isActive ? (
                          <Check sx={{fontSize: 16, color: '#000'}} />
                        ) : (
                          <Typography sx={{fontSize: 12, color: '#8e8e93', fontWeight: 'bold'}}>
                            #
                          </Typography>
                        )}
                      </Box>
                    </ListItemIcon>

                    <ListItemText
                      primary={tag}
                      slotProps={{
                        primary: {
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? '#fff' : '#8e8e93',
                          sx: {transition: 'color 0.3s'},
                        },
                      }}
                    />

                    {/* Точка-индикатор активного состояния */}
                    {isActive && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: '#90caf9',
                          boxShadow: '0 0 10px #90caf9',
                        }}
                      />
                    )}
                  </MenuItem>
                );
              })}
            </Stack>
          )}
        </Box>
      </Menu>
    </ThemeProvider>
  );
}

export default App;
