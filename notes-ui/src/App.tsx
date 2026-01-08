import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {closestCenter, DndContext, DragEndEvent} from '@dnd-kit/core';
import {arrayMove, SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {Note} from './types';
import MessageItem from './components/MessageItem/MessageItem';
import {SnackCtx} from './ctx/SnackCtx';
import SearchBox from './components/SearchBox/SearchBox';
import MultiSelectMenu from './components/MultiSelectMenu/MultiSelectMenu';
import NoteMenu from './components/NoteMenu/NoteMenu';
import BatchDeleteDialog from './components/BatchDeleteDialog/BatchDeleteDialog';
import DeleteDialog from './components/DeleteDialog/DeleteDialog';
import EmptyState from './components/EmptyState/EmptyState';

import ReorderMenu from './components/ReorderMenu/ReorderMenu';
import {api} from './tools/api';
import {useNotes} from './hooks/useNotes';
import {ArchiveMessageRequest, ReorderMessagesRequest} from './tools/types';
import SideTagsPanel from './components/SideTagsPanel/SideTagsPanel';
import TagsManager from './components/TagsManager/TagsManager';
import NoteForm from './components/NoteForm/NoteForm';

const wrapperSx = {minHeight: '100vh', display: 'flex', flexDirection: 'column'};

const alertSx = {mb: 1.5};

function App() {
  const theme = useTheme();
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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const [isReorderMode, setIsReorderMode] = useState(false);

  const [dndMessages, setDndMessages] = useState<Note[]>([]);
  const refDndMessages = useRef(dndMessages);
  refDndMessages.current = dndMessages;

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const refIsMobile = useRef(isMobile);
  refIsMobile.current = isMobile;

  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);

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
  const refIsFetchingNextPage = useRef(isFetchingNextPage);
  refIsFetchingNextPage.current = isFetchingNextPage;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'т') && !isInput) {
        if (!refIsMobile.current) {
          e.preventDefault();

          setIsEditorDialogOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsEditorDialogOpen]);

  const startEditing = useCallback((msg: Note) => {
    setEditingNote(msg);
    setIsEditorDialogOpen(true);
  }, []);

  const endEditing = useCallback(() => {
    setEditingNote(null);
    setIsEditorDialogOpen(false);
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

  const handleOpenEditor = useCallback(() => setIsEditorDialogOpen(true), []);

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

  const handleToggleDrawer = useCallback(() => setIsDrawerOpen((v) => !v), []);
  const handleOpenDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const observer = useRef<IntersectionObserver | undefined>(undefined);
  const loadMoreTrigger = useCallback(
    (node: HTMLDivElement) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        const isFetching = refIsFetchingNextPage.current;
        if (entries[0].isIntersecting && !isFetching) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchNextPage],
  );

  const hasActiveFilters = useMemo(
    () => searchQuery.length > 0 ||
      currentTags.length > 0 ||
      showArchived ||
      selectedNoteId !== undefined,
    [currentTags.length, searchQuery.length, selectedNoteId, showArchived],
  );

  const displayMessages = isReorderMode ? dndMessages : serverMessages;

  const displayMessageIds = useMemo(() => displayMessages.map((m) => m.id), [displayMessages]);

  const bodyCtrSx = useMemo(
    () => ({
      flexGrow: 1,
      pt: 1,
      pb: isMobile ? 7.5 : 1,
    }),
    [isMobile],
  );

  const handleCreateClick = useCallback(() => {
    handleOpenEditor();
    setIsDrawerOpen(false);
  }, [handleOpenEditor]);

  return (
    <>
      <Box sx={wrapperSx}>
        <SearchBox
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentTags={currentTags}
          setCurrentTags={setCurrentTags}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          hasActiveFilters={hasActiveFilters}
          setSelectedNoteId={setSelectedNoteId}
          onMenuClick={handleToggleDrawer}
        />

        <Box display="flex">
          <SideTagsPanel
            open={isDrawerOpen}
            onOpen={handleOpenDrawer}
            onClose={handleCloseDrawer}
            onCreateClick={handleCreateClick}
          >
            <TagsManager
              currentTags={currentTags}
              setCurrentTags={setCurrentTags}
              showArchived={showArchived}
              setShowArchived={setShowArchived}
              onActionFinished={handleCloseDrawer}
            />
          </SideTagsPanel>

          <Container maxWidth="sm" sx={bodyCtrSx}>
            {isError && (
              <Alert severity="error" sx={alertSx}>
                {useNoteError instanceof Error
                  ? useNoteError.message
                  : 'Ошибка при загрузке заметок'}
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
                      handleOpenMenu={handleOpenMenu}
                      isSelectMode={isSelectMode}
                      isSelected={selectedIds.includes(msg.id)}
                      toggleSelect={toggleSelect}
                      startEditing={startEditing}
                      isReorderMode={isReorderMode}
                      index={index}
                      totalCount={displayMessages.length}
                      moveStep={moveStep}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            {hasNextPage && (
              <Box ref={loadMoreTrigger} display="flex" justifyContent="center" p={2}>
                <CircularProgress />
              </Box>
            )}
          </Container>
        </Box>

        <NoteForm
          open={isEditorDialogOpen}
          setIsEditorDialogOpen={setIsEditorDialogOpen}
          editingNote={editingNote}
          endEditing={endEditing}
          currentTags={currentTags}
          setCurrentTags={setCurrentTags}
        />

        {isSelectMode && (
          <MultiSelectMenu
            cancelSelectMode={cancelSelectMode}
            selectedIds={selectedIds}
            askBatchDeleteConfirmation={askBatchDeleteConfirmation}
            showArchived={showArchived}
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
    </>
  );
}

export default App;
