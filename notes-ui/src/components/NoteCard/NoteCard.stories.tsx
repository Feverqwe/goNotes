import React from 'react';

import {DndContext} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import NoteCard from './NoteCard';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {retry: false},
    queries: {retry: false},
  },
});

const markdownContent = `# Шпаргалка по Markdown

Это обычный абзац с **жирным текстом**, *курсивом*, ~~зачёркиванием~~, [ссылкой](https://example.com) и фрагментом \`inline code\`.

## План заметки

- проверить маркированный список;
- показать вложенный уровень:
  - первый подпункт;
  - второй подпункт.

1. Сначала открыть карточку.
2. Затем проверить ритм текста.
3. Убедиться, что длинная строка корректно переносится внутри узкой карточки.

### Важная деталь

> Цитата должна визуально отличаться от основного текста, но оставаться читаемой в светлой и тёмной темах.

---

#### Пример кода

\`\`\`ts
const title = 'Заметка';
console.log(title);
\`\`\`

##### Таблица статусов

| Элемент | Статус |
| --- | --- |
| Заголовки | Проверено |
| Списки | Проверено |

###### Маленький заголовок

Финальный абзац завершает типографическую проверку. #markdown #storybook`;

const meta = {
  title: 'Components/NoteCard',
  component: NoteCard,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <DndContext>
          <SortableContext items={[1, 2]} strategy={verticalListSortingStrategy}>
            <Story />
          </SortableContext>
        </DndContext>
      </QueryClientProvider>
    ),
  ],
  args: {
    note: {
      id: 1,
      content: 'Короткая заметка с **важной мыслью** и #примером.',
      attachments: [],
      created_at: '2026-08-20T09:30:00Z',
      updated_at: '2026-08-20T09:30:00Z',
      tags: ['пример'],
      is_archived: 0,
      is_deleted: 0,
      is_expanded: 0,
      sort_order: 1,
    },
    onTagClick: () => undefined,
    onOpenMenu: () => undefined,
    isSelectMode: false,
    onToggleSelection: () => undefined,
    isSelected: false,
    onEdit: () => undefined,
    isReorderMode: false,
    onMove: () => undefined,
    index: 0,
    totalCount: 1,
    onRequestDelete: () => undefined,
    disableContentCollapse: false,
  },
} satisfies Meta<typeof NoteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Markdown: Story = {
  args: {
    note: {
      id: 2,
      content: markdownContent,
      attachments: [],
      created_at: '2026-08-20T09:30:00Z',
      updated_at: '2026-08-20T11:45:00Z',
      tags: ['markdown', 'storybook'],
      is_archived: 0,
      is_deleted: 0,
      is_expanded: 1,
      sort_order: 2,
      color: '#2196f3',
    },
    disableContentCollapse: true,
  },
};
