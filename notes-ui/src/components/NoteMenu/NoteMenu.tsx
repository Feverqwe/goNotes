import React, {FC, useCallback, useContext, useMemo} from 'react';
import {Divider, ListItemIcon, ListItemText, Menu, MenuItem} from '@mui/material';
import {
  Archive,
  CheckCircleOutline,
  ContentCopy,
  Delete,
  Edit,
  Sort,
  Unarchive,
} from '@mui/icons-material';
import {Note} from '../../types';
import {SnackCtx} from '../../ctx/SnackCtx';

const menuSlotProps = {
  list: {sx: {py: 0.5}},
  paper: {
    sx: {
      bgcolor: 'rgba(24, 24, 26, 0.85)',
      backdropFilter: 'blur(15px) saturate(140%)',
      minWidth: 200,
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      backgroundImage: 'none',
    },
  },
};

const menuItemSx = {
  py: 1,
  px: 2,
  borderRadius: 0,
  transition: 'background-color 0.1s',
  '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.05)'},
};

const deleteMenuItemSx = {
  py: 1,
  px: 2,
  borderRadius: 0,
  '&:hover': {bgcolor: 'rgba(255, 69, 58, 0.1)'},
};

const getListItemIconSx = (color: string) => ({
  minWidth: '32px !important',
  color: color,
});

const commonIconSx = {fontSize: 18};
const dividerSx = {my: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)'};

const primaryTextSlotProps = {primary: {fontSize: '0.85rem', color: '#efefef'}};
const deleteTextSlotProps = {primary: {fontSize: '0.85rem', color: '#ff453a'}};

const deleteIconSx = {fontSize: 18, color: '#ff453a'};
const baseListItemIconSx = {minWidth: '32px !important'};

interface NoteMenuProps {
  anchorEl: Element | null;
  handleCloseMenu: () => void;
  selectedMsg: Note | null;
  enterSelectMode: (msg: Note) => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onArchiveClick: () => void;
  enterReorderMode: () => void;
}

const NoteMenu: FC<NoteMenuProps> = ({
  anchorEl,
  handleCloseMenu,
  selectedMsg,
  enterSelectMode,
  onEditClick,
  onDeleteClick,
  onArchiveClick,
  enterReorderMode,
}) => {
  const showSnackbar = useContext(SnackCtx);

  const handleCopy = useCallback(() => {
    if (selectedMsg) {
      navigator.clipboard.writeText(selectedMsg.content);
      handleCloseMenu();
      showSnackbar('Текст скопирован в буфер обмена', 'success');
    }
  }, [selectedMsg, handleCloseMenu, showSnackbar]);

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
        color: '#8e8e93',
      },
      {icon: <ContentCopy />, text: 'Копировать', onClick: handleCopy, color: '#8e8e93'},
      {icon: <Edit />, text: 'Изменить', onClick: onEditClick, color: '#90caf9'},
      {
        icon: isArchived ? <Unarchive /> : <Archive />,
        text: isArchived ? 'Разархивировать' : 'В архив',
        onClick: onArchiveClick,
        color: '#8e8e93',
      },
      {
        icon: <Sort />,
        text: 'Сортировать',
        onClick: enterReorderMode,
        color: '#8e8e93',
      },
    ];
  }, [
    selectedMsg?.is_archived,
    onSelectClick,
    handleCopy,
    onEditClick,
    onArchiveClick,
    enterReorderMode,
  ]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleCloseMenu}
      transitionDuration={100}
      slotProps={menuSlotProps}
    >
      {menuActions.map((item, idx) => (
        <MenuItem key={idx} onClick={item.onClick} sx={menuItemSx}>
          <ListItemIcon sx={getListItemIconSx(item.color)}>
            {React.cloneElement(item.icon, {sx: commonIconSx})}
          </ListItemIcon>
          <ListItemText primary={item.text} slotProps={primaryTextSlotProps} />
        </MenuItem>
      ))}

      <Divider sx={dividerSx} />

      <MenuItem onClick={onDeleteClick} sx={deleteMenuItemSx}>
        <ListItemIcon sx={baseListItemIconSx}>
          <Delete sx={deleteIconSx} />
        </ListItemIcon>
        <ListItemText primary="Удалить" slotProps={deleteTextSlotProps} />
      </MenuItem>
    </Menu>
  );
};

export default NoteMenu;
