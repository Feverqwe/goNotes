import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

import {DragEndEvent} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';
import {Box, Container, useMediaQuery, useTheme} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import DeleteNoteDialog from './components/DeleteNoteDialog/DeleteNoteDialog';
import DeleteNotesDialog from './components/DeleteNotesDialog/DeleteNotesDialog';
import NavigationDrawer from './components/NavigationDrawer/NavigationDrawer';
import NoteBulkActionsBar from './components/NoteBulkActionsBar/NoteBulkActionsBar';
import NoteEditor from './components/NoteEditor/NoteEditor';
import NoteMenu from './components/NoteMenu/NoteMenu';
import NoteReorderBar from './components/NoteReorderBar/NoteReorderBar';
import NotesFeed from './components/NotesFeed/NotesFeed';
import NotesHeader from './components/NotesHeader/NotesHeader';
import TagsNavigation from './components/TagsNavigation/TagsNavigation';
import {SnackCtx} from './ctx/SnackCtx';
import {useNotes} from './hooks/useNotes';
import {api} from './tools/api';
import {ArchiveNoteRequest, ReorderNotesRequest, RestoreNoteRequest} from './tools/types';
import {Note} from './types';
import {NotesView, getNotesView, getTagsFromUrl, hasSearchQuery} from './utils/noteFilters';

