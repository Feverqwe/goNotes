import React, {FC, useCallback, useContext} from 'react';
import {Divider, ListItemIcon, ListItemText, Menu, MenuItem, SvgIconTypeMap} from '@mui/material';
import {
  Archive,
  CheckCircleOutline,
  ContentCopy,
  Delete,
  Edit,
  Unarchive,
} from '@mui/icons-material';
import {Note} from '../../types';
import {SnackCtx} from '../../ctx/SnackCtx';

interface NoteMenuProps {
  anchorEl: Element | null;
  handleCloseMenu: () => void;
  selectedMsg: Note | null;
  enterSelectMode: (msg: Note) => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onArchiveClick: () => void;
}

const NoteMenu: FC<NoteMenuProps> = ({
  anchorEl,
  handleCloseMenu,
  selectedMsg,
  enterSelectMode,
  onEditClick,
  onDeleteClick,
  onArchiveClick,
}) => {
  const showSnackbar = useContext(SnackCtx);

  const handleCopy = useCallback(() => {
    if (selectedMsg) {
      navigator.clipboard.writeText(selectedMsg.content);
      handleCloseMenu();
      showSnackbar('Текст скопирован в буфер обмена', 'success');
    }
  }, [selectedMsg, handleCloseMenu, showSnackbar]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleCloseMenu}
      transitionDuration={100}
      slotProps={{
        list: {sx: {py: 0.5}},
        paper: {
          sx: {
            bgcolor: 'rgba(24, 24, 26, 0.85)', // Чуть плотнее фон
            backdropFilter: 'blur(15px) saturate(140%)',
            minWidth: 200,
            borderRadius: '4px', // Строгий радиус
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {[
        {
          icon: <CheckCircleOutline />,
          text: 'Выбрать',
          onClick: () => enterSelectMode(selectedMsg!),
          color: '#8e8e93',
        },
        {icon: <ContentCopy />, text: 'Копировать', onClick: handleCopy, color: '#8e8e93'},
        {icon: <Edit />, text: 'Изменить', onClick: onEditClick, color: '#90caf9'},
        {
          icon: selectedMsg?.is_archived ? <Unarchive /> : <Archive />,
          text: selectedMsg?.is_archived ? 'Разархивировать' : 'В архив',
          onClick: onArchiveClick,
          color: '#8e8e93',
        },
      ].map((item, idx) => (
        <MenuItem
          key={idx}
          onClick={item.onClick}
          sx={{
            py: 1,
            px: 2,
            borderRadius: 0, // Пункты на всю ширину без скруглений
            transition: 'background-color 0.1s',
            '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.05)'},
          }}
        >
          <ListItemIcon sx={{minWidth: '32px !important', color: item.color}}>
            {React.cloneElement(item.icon, {sx: {fontSize: 18}})}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            slotProps={{primary: {fontSize: '0.85rem', color: '#efefef'}}}
          />
        </MenuItem>
      ))}

      <Divider sx={{my: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)'}} />

      <MenuItem
        onClick={onDeleteClick}
        sx={{
          py: 1,
          px: 2,
          borderRadius: 0,
          '&:hover': {bgcolor: 'rgba(255, 69, 58, 0.1)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '32px !important'}}>
          <Delete sx={{fontSize: 18, color: '#ff453a'}} />
        </ListItemIcon>
        <ListItemText
          primary="Удалить"
          slotProps={{primary: {fontSize: '0.85rem', color: '#ff453a'}}}
        />
      </MenuItem>
    </Menu>
  );
};

export default NoteMenu;
