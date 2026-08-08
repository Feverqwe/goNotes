import React, {FC, useCallback, useContext, useMemo, useState} from 'react';

import {
  Archive,
  CheckCircleOutlined,
  ContentCopy,
  Delete,
  Edit,
  LocalOfferOutlined,
  RestoreFromTrash,
  Sort,
  Unarchive,
} from '@mui/icons-material';
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Theme,
  alpha,
  useTheme,
} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {NOTE_COLORS} from '../../constants';
import {SnackCtx} from '../../ctx/SnackCtx';
import {useTags} from '../../hooks/useTags';
import {api} from '../../tools/api';
import {UpdateNoteRequest} from '../../tools/types';
import {Note} from '../../types';
import {addTagToNoteContent, removeTagFromNoteContent} from '../../utils/noteTags';
import TagSelectionDialog from '../TagSelectionDialog/TagSelectionDialog';

import ColorItem from './ColorItem';

const getMenuSlotProps = (theme: Theme) => ({
  list: {sx: {py: 0.5}},
  paper: {
    sx: {
      bgcolor: alpha(theme.palette.background.paper, 0.85),
      backdropFilter: 'blur(15px) saturate(140%)',
      minWidth: 200,
      borderRadius: '8px',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: theme.shadows[8],
      backgroundImage: 'none',
    },
  },
});

const menuItemSx = {
  py: 1,
  px: 2,
  borderRadius: 0,
  transition: 'background-color 0.1s',
  '&:hover': {bgcolor: 'action.hover'},
};

const deleteMenuItemSx = {
  py: 1,
  px: 2,
  borderRadius: 0,
  '&:hover': {bgcolor: (theme: Theme) => alpha(theme.palette.error.main, 0.1)},
};

const colorBoxSx = {px: 2, py: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1};
const commonIconSx = {fontSize: 18};
const dividerSx = {my: 0.5, borderColor: 'divider'};
const primaryTextSlotProps = {primary: {sx: {fontSize: '0.85rem', color: 'text.primary'}}};
const deleteTextSlotProps = {primary: {sx: {fontSize: '0.85rem', color: 'error.main'}}};

interface NoteMenuProps {
  anchorElement: Element | null;
  onClose: () => void;
  note: Note | null;
  onEnterSelectionMode: (note: Note) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleArchive: () => void;
  onRestore: () => void;
  onEnterReorderMode: () => void;
  showTrash: boolean;
}

