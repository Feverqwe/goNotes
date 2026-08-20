import type {Meta, StoryObj} from '@storybook/react-vite';

import NoteReorderBar from './NoteReorderBar';

const meta = {
  title: 'Components/NoteReorderBar',
  component: NoteReorderBar,
  parameters: {
    layout: 'fullscreen',
    contentWidth: '100%',
  },
  args: {
    onCancel: () => undefined,
    onSave: () => undefined,
  },
} satisfies Meta<typeof NoteReorderBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
