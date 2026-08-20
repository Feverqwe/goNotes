import React from 'react';

import type {Meta, StoryObj} from '@storybook/react-vite';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import NoteBulkActionsBar from './NoteBulkActionsBar';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {retry: false},
    queries: {refetchOnWindowFocus: false, retry: false, staleTime: Infinity},
  },
});
queryClient.setQueryData(['tags'], ['дизайн', 'проект', 'важное']);

const meta = {
  title: 'Components/NoteBulkActionsBar',
  component: NoteBulkActionsBar,
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
    onCancel: () => undefined,
    selectedIds: [1, 2, 3],
    onRequestDelete: () => undefined,
    showArchived: false,
    showTrash: false,
  },
} satisfies Meta<typeof NoteBulkActionsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {};

export const Trash: Story = {
  args: {
    showTrash: true,
  },
};
