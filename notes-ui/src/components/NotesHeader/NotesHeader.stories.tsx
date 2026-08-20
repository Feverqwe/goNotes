import type {Meta, StoryObj} from '@storybook/react-vite';

import NotesHeader from './NotesHeader';

const meta = {
  title: 'Components/NotesHeader',
  component: NotesHeader,
  parameters: {
    layout: 'fullscreen',
    contentWidth: '100%',
  },
  args: {
    searchQuery: '',
    onSearchQueryChange: () => undefined,
    showArchived: false,
    showTrash: false,
    hasActiveFilters: false,
    pageTitle: 'Заметки',
    onResetFilters: () => undefined,
    onMenuClick: () => undefined,
  },
} satisfies Meta<typeof NotesHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFilters: Story = {
  args: {
    searchQuery: 'проект',
    hasActiveFilters: true,
    pageTitle: 'Поиск: проект',
  },
};
