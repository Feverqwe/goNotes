import React, {FC, useCallback, useContext, useMemo, useState} from 'react';
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
import {
  Archive,
  CheckCircleOutline,
  ContentCopy,
  Delete,
  Edit,
  LocalOfferOutlined,
  RestoreFromTrash,
  Sort,
  Unarchive,
} from '@mui/icons-material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Note} from '../../types';
import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {NOTE_COLORS} from '../../constants';
import ColorItem from './ColorItem';
import {useTags} from '../../hooks/useTags';
import {UpdateMessageRequest} from '../../tools/types';
import {addTagToContent, removeTagFromContent} from './utils';
import NoteTagDialog from './NoteTagDialog';

// Выносим стили в функцию, чтобы иметь доступ к теме
const getMenuSlotProps = (theme: Theme) => ({
  list: {sx: {py: 0.5}},
  paper: {
    sx: {
      bgcolor: alpha(theme.palette.background.paper, 0.85), // Заменено с жесткого #18181a
      backdropFilter: 'blur(15px) saturate(140%)',
      minWidth: 200,
      borderRadius: '8px', // Немного увеличили для современного вида
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
const primaryTextSlotProps = {primary: {fontSize: '0.85rem', color: 'text.primary'}};
const deleteTextSlotProps = {primary: {fontSize: '0.85rem', color: 'error.main'}};

interface NoteMenuProps {
  anchorEl: Element | null;
  handleCloseMenu: () => void;
  selectedMsg: Note | null;
  enterSelectMode: (msg: Note) => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onArchiveClick: () => void;
  onRestoreClick: () => void;
  enterReorderMode: () => void;
  showTrash: boolean;
}

const NoteMenu: FC<NoteMenuProps> = ({
  anchorEl,
  handleCloseMenu,
  selectedMsg,
  enterSelectMode,
  onEditClick,
  onDeleteClick,
  onArchiveClick,
  onRestoreClick,
  enterReorderMode,
  showTrash,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const {data: allTags = []} = useTags();
  const [tagDialogNote, setTagDialogNote] = useState<Note | null>(null);

  const setColorMutation = useMutation({
    mutationFn: (color: string) => api.messages.setColor({id: selectedMsg!.id, color}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      handleCloseMenu();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при изменении цвета', 'error');
    },
  });

  const handleCopy = useCallback(() => {
    if (selectedMsg) {
      navigator.clipboard.writeText(selectedMsg.content);
      handleCloseMenu();
    }
  }, [selectedMsg, handleCloseMenu]);

  const toggleTagMutation = useMutation({
    mutationFn: (params: UpdateMessageRequest) => api.messages.update(params),
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

  const handleToggleTag = useCallback(
    (tag: string) => {
      if (!tagDialogNote) return;

      const hasTag = tagDialogNote.tags?.some((item) => item.toLowerCase() === tag) ?? false;
      const content = hasTag
        ? removeTagFromContent(tagDialogNote.content, tag)
        : addTagToContent(tagDialogNote.content, tag);
      const formData = new FormData();
      formData.append('id', String(tagDialogNote.id));
      formData.append('content', content);
      toggleTagMutation.mutate(formData);
    },
    [tagDialogNote, toggleTagMutation],
  );

  const handleOpenTagDialog = useCallback(() => {
    if (!selectedMsg) return;
    setTagDialogNote(selectedMsg);
    handleCloseMenu();
  }, [handleCloseMenu, selectedMsg]);

  const handleCloseTagDialog = useCallback(() => setTagDialogNote(null), []);

  const onSelectClick = useCallback(() => {
    if (selectedMsg) enterSelectMode(selectedMsg);
  }, [selectedMsg, enterSelectMode]);

  const menuActions = useMemo(() => {
    const isArchived = selectedMsg?.is_archived;
    return [
      {
        icon: <CheckCircleOutline />,
        text: 'Выбрать',
        onClick: onSelectClick,
        color: 'text.secondary',
      },
      {
        icon: <ContentCopy />,
        text: 'Копировать',
        onClick: handleCopy,
        color: 'text.secondary',
      },
      {icon: <Edit />, text: 'Изменить', onClick: onEditClick, color: 'primary.main'},
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
              onClick: onRestoreClick,
              color: 'primary.main',
            },
          ]
        : [
            {
              icon: isArchived ? <Unarchive /> : <Archive />,
              text: isArchived ? 'Разархивировать' : 'В архив',
              onClick: onArchiveClick,
              color: 'text.secondary',
            },
            {
              icon: <Sort />,
              text: 'Сортировать',
              onClick: enterReorderMode,
              color: 'text.secondary',
            },
          ]),
    ];
  }, [
    selectedMsg?.is_archived,
    onSelectClick,
    handleCopy,
    onEditClick,
    handleOpenTagDialog,
    onArchiveClick,
    onRestoreClick,
    enterReorderMode,
    showTrash,
  ]);

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transitionDuration={100}
        slotProps={getMenuSlotProps(theme)} // Прокидываем тему через обертку или используем хук внутри slotProps
        // В MUI 6+ и 2026 году предпочтительнее использовать хук прямо в компоненте:
        PaperProps={{sx: getMenuSlotProps(theme).paper.sx}}
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
              isSelected={selectedMsg?.color === col}
              onClick={(color) => setColorMutation.mutate(color)}
            />
          ))}
        </Box>
        <Divider sx={dividerSx} />
        <MenuItem onClick={onDeleteClick} sx={deleteMenuItemSx}>
          <ListItemIcon sx={{minWidth: '32px !important'}}>
            <Delete sx={{fontSize: 18, color: 'error.main'}} />
          </ListItemIcon>
          <ListItemText
            primary={showTrash ? 'Удалить навсегда' : 'В корзину'}
            slotProps={deleteTextSlotProps}
          />
        </MenuItem>
      </Menu>
      <NoteTagDialog
        note={tagDialogNote}
        tags={allTags}
        loading={toggleTagMutation.isPending}
        onClose={handleCloseTagDialog}
        onSubmit={handleToggleTag}
      />
    </>
  );
};

export default NoteMenu;
