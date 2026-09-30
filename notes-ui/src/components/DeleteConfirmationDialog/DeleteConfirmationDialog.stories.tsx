import type {Meta, StoryObj} from '@storybook/react-vite';

import DeleteConfirmationDialog from './DeleteConfirmationDialog';

const meta = {
  title: 'Components/DeleteConfirmationDialog',
  component: DeleteConfirmationDialog,
  parameters: {layout: 'fullscreen', contentWidth: '100%'},
  args: {
    open: true,
    title: 'Удалить заметку?',
    description:
      'Из корзины заметку можно восстановить. При удалении навсегда заметка и все вложения будут стерты без возможности восстановления.',
    confirmLabel: 'В корзину',
    loading: false,
    onConfirm: () => undefined,
    onConfirmPermanently: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof DeleteConfirmationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChooseDeletion: Story = {};

export const ChooseDeletionForSelection: Story = {
  args: {
    title: 'Удалить выбранные заметки?',
    description:
      'Из корзины заметки можно восстановить. При удалении навсегда заметки и все вложения будут стерты без возможности восстановления.',
  },
};

export const AlreadyInTrash: Story = {
  args: {
    title: 'Удалить заметку навсегда?',
    description: 'Это действие нельзя отменить. Все вложения будут стерты.',
    confirmLabel: 'Удалить навсегда',
    onConfirmPermanently: undefined,
  },
};
