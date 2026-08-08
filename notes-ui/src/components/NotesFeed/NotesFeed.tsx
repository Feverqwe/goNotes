import React, {FC, useMemo} from 'react';

import {DndContext, DragEndEvent, closestCenter} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {Alert, Box, CircularProgress, Stack} from '@mui/material';

import {Note} from '../../types';
import EmptyState from '../EmptyState/EmptyState';
import NoteCard from '../NoteCard/NoteCard';

interface NotesFeedProps {
  notes: Note[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasActiveFilters: boolean;
  hasNextPage: boolean;
  loadMoreRef: (node: HTMLDivElement) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onTagClick: (tags: string[]) => void;
  onOpenMenu: (event: React.MouseEvent, note: Note) => void;
  isSelectMode: boolean;
  selectedIds: number[];
  onToggleSelection: (id: number) => void;
  onEdit: (note: Note) => void;
  isReorderMode: boolean;
  onMove: (id: number, direction: 'up' | 'down') => void;
  onRequestDelete: (id: number) => void;
}

const loadingBoxSx = {display: 'flex', justifyContent: 'center'};

const NotesFeed: FC<NotesFeedProps> = ({
  notes,
  isLoading,
  isError,
  error,
  hasActiveFilters,
  hasNextPage,
  loadMoreRef,
  onDragEnd,
  onTagClick,
  onOpenMenu,
  isSelectMode,
  selectedIds,
  onToggleSelection,
  onEdit,
  isReorderMode,
  onMove,
  onRequestDelete,
}) => {
  const noteIds = useMemo(() => notes.map((note) => note.id), [notes]);

  return (
    <>
      {notes.length === 0 && !isLoading && !isError && <EmptyState hasFilters={hasActiveFilters} />}

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {isError && (
              <Alert severity="error">
                {error instanceof Error ? error.message : 'Ошибка при загрузке заметок'}
              </Alert>
            )}

            {notes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                onTagClick={onTagClick}
                onOpenMenu={onOpenMenu}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(note.id)}
                onToggleSelection={onToggleSelection}
                onEdit={onEdit}
                isReorderMode={isReorderMode}
                index={index}
                totalCount={notes.length}
                onMove={onMove}
                onRequestDelete={onRequestDelete}
              />
            ))}

            {hasNextPage && (
              <Box ref={loadMoreRef} sx={loadingBoxSx}>
                <CircularProgress />
              </Box>
            )}
          </Stack>
        </SortableContext>
      </DndContext>
    </>
  );
};

export default NotesFeed;
