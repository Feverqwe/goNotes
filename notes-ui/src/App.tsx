import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {Alert, Box, CircularProgress, Container, Stack} from '@mui/material';

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
  const showSnackbar = useContext(SnackCtx);

  const initUrlParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const [selectedNoteId, setSelectedNoteId] = useState<number | undefined>(() => {
    const id = initUrlParams.get('id');
    return id ? parseInt(id, 10) : undefined;
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    const tagsStr = initUrlParams.get('q');
    return tagsStr ?? '';
  });

  const [currentTags, setCurrentTags] = useState(() => {
    const tagsStr = initUrlParams.get('tags');
    return tagsStr ? tagsStr.split(',') : [];
  });

  const [showArchived, setShowArchived] = useState(() => {
    return initUrlParams.get('archived') === '1';
  });

  const [files, setFiles] = useState<File[]>([]);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Note | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<number | null>(null);
  const refMsgToDelete = useRef(msgToDelete);
  refMsgToDelete.current = msgToDelete;

  const refGoBack = useRef(false);

  const [deleteBatchDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tags = params.get('tags');
      const searchQuery = params.get('q');
      const archived = params.get('archived');
      const id = params.get('id');
      refGoBack.current = true;
      setCurrentTags(tags ? tags.split(',') : []);
      setSearchQuery(searchQuery ?? '');
      setShowArchived(archived === '1');
      setSelectedNoteId(id ? Number(id) : undefined);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const askDeleteConfirmation = useCallback((id: number) => {
    setMsgToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setMsgToDelete(null);
  }, []);

  const askBatchDeleteConfirmation = useCallback(() => {
    setBatchDeleteDialogOpen(true);
  }, []);

  const closeBatchDeleteDialog = useCallback(() => {
    setBatchDeleteDialogOpen(false);
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error: useNoteError,
  } = useNotes({
    id: selectedNoteId,
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

  const archiveMutation = useMutation({
    mutationFn: (params: ArchiveMessageRequest) => api.messages.archive(params),
    onSuccess: (_, {archive}) => {
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

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!refGoBack.current) {
      const url = new URL(window.location.href);

      if (showArchived) {
        url.searchParams.set('archived', '1');
      } else {
        url.searchParams.delete('archived');
      }

      if (currentTags.length > 0) {
        url.searchParams.set('tags', currentTags.join(','));
      } else {
        url.searchParams.delete('tags');
      }

      if (searchQuery) {
        url.searchParams.set('q', searchQuery);
      } else {
        url.searchParams.delete('q');
      }

      if (selectedNoteId) {
        url.searchParams.set('id', String(selectedNoteId));
      } else {
        url.searchParams.delete('id');
      }

      window.history.replaceState({}, '', url);
    }

    refGoBack.current = false;

    const delayDebounceFn = setTimeout(() => {
      queryClient.invalidateQueries({queryKey: ['notes']});
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [currentTags, queryClient, searchQuery, selectedNoteId, showArchived]);

  const startEditing = useCallback((msg: Note) => {
    setEditingNote(msg);
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

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

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

  const enterReorderMode = useCallback(() => {
    setIsReorderMode(true);
    setDndMessages(refServerMessages.current);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const cancelReorderMode = useCallback(() => {
    setIsReorderMode(false);
    setDndMessages([]);
  }, []);

  const onArchiveClick = useCallback(() => {
    if (!selectedMsg) return;

    archiveMutation.mutate({
      id: selectedMsg.id,
      archive: selectedMsg.is_archived ? 0 : 1,
    });

    handleCloseMenu();
  }, [archiveMutation, handleCloseMenu, selectedMsg]);

  const hasActiveFilters = useMemo(
    () => searchQuery.length > 0 ||
      currentTags.length > 0 ||
      showArchived ||
      selectedNoteId !== undefined,
    [currentTags.length, searchQuery.length, selectedNoteId, showArchived],
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

  const saveOrder = useCallback(() => {
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

  const displayMessageIds = useMemo(() => displayMessages.map((m) => m.id), [displayMessages]);

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
          hasActiveFilters={hasActiveFilters}
          setSelectedNoteId={setSelectedNoteId}
        />

        <Container
          maxWidth="sm"
          sx={{
            flexGrow: 1,
            pt: 1,
            pb: 7.5 + (files.length ? 8 : 0) + (currentTags.length ? 7 : 0),
          }}
        >
          {isError && (
            <Alert
              severity="error"
              sx={{mb: 2, bgcolor: 'rgba(255, 69, 58, 0.1)', color: '#ff453a'}}
            >
              {useNoteError instanceof Error ? useNoteError.message : 'Ошибка при загрузке заметок'}
            </Alert>
          )}

          {displayMessages.length === 0 && !isLoading && !isError && (
            <EmptyState hasFilters={hasActiveFilters} />
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayMessageIds} strategy={verticalListSortingStrategy}>
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
          editingNote={editingNote}
          setEditingNote={setEditingNote}
          files={files}
          currentTags={currentTags}
          setCurrentTags={setCurrentTags}
          setFiles={setFiles}
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
