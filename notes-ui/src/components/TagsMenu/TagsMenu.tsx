import React, {FC} from 'react';

// MUI Core Components
import {Box, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography} from '@mui/material';

// MUI Icons
import {Check, FilterList, Tag as TagIcon} from '@mui/icons-material';

// Markdown & Syntax Highlighting

interface TagsMenuProps {
  tagMenuAnchor: HTMLButtonElement | null;
  handleCloseTagMenu: () => void;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  allTags: string[];
  toggleTag: (tag: string) => void;
}

const TagsMenu: FC<TagsMenuProps> = ({
  tagMenuAnchor,
  handleCloseTagMenu,
  currentTags,
  setCurrentTags,
  allTags,
  toggleTag,
}) => {
  return (
    <Menu
      anchorEl={tagMenuAnchor}
      open={Boolean(tagMenuAnchor)}
      onClose={handleCloseTagMenu}
      transitionDuration={250}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'rgba(20, 20, 22, 0.8)',
            backdropFilter: 'blur(25px) saturate(180%)', // Более сочный блюр
            minWidth: 260,
            maxHeight: 500,
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            mt: 1.5,
            overflow: 'hidden',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* Кастомный заголовок с кнопкой закрытия */}
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
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
              fontWeight: 600,
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
          pb: 1.5,
          maxHeight: 380,
          overflowY: 'auto',
          // Стилизация скроллбара
          '&::-webkit-scrollbar': {width: '4px'},
          '&::-webkit-scrollbar-thumb': {bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px'},
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
                    borderRadius: '12px',
                    py: 1,
                    px: 1.5,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isActive ? '#90caf9' : 'rgba(255,255,255,0.05)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isActive ? (
                        <Check sx={{fontSize: 16, color: '#000'}} />
                      ) : (
                        <Typography sx={{fontSize: 12, color: '#8e8e93', fontWeight: 'bold'}}>
                          #
                        </Typography>
                      )}
                    </Box>
                  </ListItemIcon>

                  <ListItemText
                    primary={tag}
                    slotProps={{
                      primary: {
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? '#fff' : '#8e8e93',
                        sx: {transition: 'color 0.3s'},
                      },
                    }}
                  />

                  {/* Точка-индикатор активного состояния */}
                  {isActive && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: '#90caf9',
                        boxShadow: '0 0 10px #90caf9',
                      }}
                    />
                  )}
                </MenuItem>
              );
            })}
          </Stack>
        )}
      </Box>
    </Menu>
  );
};

export default TagsMenu;
