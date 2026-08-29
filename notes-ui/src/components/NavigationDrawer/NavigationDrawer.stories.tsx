import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {DragEndEvent} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';
import {Box} from '@mui/material';
import type {Meta, StoryObj} from '@storybook/react-vite';

import TagsNavigationList from '../TagsNavigationList/TagsNavigationList';

import NavigationDrawer from './NavigationDrawer';

const sampleTags = [
  'важное',
  'идеи',
  'работа',
  'разработка',
  'инфраструктура',
  'личное',
  'покупки',
  'путешествия',
  'рецепты',
  'книги',
  'фильмы',
  'когда-нибудь',
  'очень-длинный-тег-для-проверки',
];

interface SidebarPreviewProps {
  initialFilter: string;
  initialTag: string;
  tags: string[];
  showArchived: boolean;
  showTrash: boolean;
}

const SidebarPreview = ({
  initialFilter,
  initialTag,
  tags: initialTags,
  showArchived,
  showTrash,
}: SidebarPreviewProps) => {
  const [tags, setTags] = useState(initialTags);
  const [tagFilter, setTagFilter] = useState(initialFilter);
  const [currentTag, setCurrentTag] = useState(initialTag);
  const [isReorderMode, setIsReorderMode] = useState(false);

  useEffect(() => setTags(initialTags), [initialTags]);
  useEffect(() => setTagFilter(initialFilter), [initialFilter]);
  useEffect(() => setCurrentTag(initialTag), [initialTag]);

  const visibleTags = useMemo(() => {
    if (isReorderMode) return tags;

    const normalizedFilter = tagFilter.trim().replace(/^#/, '').toLocaleLowerCase();
    if (!normalizedFilter) return tags;

    return tags.filter((tag) => tag.toLocaleLowerCase().includes(normalizedFilter));
  }, [isReorderMode, tagFilter, tags]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;

    setTags((items) =>
      arrayMove(items, items.indexOf(String(active.id)), items.indexOf(String(over.id))),
    );
  }, []);

  const handleMove = useCallback((tag: string, direction: 'up' | 'down') => {
    setTags((items) => {
      const currentIndex = items.indexOf(tag);
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= items.length) return items;
      return arrayMove(items, currentIndex, nextIndex);
    });
  }, []);

  return (
    <Box sx={{minHeight: '100vh', bgcolor: 'background.default'}}>
      <NavigationDrawer
        open
        onOpen={() => undefined}
        onClose={() => undefined}
        onCreateClick={() => undefined}
        showArchived={showArchived}
        onArchiveClick={() => undefined}
        showTrash={showTrash}
        onTrashClick={() => undefined}
      >
        <TagsNavigationList
          tags={visibleTags}
          totalTagCount={tags.length}
          tagFilter={tagFilter}
          currentTags={currentTag ? [currentTag] : []}
          showArchived={showArchived}
          showTrash={showTrash}
          isGlobalSearch={false}
          hasSelectedNote={false}
          isReorderMode={isReorderMode}
          onResetFilters={() => setCurrentTag('')}
          onToggleReorder={() => setIsReorderMode((value) => !value)}
          onDragEnd={handleDragEnd}
          onMove={handleMove}
          onTagClick={setCurrentTag}
          onTagFilterChange={setTagFilter}
          onTagFilterClear={() => setTagFilter('')}
        />
      </NavigationDrawer>
    </Box>
  );
};

const meta = {
  title: 'Components/NavigationDrawer',
  component: SidebarPreview,
  parameters: {
    layout: 'fullscreen',
    contentWidth: '100%',
  },
  args: {
    initialFilter: '',
    initialTag: 'важное',
    tags: sampleTags,
    showArchived: false,
    showTrash: false,
  },
} satisfies Meta<typeof SidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    initialFilter: 'ра',
  },
};

export const NoMatches: Story = {
  args: {
    initialFilter: 'несуществующий',
  },
};