const wrapperSx = {minHeight: '100vh', display: 'flex', flexDirection: 'column'};

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

  const [currentTags, setCurrentTags] = useState(() => getTagsFromUrl(initUrlParams));

  const [showArchived, setShowArchived] = useState(() => {
    return (
      !hasSearchQuery(initUrlParams.get('q')) &&
      getTagsFromUrl(initUrlParams).length === 0 &&
      initUrlParams.get('archived') === '1' &&
      initUrlParams.get('deleted') !== '1'
    );
  });

  const [showTrash, setShowTrash] = useState(() => {
    return initUrlParams.get('deleted') === '1';
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteMenuAnchor, setNoteMenuAnchor] = useState<Element | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [isDeleteNoteDialogOpen, setIsDeleteNoteDialogOpen] = useState(false);
  const [noteIdToDelete, setNoteIdToDelete] = useState<number | null>(null);
  const noteIdToDeleteRef = useRef(noteIdToDelete);
  noteIdToDeleteRef.current = noteIdToDelete;

  const historyUpdateRef = useRef<'push' | 'replace'>('replace');
  const compactEditorRef = useRef<HTMLInputElement>(null);
  const appTitleRef = useRef(document.title);

  const [isDeleteNotesDialogOpen, setIsDeleteNotesDialogOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isReorderMode, setIsReorderMode] = useState(false);

  const [orderedNotes, setOrderedNotes] = useState<Note[]>([]);
  const orderedNotesRef = useRef(orderedNotes);
  orderedNotesRef.current = orderedNotes;

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const searchQuery = params.get('q');
      const archived = params.get('archived');
      const deleted = params.get('deleted');
      const id = params.get('id');
      const tags = getTagsFromUrl(params);
      setCurrentTags(tags);
      setSearchQuery(searchQuery ?? '');
      setShowArchived(
        !hasSearchQuery(searchQuery) && tags.length === 0 && archived === '1' && deleted !== '1',
      );
      setShowTrash(deleted === '1');
      setSelectedNoteId(id ? Number(id) : undefined);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const requestNoteDeletion = useCallback((id: number) => {
    setNoteIdToDelete(id);
    setIsDeleteNoteDialogOpen(true);
  }, []);

  const closeDeleteNoteDialog = useCallback(() => {
    setIsDeleteNoteDialogOpen(false);
    setNoteIdToDelete(null);
  }, []);

  const requestSelectedNotesDeletion = useCallback(() => {
    setIsDeleteNotesDialogOpen(true);
  }, []);

  const closeDeleteNotesDialog = useCallback(() => {
    setIsDeleteNotesDialogOpen(false);
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
    deleted: showTrash,
  });
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  isFetchingNextPageRef.current = isFetchingNextPage;

  const serverNotes = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);
  const serverNotesRef = useRef(serverNotes);
  serverNotesRef.current = serverNotes;

  const reorderMutation = useMutation({
    mutationFn: (params: ReorderNotesRequest) => api.notes.reorder(params),
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({queryKey: ['notes']});
      } finally {
        setIsReorderMode(false);
        setOrderedNotes([]);
      }
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка сохранения порядка', 'error');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (params: ArchiveNoteRequest) => api.notes.archive(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      closeNoteMenu();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка архивации', 'error');
      closeNoteMenu();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (params: RestoreNoteRequest) => api.notes.restore(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      closeNoteMenu();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка восстановления', 'error');
      closeNoteMenu();
    },
  });

  const navigateToView = useCallback(
    (view: NotesView, tag?: string) => {
      const currentView = getNotesView(currentTags, showArchived, showTrash);
      const isSameView = currentView === view && (view !== 'tag' || currentTags[0] === tag);

      if (isSameView && searchQuery === '' && selectedNoteId === undefined) return;

      historyUpdateRef.current = 'push';
      setSearchQuery('');
      setCurrentTags(view === 'tag' && tag ? [tag] : []);
      setShowArchived(view === 'archive');
      setShowTrash(view === 'trash');
      setSelectedNoteId(undefined);
    },
    [currentTags, searchQuery, selectedNoteId, showArchived, showTrash],
  );

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      if (value === searchQuery) return;

      if (searchQuery === '' || selectedNoteId !== undefined) {
        historyUpdateRef.current = 'push';
      }
      if (hasSearchQuery(value) && !showTrash) {
        setCurrentTags([]);
        setShowArchived(false);
      }
      setSelectedNoteId(undefined);
      setSearchQuery(value);
    },
    [searchQuery, selectedNoteId, showTrash],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const oldSearch = url.search;

    if (showArchived) {
      url.searchParams.set('archived', '1');
    } else {
      url.searchParams.delete('archived');
    }

    if (showTrash) {
      url.searchParams.set('deleted', '1');
    } else {
      url.searchParams.delete('deleted');
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

    const newSearch = url.search;

    if (oldSearch !== newSearch) {
      if (historyUpdateRef.current === 'push') {
        window.history.pushState({}, '', url);
      } else {
        window.history.replaceState({}, '', url);
      }
    }
    historyUpdateRef.current = 'replace';
  }, [currentTags, searchQuery, selectedNoteId, showArchived, showTrash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || Boolean(target.closest('.monaco-editor'))));

      if ((e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'т') && !isInput) {
        e.preventDefault();
        if (isMobileRef.current) {
          compactEditorRef.current?.focus();
        } else {
          setIsEditorDialogOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsEditorDialogOpen]);

  const startEditingNote = useCallback((note: Note) => {
    setEditingNote(note);
    setIsEditorDialogOpen(true);
  }, []);

  const closeNoteEditor = useCallback(() => {
    setEditingNote(null);
    setIsEditorDialogOpen(false);
  }, []);
  const openNoteMenu = useCallback((event: React.MouseEvent, note: Note) => {
    setNoteMenuAnchor(event.currentTarget);
    setSelectedNote(note);
  }, []);

  const closeNoteMenu = useCallback(() => {
    setNoteMenuAnchor(null);
    setSelectedNote(null);
  }, []);

  const handleEditNote = useCallback(() => {
    if (!selectedNote) return;
    startEditingNote(selectedNote);
    closeNoteMenu();
  }, [selectedNote, closeNoteMenu, startEditingNote]);

  const handleDeleteNote = useCallback(() => {
    if (!selectedNote) return;
    requestNoteDeletion(selectedNote.id);
    closeNoteMenu();
  }, [selectedNote, closeNoteMenu, requestNoteDeletion]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const enterSelectMode = useCallback(
    (note: Note) => {
      setIsSelectMode(true);
      setSelectedIds([note.id]);
      closeNoteMenu();
    },
    [closeNoteMenu],
  );

  const cancelSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds([]);
  }, []);

  const enterReorderMode = useCallback(() => {
    setIsReorderMode(true);
    setOrderedNotes(serverNotesRef.current);
    closeNoteMenu();
  }, [closeNoteMenu]);

  const cancelReorderMode = useCallback(() => {
    setIsReorderMode(false);
    setOrderedNotes([]);
  }, []);

  const handleArchiveNote = useCallback(() => {
    if (!selectedNote) return;

    archiveMutation.mutate({
      id: selectedNote.id,
      archive: selectedNote.is_archived ? 0 : 1,
    });

    closeNoteMenu();
  }, [archiveMutation, closeNoteMenu, selectedNote]);

  const handleRestoreNote = useCallback(() => {
    if (!selectedNote) return;
    restoreMutation.mutate({id: selectedNote.id});
    closeNoteMenu();
  }, [closeNoteMenu, restoreMutation, selectedNote]);

  const handleOpenEditor = useCallback(() => setIsEditorDialogOpen(true), []);

  const handleNoteDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setOrderedNotes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const saveNoteOrder = useCallback(() => {
    const orderedNotes = orderedNotesRef.current;
    const ids = orderedNotes.map((note) => note.id);
    reorderMutation.mutate({ids});
  }, [reorderMutation]);

  const moveNote = useCallback((id: number, direction: 'up' | 'down') => {
    setOrderedNotes((prev) => {
      const idx = prev.findIndex((note) => note.id === id);
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

  const handleTrashClick = useCallback(() => {
    navigateToView('trash');
    handleCloseDrawer();
  }, [handleCloseDrawer, navigateToView]);

  const handleArchiveClick = useCallback(() => {
    navigateToView('archive');
    handleCloseDrawer();
  }, [handleCloseDrawer, navigateToView]);

  const handleTagClick = useCallback(
    (tag: string) => {
      navigateToView('tag', tag);
      handleCloseDrawer();
    },
    [handleCloseDrawer, navigateToView],
  );

  const handleNoteTagClick = useCallback(
    (tags: string[]) => {
      if (tags[0]) handleTagClick(tags[0]);
    },
    [handleTagClick],
  );

  const observer = useRef<IntersectionObserver | undefined>(undefined);
  const loadMoreTrigger = useCallback(
    (node: HTMLDivElement) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        const isFetching = isFetchingNextPageRef.current;
        if (entries[0].isIntersecting && !isFetching) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchNextPage],
  );

  const hasActiveFilters = useMemo(
    () =>
      hasSearchQuery(searchQuery) ||
      currentTags.length > 0 ||
      showArchived ||
      showTrash ||
      selectedNoteId !== undefined,
    [currentTags.length, searchQuery, selectedNoteId, showArchived, showTrash],
  );

  const isGlobalSearch = hasSearchQuery(searchQuery) && !showTrash;

  const resetFilters = useCallback(() => {
    navigateToView('notes');
  }, [navigateToView]);

  const pageTitle = useMemo(() => {
    if (hasSearchQuery(searchQuery) && !showTrash) return 'Поиск';
    if (currentTags.length === 1) return currentTags[0];
    if (showArchived) return 'Архив';
    if (showTrash) return 'Корзина';
    return 'Заметки';
  }, [currentTags, searchQuery, showArchived, showTrash]);

  useEffect(() => {
    document.title =
      pageTitle === 'Заметки' ? appTitleRef.current : `${pageTitle} · ${appTitleRef.current}`;
  }, [pageTitle]);

  const displayedNotes = isReorderMode ? orderedNotes : serverNotes;

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
        <NotesHeader
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          showArchived={showArchived}
          showTrash={showTrash}
          hasActiveFilters={hasActiveFilters}
          pageTitle={pageTitle}
          onResetFilters={resetFilters}
          onMenuClick={handleToggleDrawer}
        />

        <Box sx={{display: 'flex'}}>
          <NavigationDrawer
            open={isDrawerOpen}
            onOpen={handleOpenDrawer}
            onClose={handleCloseDrawer}
            onCreateClick={handleCreateClick}
            showArchived={showArchived}
            onArchiveClick={handleArchiveClick}
            showTrash={showTrash}
            onTrashClick={handleTrashClick}
          >
            <TagsNavigation
              currentTags={currentTags}
              showArchived={showArchived}
              showTrash={showTrash}
              isGlobalSearch={isGlobalSearch}
              hasSelectedNote={selectedNoteId !== undefined}
              onResetFilters={resetFilters}
              onTagClick={handleTagClick}
              onActionFinished={handleCloseDrawer}
            />
          </NavigationDrawer>

          <Container maxWidth="sm" sx={bodyCtrSx}>
            <NotesFeed
              notes={displayedNotes}
              isLoading={isLoading}
              isError={isError}
              error={useNoteError}
              hasActiveFilters={hasActiveFilters}
              hasNextPage={Boolean(hasNextPage)}
              loadMoreRef={loadMoreTrigger}
              onDragEnd={handleNoteDragEnd}
              onTagClick={handleNoteTagClick}
              onOpenMenu={openNoteMenu}
              isSelectMode={isSelectMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelect}
              onEdit={startEditingNote}
              isReorderMode={isReorderMode}
              onMove={moveNote}
              onRequestDelete={requestNoteDeletion}
            />
          </Container>
        </Box>

        <NoteEditor
          open={isEditorDialogOpen}
          setOpen={setIsEditorDialogOpen}
          editingNote={editingNote}
          onClose={closeNoteEditor}
          currentTags={currentTags}
          innerRef={compactEditorRef}
        />
        {isSelectMode && (
          <NoteBulkActionsBar
            onCancel={cancelSelectMode}
            selectedIds={selectedIds}
            onRequestDelete={requestSelectedNotesDeletion}
            showArchived={showArchived}
            showTrash={showTrash}
          />
        )}

        {isReorderMode && <NoteReorderBar onCancel={cancelReorderMode} onSave={saveNoteOrder} />}
      </Box>

      <NoteMenu
        anchorElement={noteMenuAnchor}
        onClose={closeNoteMenu}
        note={selectedNote}
        onEnterSelectionMode={enterSelectMode}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
        onToggleArchive={handleArchiveNote}
        onRestore={handleRestoreNote}
        onEnterReorderMode={enterReorderMode}
        showTrash={showTrash}
      />

      <DeleteNoteDialog
        open={isDeleteNoteDialogOpen}
        onClose={closeDeleteNoteDialog}
        noteIdRef={noteIdToDeleteRef}
        permanent={showTrash}
      />

      <DeleteNotesDialog
        open={isDeleteNotesDialogOpen}
        onClose={closeDeleteNotesDialog}
        selectedIds={selectedIds}
        cancelSelectMode={cancelSelectMode}
        permanent={showTrash}
      />
    </>
  );
}

export default App;