const NoteMenu: FC<NoteMenuProps> = ({
  anchorElement,
  onClose,
  note,
  onEnterSelectionMode,
  onEdit,
  onDelete,
  onToggleArchive,
  onRestore,
  onEnterReorderMode,
  showTrash,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const {data: allTags = []} = useTags();
  const [tagDialogNote, setTagDialogNote] = useState<Note | null>(null);

  const setColorMutation = useMutation({
    mutationFn: (color: string) => api.notes.setColor({id: note!.id, color}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      onClose();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при изменении цвета', 'error');
    },
  });

  const handleCopy = useCallback(() => {
    if (note) {
      navigator.clipboard.writeText(note.content);
      onClose();
    }
  }, [note, onClose]);

  const toggleTagMutation = useMutation({
    mutationFn: (params: UpdateNoteRequest) => api.notes.update(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      setTagDialogNote(null);
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при изменении тегов', 'error');
    },
  });

  const handleUpdateTags = useCallback(
    (tags: string[]) => {
      if (!tagDialogNote) return;

      const selectedTags = new Set(tags.map((tag) => tag.toLowerCase()));
      const currentTags = new Set((tagDialogNote.tags ?? []).map((tag) => tag.toLowerCase()));
      const contentWithoutRemovedTags = (tagDialogNote.tags ?? []).reduce(
        (content, tag) =>
          selectedTags.has(tag.toLowerCase()) ? content : removeTagFromNoteContent(content, tag),
        tagDialogNote.content,
      );
      const content = tags.reduce(
        (value, tag) =>
          currentTags.has(tag.toLowerCase()) ? value : addTagToNoteContent(value, tag),
        contentWithoutRemovedTags,
      );
      const formData = new FormData();
      formData.append('id', String(tagDialogNote.id));
      formData.append('content', content);
      toggleTagMutation.mutate(formData);
    },
    [tagDialogNote, toggleTagMutation],
  );

  const handleOpenTagDialog = useCallback(() => {
    if (!note) return;
    setTagDialogNote(note);
    onClose();
  }, [onClose, note]);

  const handleCloseTagDialog = useCallback(() => setTagDialogNote(null), []);

  const handleSelect = useCallback(() => {
    if (note) onEnterSelectionMode(note);
  }, [note, onEnterSelectionMode]);

  const menuActions = useMemo(() => {
    const isArchived = note?.is_archived;
    return [
      {
        icon: <CheckCircleOutlined />,
        text: 'Выбрать',
        onClick: handleSelect,
        color: 'text.secondary',
      },
      {
        icon: <ContentCopy />,
        text: 'Копировать',
        onClick: handleCopy,
        color: 'text.secondary',
      },
      {icon: <Edit />, text: 'Изменить', onClick: onEdit, color: 'primary.main'},
      {
        icon: <LocalOfferOutlined />,
        text: 'Изменить тег',
        onClick: handleOpenTagDialog,
        color: 'text.secondary',
      },
      ...(showTrash
        ? [
            {
              icon: <RestoreFromTrash />,
              text: 'Восстановить',
              onClick: onRestore,
              color: 'primary.main',
            },
          ]
        : [
            {
              icon: isArchived ? <Unarchive /> : <Archive />,
              text: isArchived ? 'Разархивировать' : 'В архив',
              onClick: onToggleArchive,
              color: 'text.secondary',
            },
            {
              icon: <Sort />,
              text: 'Сортировать',
              onClick: onEnterReorderMode,
              color: 'text.secondary',
            },
          ]),
    ];
  }, [
    note?.is_archived,
    handleSelect,
    handleCopy,
    onEdit,
    handleOpenTagDialog,
    onToggleArchive,
    onRestore,
    onEnterReorderMode,
    showTrash,
  ]);

  return (
    <>
      <Menu
        anchorEl={anchorElement}
        open={Boolean(anchorElement)}
        onClose={onClose}
        transitionDuration={100}
        slotProps={getMenuSlotProps(theme)}
      >
        {menuActions.map((item, idx) => (
          <MenuItem key={idx} onClick={item.onClick} sx={menuItemSx}>
            <ListItemIcon sx={{minWidth: '32px !important', color: item.color}}>
              {React.cloneElement(item.icon, {sx: commonIconSx})}
            </ListItemIcon>
            <ListItemText primary={item.text} slotProps={primaryTextSlotProps} />
          </MenuItem>
        ))}
        <Divider sx={dividerSx} />
        <Box sx={colorBoxSx}>
          {NOTE_COLORS.map((col) => (
            <ColorItem
              key={col}
              color={col}
              isSelected={note?.color === col}
              onClick={(color) => setColorMutation.mutate(color)}
            />
          ))}
        </Box>
        <Divider sx={dividerSx} />
        <MenuItem onClick={onDelete} sx={deleteMenuItemSx}>
          <ListItemIcon sx={{minWidth: '32px !important'}}>
            <Delete sx={{fontSize: 18, color: 'error.main'}} />
          </ListItemIcon>
          <ListItemText
            primary={showTrash ? 'Удалить навсегда' : 'В корзину'}
            slotProps={deleteTextSlotProps}
          />
        </MenuItem>
      </Menu>
      <TagSelectionDialog
        open={Boolean(tagDialogNote)}
        title="Изменить теги"
        description="Выберите теги для заметки:"
        tags={allTags}
        initialSelectedTags={tagDialogNote?.tags}
        loading={toggleTagMutation.isPending}
        requireChanges
        submitLabel="Сохранить теги"
        onClose={handleCloseTagDialog}
        onSubmit={handleUpdateTags}
      />
    </>
  );
};

export default NoteMenu;
