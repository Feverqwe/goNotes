import React, {FC} from 'react';
import {Box, ListItemIcon, ListItemText, Menu, MenuItem} from '@mui/material';
import {CheckCircleOutline, ContentCopy, Delete, Edit} from '@mui/icons-material';
import {Note} from '../../types';

interface NoteMenuProps {
  anchorEl: Element | null;
  handleCloseMenu: () => void;
  selectedMsg: Note | null;
  enterSelectMode: (msg: Note) => void;
  handleCopy: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

const NoteMenu: FC<NoteMenuProps> = ({
  anchorEl,
  handleCloseMenu,
  selectedMsg,
  enterSelectMode,
  handleCopy,
  onEditClick,
  onDeleteClick,
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleCloseMenu}
      transitionDuration={150}
      slotProps={{
        // Убираем стандартные отступы списка, чтобы кастомизировать их
        list: {sx: {py: 0.8}},
        paper: {
          sx: {
            bgcolor: 'rgba(28, 28, 30, 0.85)', // Стекло
            backdropFilter: 'blur(25px)', // Сильный блюр
            minWidth: 220,
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            backgroundImage: 'none', // Убираем стандартное наложение MUI
          },
        },
      }}
    >
      <MenuItem
        onClick={() => {
          if (!selectedMsg) return;
          enterSelectMode(selectedMsg);
        }}
        sx={{
          mx: 1,
          my: 0.2,
          borderRadius: '10px',
          transition: 'all 0.2s',
          '&:hover': {bgcolor: 'rgba(144, 202, 249, 0.12)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '36px !important'}}>
          <CheckCircleOutline fontSize="small" />
        </ListItemIcon>
        <ListItemText slotProps={{primary: {fontSize: '0.9rem', color: '#efefef'}}}>
          Выбрать
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={handleCopy}
        sx={{
          mx: 1,
          my: 0.2,
          borderRadius: '10px',
          transition: 'all 0.2s',
          '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.08)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '36px !important'}}>
          <ContentCopy fontSize="small" sx={{color: '#efefef'}} />
        </ListItemIcon>
        <ListItemText
          primary="Копировать"
          slotProps={{primary: {fontSize: '0.9rem', color: '#efefef'}}}
        />
      </MenuItem>

      <MenuItem
        onClick={onEditClick}
        sx={{
          mx: 1,
          my: 0.2,
          borderRadius: '10px',
          transition: 'all 0.2s',
          '&:hover': {bgcolor: 'rgba(144, 202, 249, 0.12)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '36px !important'}}>
          <Edit fontSize="small" sx={{color: '#90caf9'}} />
        </ListItemIcon>
        <ListItemText
          primary="Изменить"
          slotProps={{primary: {fontSize: '0.9rem', color: '#efefef'}}}
        />
      </MenuItem>

      {/* Разделитель перед опасным действием */}
      <Box sx={{height: '1px', bgcolor: 'rgba(255, 255, 255, 0.05)', my: 0.8, mx: 2}} />

      <MenuItem
        onClick={onDeleteClick}
        sx={{
          mx: 1,
          my: 0.2,
          borderRadius: '10px',
          transition: 'all 0.2s',
          '&:hover': {bgcolor: 'rgba(255, 69, 58, 0.15)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '36px !important'}}>
          <Delete fontSize="small" sx={{color: '#ff453a'}} />
        </ListItemIcon>
        <ListItemText
          primary="Удалить"
          slotProps={{
            primary: {
              fontSize: '0.9rem',
              color: '#ff453a',
              fontWeight: 600,
            },
          }}
        />
      </MenuItem>
    </Menu>
  );
};

export default NoteMenu;
