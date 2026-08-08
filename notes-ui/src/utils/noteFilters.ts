export type NotesView = 'notes' | 'archive' | 'trash' | 'tag';

export const hasSearchQuery = (value: string | null | undefined) => Boolean(value?.trim());

export const getNotesView = (
  currentTags: string[],
  showArchived: boolean,
  showTrash: boolean,
): NotesView | undefined => {
  if (showTrash && !showArchived && currentTags.length === 0) return 'trash';
  if (showArchived && !showTrash && currentTags.length === 0) return 'archive';
  if (!showArchived && !showTrash && currentTags.length === 1) return 'tag';
  if (!showArchived && !showTrash && currentTags.length === 0) return 'notes';
  return undefined;
};

export const getTagsFromUrl = (params: URLSearchParams) => {
  if (hasSearchQuery(params.get('q')) || params.get('deleted') === '1') {
    return [];
  }
  const tag = params.get('tags')?.split(',')[0];
  return tag ? [tag] : [];
};
