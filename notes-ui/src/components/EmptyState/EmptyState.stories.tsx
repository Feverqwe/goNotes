import type {Meta, StoryObj} from '@storybook/react-vite';

import EmptyState from './EmptyState';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    hasFilters: false,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoNotes: Story = {};

export const NoSearchResults: Story = {
  args: {
    hasFilters: true,
  },
};
