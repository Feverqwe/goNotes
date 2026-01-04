import React, {FC, useCallback, useContext, useEffect, useState} from 'react';

// MUI Core Components
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
// MUI Icons
import {Archive, FilterList, Tag as TagIcon} from '@mui/icons-material';
import axios from 'axios';
import {API_BASE} from '../../constants';
import {Note} from '../../types';
import {SnackCtx} from '../../ctx/SnackCtx';

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
  const [allTags, setAllTags] = useState([]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/tags/list`);
      setAllTags(res.data);
    } catch (e) {
      console.error('Ошибка загрузки тегов', e);
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
            minWidth: 260,
            maxHeight: 500,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            mt: 1,
            overflow: 'hidden',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* Кастомный заголовок с кнопкой закрытия */}
      <Box
        sx={{
          px: 1.5,
          pt: 1,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <FilterList sx={{fontSize: 18, color: '#90caf9'}} />
          ФИЛЬТРЫ
        </Typography>

        {currentTags.length > 0 && (
          <Typography
            variant="caption"
            onClick={() => setCurrentTags([])}
            sx={{
              color: '#90caf9',
              cursor: 'pointer',
              fontSize: '0.7rem',
              '&:hover': {textDecoration: 'underline'},
            }}
          >
            Сбросить ({currentTags.length})
          </Typography>
        )}
      </Box>

      {/* Список тегов в виде сетки или списка */}
      <Box
        sx={{
          px: 1,
          pb: 0.5,
          maxHeight: 380,
          overflowY: 'auto',
        }}
      >
        {allTags.length === 0 ? (
          <Box sx={{py: 4, textAlign: 'center', opacity: 0.5}}>
            <TagIcon sx={{fontSize: 40, mb: 1}} />
            <Typography variant="body2">Теги еще не созданы</Typography>
          </Box>
        ) : (
          <Stack spacing={0.5}>
            {allTags.map((tag) => {
              const isActive = currentTags.includes(tag);
              return (
                <MenuItem
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  disableRipple // Отключаем стандартный рипл для чистоты
                  sx={{
                    py: 1,
                    px: 1.5,
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(144, 202, 249, 0.3)' : 'transparent',
                    bgcolor: isActive ? 'rgba(144, 202, 249, 0.08)' : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(144, 202, 249, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  <ListItemIcon sx={{minWidth: '32px !important'}}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Typography sx={{fontSize: 12, color: '#8e8e93'}}>#</Typography>
                    </Box>
                  </ListItemIcon>

                  <ListItemText
                    primary={tag}
                    slotProps={{
                      primary: {
                        fontSize: '0.9rem',
                        fontWeight: 400,
                        color: isActive ? '#fff' : '#8e8e93',
                      },
                    }}
                  />
                </MenuItem>
              );
            })}
          </Stack>
        )}
      </Box>
      <Divider sx={{mx: 1, my: 0.5}} />
      <MenuItem
        onClick={() => {
          setShowArchived(!showArchived);
          handleCloseTagMenu();
        }}
        sx={{
          mx: 1,
          my: 0.5,
          borderRadius: 1,
          bgcolor: showArchived ? 'rgba(144, 202, 249, 0.15)' : 'transparent',
        }}
      >
        <ListItemIcon sx={{minWidth: '32px !important'}}>
          <Archive fontSize="small" sx={{color: showArchived ? '#90caf9' : '#8e8e93'}} />
        </ListItemIcon>
        <ListItemText
          primary="Только архив"
          slotProps={{primary: {fontSize: '0.9rem', color: showArchived ? '#90caf9' : '#efefef'}}}
        />
      </MenuItem>
    </Menu>
  );
};

export default TagsMenu;
