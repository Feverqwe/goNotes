import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';

// MUI Core Components
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  createTheme,
  CssBaseline,
  Snackbar,
  Stack,
  ThemeProvider,
} from '@mui/material';

// MUI Icons
// Markdown & Syntax Highlighting
import {AlertColor} from '@mui/material/Alert/Alert';
import {Note} from './types';
import MessageItem from './components/MessageItem/MessageItem';
import {API_BASE} from './constants';
import {SnackCtx} from './ctx/SnackCtx';
import TagsMenu from './components/TagsMenu/TagsMenu';
import SearchBox from './components/SearchBox/SearchBox';
import BottomInputForm from './components/BottomInputForm/BottomInputForm';
import MultiSelectMenu from './components/MultiSelectMenu/MultiSelectMenu';
import NoteMenu from './components/NoteMenu/NoteMenu';
import BatchDeleteDialog from './components/BatchDeleteDialog/BatchDeleteDialog';
import DeleteDialog from './components/DeleteDialog/DeleteDialog';

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

            requestAnimationFrame(() => {
              window.scrollTo(0, document.documentElement.scrollHeight - scrollPos);
            });
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

  const startEditing = useCallback((msg: Note) => {
    setEditingId(msg.id);
    setInputText(msg.content);
    // Скроллим к полю ввода
    window.scrollTo({top: document.documentElement.scrollHeight});
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
      <SnackCtx.Provider value={showSnackbar}>
        <CssBaseline />
        <Box sx={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
          <SearchBox
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentTags={currentTags}
            handleOpenTagMenu={handleOpenTagMenu}
          />

          <Container
            maxWidth="sm"
            sx={{flexGrow: 1, pt: 2, pb: 9 + (files.length ? 7 : 0) + (currentTags.length ? 5 : 0)}}
          >
            {hasMore && (
              <Box sx={{display: 'flex', justifyContent: 'center', p: 2}}>
                <CircularProgress size={20} />
              </Box>
            )}

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
          </Container>

          <BottomInputForm
            editingId={editingId}
            setEditingId={setEditingId}
            files={files}
            currentTags={currentTags}
            setCurrentTags={setCurrentTags}
            setFiles={setFiles}
            inputText={inputText}
            setInputText={setInputText}
            fetchMessages={fetchMessages}
          />

          {isSelectMode && (
            <MultiSelectMenu
              cancelSelectMode={cancelSelectMode}
              selectedIds={selectedIds}
              askBatchDeleteConfirmation={askBatchDeleteConfirmation}
            />
          )}
        </Box>

        <NoteMenu
          anchorEl={anchorEl}
          handleCloseMenu={handleCloseMenu}
          selectedMsg={selectedMsg}
          enterSelectMode={enterSelectMode}
          handleCopy={handleCopy}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
        />

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

        <DeleteDialog
          deleteDialogOpen={deleteDialogOpen}
          closeDeleteDialog={closeDeleteDialog}
          confirmDelete={confirmDelete}
        />

        <BatchDeleteDialog
          deleteBatchDialogOpen={deleteBatchDialogOpen}
          closeBatchDeleteDialog={closeBatchDeleteDialog}
          selectedIds={selectedIds}
          confirmBatchDelete={confirmBatchDelete}
        />

        <TagsMenu
          tagMenuAnchor={tagMenuAnchor}
          handleCloseTagMenu={handleCloseTagMenu}
          currentTags={currentTags}
          setCurrentTags={setCurrentTags}
          allTags={allTags}
          toggleTag={toggleTag}
        />
      </SnackCtx.Provider>
    </ThemeProvider>
  );
}

export default App;
