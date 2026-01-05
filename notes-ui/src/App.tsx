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
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {arrayMove, SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {Note} from './types';
import MessageItem from './components/MessageItem/MessageItem';
import {API_BASE, themeProps} from './constants';
import {SnackCtx} from './ctx/SnackCtx';
import TagsMenu from './components/TagsMenu/TagsMenu';
import SearchBox from './components/SearchBox/SearchBox';
import BottomInputForm from './components/BottomInputForm/BottomInputForm';
import MultiSelectMenu from './components/MultiSelectMenu/MultiSelectMenu';
import NoteMenu from './components/NoteMenu/NoteMenu';
import BatchDeleteDialog from './components/BatchDeleteDialog/BatchDeleteDialog';
import DeleteDialog from './components/DeleteDialog/DeleteDialog';
import EmptyState from './components/EmptyState/EmptyState';

import ReorderMenu from './components/ReorderMenu/ReorderMenu';

const LIMIT = 6; // Сколько сообщений грузим за раз

function App() {
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

  const [files, setFiles] = useState<File[]>([]);

  const [currentTags, setCurrentTags] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tagsStr = params.get('tags');
    return tagsStr ? tagsStr.split(',') : [];
  });
  const refCurrentTags = useRef(currentTags);
  refCurrentTags.current = currentTags;

  const [showArchived, setShowArchived] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('archived') === '1';
  });
  const refShowArchived = useRef(showArchived);
  refShowArchived.current = showArchived;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Note | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const refHasMore = useRef(hasMore);
  refHasMore.current = hasMore;

  const [isLoading, setIsLoading] = useState(true);
  const refIsLoading = useRef(isLoading);
  refIsLoading.current = isLoading;

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');

  // Состояния для диалога подтверждения
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<number | null>(null);
  const refMsgToDelete = useRef(msgToDelete);
  refMsgToDelete.current = msgToDelete;

  const refGoBack = useRef(false);

  const [deleteBatchDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]); // Массив ID выбранных сообщений
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [tagMenuAnchor, setTagMenuAnchor] = useState<HTMLButtonElement | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const handleOpenTagMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setTagMenuAnchor(event.currentTarget);
  }, []);
  const handleCloseTagMenu = useCallback(() => setTagMenuAnchor(null), []);

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

  // Загрузка сообщений
  const fetchMessages = useCallback(async (isInitial = false) => {
    setIsLoading(true);
    const messages = refMessages.current;
    const currentTags = refCurrentTags.current;
    const searchQuery = refSearchQuery.current;
    const showArchived = refShowArchived.current;
    try {
      const lastOrder =
        !isInitial && messages.length > 0 ? messages[messages.length - 1].sort_order : 0;

      const res = await axios.get(`${API_BASE}/messages/list`, {
        params: {
          limit: LIMIT,
          last_order: lastOrder,
          tags: currentTags.join(','),
          q: searchQuery,
          archived: showArchived ? '1' : '0',
        },
      });

      const newMessages = res.data;

      if (isInitial) {
        setMessages(newMessages);
        setHasMore(newMessages.length === LIMIT);
      } else {
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
        }
        if (newMessages.length < LIMIT) setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Синхронизация с URL и загрузка данных
  useEffect(() => {
    // 1. Мгновенно обновляем URL
    if (!refGoBack.current) {
      const url = new URL(window.location.href);

      if (showArchived) {
        url.searchParams.set('archived', '1');
      } else {
        url.searchParams.delete('archived');
      }

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

      window.history.replaceState({}, '', url);
    }

    refGoBack.current = false;

    // 2. Дебаунс загрузки данных (особенно важно для поиска)
    const delayDebounceFn = setTimeout(() => {
      setHasMore(true);
      fetchMessages(true); // Загружаем с нуля при любом изменении фильтров
    }, 400); // 400мс — оптимальное время задержки

    // Очистка таймера при следующем изменении (если пользователь нажал клавишу быстрее чем 400мс)
    return () => clearTimeout(delayDebounceFn);
  }, [currentTags, searchQuery, fetchMessages, showArchived]); // Добавили searchQuery в зависимости

  // Только темная тема
  const theme = useMemo(() => createTheme(themeProps), []);

  const startEditing = useCallback((msg: Note) => {
    setEditingId(msg.id);
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

  // Вход в режим выбора через меню
  const enterReorderMode = useCallback(() => {
    setIsReorderMode(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const cancelReorderMode = useCallback(() => {
    setIsReorderMode(false);
  }, []);

  const onArchiveClick = useCallback(async () => {
    if (!selectedMsg) return;
    const newStatus = selectedMsg.is_archived ? 0 : 1;
    try {
      await axios.post(`${API_BASE}/messages/archive`, null, {
        params: {id: selectedMsg.id, archive: newStatus},
      });
      showSnackbar(newStatus ? 'Заметка в архиве' : 'Заметка восстановлена');
      fetchMessages(true); // Перезагружаем список
    } catch (e) {
      showSnackbar('Ошибка архивации', 'error');
    } finally {
      handleCloseMenu();
    }
  }, [selectedMsg, fetchMessages, showSnackbar, handleCloseMenu]);

  const hasActiveFilters = useMemo(
    () => searchQuery.length > 0 || currentTags.length > 0 || showArchived,
    [currentTags.length, searchQuery.length, showArchived],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {distance: 8}, // Чтобы не срабатывало при случайном клике
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setMessages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const saveOrder = useCallback(async () => {
    try {
      // Отправляем массив ID в новом порядке на бэкенд
      const ids = messages.map((m) => m.id);
      await axios.post(`${API_BASE}/messages/reorder`, {ids});
      showSnackbar('Порядок сохранен');
      setIsReorderMode(false);
    } catch (e) {
      showSnackbar('Ошибка сохранения порядка', 'error');
    }
  }, [messages, showSnackbar]);

  const moveStep = useCallback((id: number, direction: 'up' | 'down') => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;

      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;

      const newArray = [...prev];
      const [movedItem] = newArray.splice(idx, 1);
      newArray.splice(newIdx, 0, movedItem);
      return newArray;
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <SnackCtx.Provider value={showSnackbar}>
        <CssBaseline />
        <Box sx={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
          <SearchBox
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentTags={currentTags}
            setCurrentTags={setCurrentTags}
            handleOpenTagMenu={handleOpenTagMenu}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
          />

          <Container
            maxWidth="sm"
            sx={{
              flexGrow: 1,
              pt: 1,
              pb: 7.5 + (files.length ? 8 : 0) + (currentTags.length ? 7 : 0),
            }}
          >
            {messages.length === 0 && !isLoading && <EmptyState hasFilters={hasActiveFilters} />}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={messages.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={1.5}>
                  {messages.map((msg, index) => (
                    <MessageItem
                      key={msg.id}
                      msg={msg}
                      onTagClick={setCurrentTags}
                      isLast={index === messages.length - 1}
                      handleOpenMenu={handleOpenMenu}
                      isSelectMode={isSelectMode}
                      selectedIds={selectedIds}
                      toggleSelect={toggleSelect}
                      refIsLoading={refIsLoading}
                      refHasMore={refHasMore}
                      fetchMessages={fetchMessages}
                      startEditing={startEditing}
                      isReorderMode={isReorderMode}
                      index={index}
                      totalCount={messages.length}
                      moveStep={moveStep}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            {hasMore && (
              <Box sx={{display: 'flex', justifyContent: 'center', p: 2}}>
                <CircularProgress size={20} />
              </Box>
            )}
          </Container>

          <BottomInputForm
            editingId={editingId}
            setEditingId={setEditingId}
            files={files}
            currentTags={currentTags}
            setCurrentTags={setCurrentTags}
            setFiles={setFiles}
            fetchMessages={fetchMessages}
            messages={messages}
          />

          {isSelectMode && (
            <MultiSelectMenu
              cancelSelectMode={cancelSelectMode}
              selectedIds={selectedIds}
              askBatchDeleteConfirmation={askBatchDeleteConfirmation}
            />
          )}

          {isReorderMode && (
            <ReorderMenu cancelReorderMode={cancelReorderMode} saveOrder={saveOrder} />
          )}
        </Box>

        <NoteMenu
          anchorEl={anchorEl}
          handleCloseMenu={handleCloseMenu}
          selectedMsg={selectedMsg}
          enterSelectMode={enterSelectMode}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
          onArchiveClick={onArchiveClick}
          enterReorderMode={enterReorderMode}
        />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
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
          fetchMessages={fetchMessages}
          refMsgToDelete={refMsgToDelete}
        />

        <BatchDeleteDialog
          deleteBatchDialogOpen={deleteBatchDialogOpen}
          closeBatchDeleteDialog={closeBatchDeleteDialog}
          selectedIds={selectedIds}
          fetchMessages={fetchMessages}
          cancelSelectMode={cancelSelectMode}
        />

        <TagsMenu
          tagMenuAnchor={tagMenuAnchor}
          handleCloseTagMenu={handleCloseTagMenu}
          currentTags={currentTags}
          setCurrentTags={setCurrentTags}
          messages={messages}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
        />
      </SnackCtx.Provider>
    </ThemeProvider>
  );
}

export default App;
