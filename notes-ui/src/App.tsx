import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';

// MUI Core Components
import {Box, CircularProgress, Container, Stack} from '@mui/material';

// MUI Icons
// Markdown & Syntax Highlighting
import {closestCenter, DndContext, DragEndEvent} from '@dnd-kit/core';
import {arrayMove, SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {Note} from './types';
import MessageItem from './components/MessageItem/MessageItem';
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
import {api} from './tools/api';
import {useNotes} from './hooks/useNotes';
import {ArchiveMessageRequest, ReorderMessagesRequest} from './tools/types';

function App() {
  const queryClient = useQueryClient();
  const showSnackbar = useContext(SnackCtx); // Предположим, контекст снаружи или передан

  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tagsStr = params.get('q');
    return tagsStr ?? '';
  });
  const refSearchQuery = useRef(searchQuery);
  refSearchQuery.current = searchQuery;

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

  const [dndMessages, setDndMessages] = useState<Note[]>([]);
  const refDndMessages = useRef(dndMessages);
  refDndMessages.current = dndMessages;

  const handleOpenTagMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setTagMenuAnchor(event.currentTarget);
  }, []);
  const handleCloseTagMenu = useCallback(() => setTagMenuAnchor(null), []);

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

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useNotes({
    q: searchQuery,
    tags: currentTags,
    archived: showArchived,
  });
  const refIsLoading = useRef(isLoading);
  refIsLoading.current = isLoading;

  const serverMessages = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);
  const refServerMessages = useRef(serverMessages);
  refServerMessages.current = serverMessages;

  const refHasNextPage = useRef(hasNextPage);
  refHasNextPage.current = hasNextPage;

  // МУТАЦИЯ ДЛЯ АРХИВАЦИИ (пример частичного обновления)
  const reorderMutation = useMutation({
    mutationFn: (params: ReorderMessagesRequest) => api.messages.reorder(params),
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({queryKey: ['notes']});
      } finally {
        showSnackbar('Порядок сохранен');
        setIsReorderMode(false);
        setDndMessages([]);
      }
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка сохранения порядка', 'error');
    },
  });

  // МУТАЦИЯ ДЛЯ АРХИВАЦИИ (пример частичного обновления)
  const archiveMutation = useMutation({
    mutationFn: (params: ArchiveMessageRequest) => api.messages.archive(params),
    onSuccess: (_, {archive}) => {
      // Вместо перезагрузки всего, просто говорим Query, что данные устарели
      queryClient.invalidateQueries({queryKey: ['notes']});
      showSnackbar(archive ? 'Заметка в архиве' : 'Заметка восстановлена');
      handleCloseMenu();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка архивации', 'error');
      handleCloseMenu();
    },
  });

  // Метод для MessageItem, чтобы триггерить подгрузку
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      queryClient.invalidateQueries({queryKey: ['notes']});
    }, 400); // 400мс — оптимальное время задержки

    // Очистка таймера при следующем изменении (если пользователь нажал клавишу быстрее чем 400мс)
    return () => clearTimeout(delayDebounceFn);
  }, [currentTags, queryClient, searchQuery, showArchived]); // Добавили searchQuery в зависимости

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
    setDndMessages(refServerMessages.current);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const cancelReorderMode = useCallback(() => {
    setIsReorderMode(false);
    setDndMessages([]);
  }, []);

  const onArchiveClick = useCallback(async () => {
    if (!selectedMsg) return;

    archiveMutation.mutate({
      id: selectedMsg.id,
      archive: selectedMsg.is_archived ? 0 : 1, // Инвертируем текущий статус
    });

    handleCloseMenu();
  }, [archiveMutation, handleCloseMenu, selectedMsg]);

  const hasActiveFilters = useMemo(
    () => searchQuery.length > 0 || currentTags.length > 0 || showArchived,
    [currentTags.length, searchQuery.length, showArchived],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setDndMessages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const saveOrder = useCallback(async () => {
    const dndMessages = refDndMessages.current;
    const ids = dndMessages.map((m) => m.id);
    reorderMutation.mutate({ids});
  }, [reorderMutation]);

  const moveStep = useCallback((id: number, direction: 'up' | 'down') => {
    setDndMessages((prev) => {
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

  const displayMessages = isReorderMode ? dndMessages : serverMessages;

  return (
    <>
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
          {displayMessages.length === 0 && !isLoading && (
            <EmptyState hasFilters={hasActiveFilters} />
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={displayMessages.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1.5}>
                {displayMessages.map((msg, index) => (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    onTagClick={setCurrentTags}
                    isLast={index === displayMessages.length - 1}
                    handleOpenMenu={handleOpenMenu}
                    isSelectMode={isSelectMode}
                    selectedIds={selectedIds}
                    toggleSelect={toggleSelect}
                    refIsLoading={refIsLoading}
                    refHasNextPage={refHasNextPage}
                    startEditing={startEditing}
                    isReorderMode={isReorderMode}
                    index={index}
                    totalCount={displayMessages.length}
                    moveStep={moveStep}
                    loadMore={loadMore}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          {hasNextPage && (
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
          messages={displayMessages}
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

      <DeleteDialog
        deleteDialogOpen={deleteDialogOpen}
        closeDeleteDialog={closeDeleteDialog}
        refMsgToDelete={refMsgToDelete}
      />

      <BatchDeleteDialog
        deleteBatchDialogOpen={deleteBatchDialogOpen}
        closeBatchDeleteDialog={closeBatchDeleteDialog}
        selectedIds={selectedIds}
        cancelSelectMode={cancelSelectMode}
      />

      <TagsMenu
        tagMenuAnchor={tagMenuAnchor}
        handleCloseTagMenu={handleCloseTagMenu}
        currentTags={currentTags}
        setCurrentTags={setCurrentTags}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
      />
    </>
  );
}

export default App;
