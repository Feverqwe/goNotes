import React from 'react';

import type {Meta, StoryObj} from '@storybook/react-vite';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import CompactNoteEditorDialog from './CompactNoteEditorDialog';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {retry: false},
    queries: {retry: false},
  },
});

const meta = {
  title: 'Components/CompactNoteEditorDialog',
  component: CompactNoteEditorDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    contentWidth: '100%',
  },
  args: {
    open: true,
    editingNote: {
      id: 1,
      content:
        'Карточка и компактный редактор теперь используют одинаковую ширину.\n\n#дизайн #storybook',
      attachments: [],
      created_at: '2026-08-20T09:30:00Z',
      updated_at: '2026-08-20T11:45:00Z',
      tags: ['дизайн', 'storybook'],
      is_archived: 0,
      is_deleted: 0,
      is_expanded: 0,
      sort_order: 1,
    },
    files: [],
    setFiles: () => undefined,
    currentTags: ['дизайн'],
    inputText:
      'Карточка и компактный редактор теперь используют одинаковую ширину.\n\n#дизайн #storybook',
    setInputText: () => undefined,
    existingAttachments: [],
    deletedAttachIds: [],
    setDeletedAttachIds: () => undefined,
    onFinish: () => undefined,
    onOpenAdvancedEditor: () => undefined,
  },
} satisfies Meta<typeof CompactNoteEditorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editing: Story = {};
