import React, {FC, useCallback, useContext, useEffect, useState} from 'react';

// MUI Core Components
import {Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography} from '@mui/material';
// MUI Icons
import {Archive, Check} from '@mui/icons-material';
import {Note} from '../../types';
import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';

// Markdown & Syntax Highlighting

interface TagsMenuProps {
  tagMenuAnchor: HTMLButtonElement | null;
  handleCloseTagMenu: () => void;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  messages: Note[];
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
}

const TagsMenu: FC<TagsMenuProps> = ({
  tagMenuAnchor,
  handleCloseTagMenu,
  currentTags,
  setCurrentTags,
  messages,
  showArchived,
  setShowArchived,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await api.tags.list();
      setAllTags(data);
    } catch (e) {
      showSnackbar('Не удалось загрузить теги', 'error');
    }
  }, [showSnackbar]);

  // Вызываем при старте и после изменений данных
  useEffect(() => {
    fetchTags();
  }, [messages, fetchTags]); // Обновляем список, если изменились сообщения

  const toggleTag = useCallback(
    (tag: string) => {
      setCurrentTags((prev) => {
        if (prev.includes(tag)) {
          // Если тег уже есть — удаляем его
          return prev.filter((t) => t !== tag);
        }
        // Если нет — добавляем в массив
        return [...prev, tag];
      });
    },
    [setCurrentTags],
  );

  return (
    <Menu
      anchorEl={tagMenuAnchor}
      open={Boolean(tagMenuAnchor)}
      onClose={handleCloseTagMenu}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'rgba(24, 24, 26, 0.85)',
            backdropFilter: 'blur(15px) saturate(140%)',
            minWidth: 240,
            maxHeight: 450,
            borderRadius: '4px', // Тот же строгий радиус
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            mt: 0.5,
            backgroundImage: 'none',
          },
        },
      }}
    >
      <MenuItem
        onClick={() => {
          setShowArchived(!showArchived);
          handleCloseTagMenu();
        }}
        sx={{
          py: 1.2,
          px: 2,
          bgcolor: showArchived ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
          '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.05)'},
        }}
      >
        <ListItemIcon sx={{minWidth: '32px !important'}}>
          <Archive sx={{fontSize: 18, color: showArchived ? '#90caf9' : '#8e8e93'}} />
        </ListItemIcon>
        <ListItemText
          primary="Только архив"
          slotProps={{primary: {fontSize: '0.85rem', color: showArchived ? '#90caf9' : '#efefef'}}}
        />
      </MenuItem>

      <Divider sx={{borderColor: 'rgba(255, 255, 255, 0.08)'}} />

      <MenuItem
        onClick={() => setCurrentTags([])}
        sx={{
          px: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '20px',
        }}
        disabled={currentTags.length === 0}
      >
        <Typography sx={{color: '#8e8e93', fontSize: '0.7rem', fontWeight: 700}}>
          ФИЛЬТРЫ
        </Typography>
        {currentTags.length > 0 && (
          <Typography
            variant="caption"
            sx={{color: '#90caf9', cursor: 'pointer', fontSize: '0.7rem'}}
          >
            Сбросить
          </Typography>
        )}
      </MenuItem>

      <Divider sx={{borderColor: 'rgba(255, 255, 255, 0.08)'}} />

      {allTags.map((tag) => {
        const isActive = currentTags.includes(tag);
        return (
          <MenuItem
            key={tag}
            tabIndex={0}
            onClick={() => toggleTag(tag)}
            sx={{
              py: 0.8,
              px: 2,
              bgcolor: isActive ? 'rgba(144, 202, 249, 0.05)' : 'transparent',
              '&:hover': {bgcolor: 'rgba(255, 255, 255, 0.05)'},
            }}
          >
            <ListItemIcon sx={{minWidth: '28px !important'}}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: isActive ? '#90caf9' : '#48484a',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                #
              </Typography>
            </ListItemIcon>
            <ListItemText
              primary={tag}
              slotProps={{primary: {fontSize: '0.85rem', color: isActive ? '#fff' : '#8e8e93'}}}
            />
            {isActive && <Check sx={{fontSize: 14, color: '#90caf9'}} />}
          </MenuItem>
        );
      })}
    </Menu>
  );
};

export default TagsMenu;
