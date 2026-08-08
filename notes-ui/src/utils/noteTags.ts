const TAG_END_PATTERN = String.raw`[\s$!@#%^&*()=+\[\]{}|\\;:'",.<>?/\x60]`;
const CODE_PATTERN = /(```[\s\S]*?```|`[^`\n]*`)/g;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const addTagToNoteContent = (content: string, tag: string) => {
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  return `${content}${separator}#${tag}`;
};

export const removeTagFromNoteContent = (content: string, tag: string) => {
  const tagPattern = new RegExp(String.raw`#${escapeRegExp(tag)}(?=$|${TAG_END_PATTERN})`, 'giu');

  return content
    .split(CODE_PATTERN)
    .map((part, index) => {
      if (index % 2 === 1) return part;

      return part
        .replace(tagPattern, '')
        .replace(/[ \t]+(?=\n|$)/g, '')
        .replace(/(^|\n)[ \t]+(?=\n|$)/g, '$1');
    })
    .join('')
    .replace(/\n[ \t]*$/, '');
};
