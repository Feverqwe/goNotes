import React, {FC, useCallback, useMemo} from 'react';
import {Badge, Box, IconButton, Paper, TextField} from '@mui/material';
import {Clear, FilterList} from '@mui/icons-material';

interface SearchBoxProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>; // Добавили сеттер для сброса тегов
  handleOpenTagMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
}

const SearchBox: FC<SearchBoxProps> = ({
  searchQuery,
  setSearchQuery,
  currentTags,
  setCurrentTags,
  handleOpenTagMenu,
  showArchived,
  setShowArchived,
}) => {
  // Функция для полной очистки поиска и тегов
  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setCurrentTags([]);
    setShowArchived(false);
  }, [setSearchQuery, setCurrentTags, setShowArchived]);

  const activeFiltersCount = useMemo(
    () => currentTags.length + (showArchived ? 1 : 0),
    [currentTags.length, showArchived],
  );

  // Определяем, активен ли какой-либо фильтр
  const hasFilters = useMemo(
    () => searchQuery.length > 0 || activeFiltersCount > 0 || showArchived,
    [activeFiltersCount, searchQuery.length, showArchived],
  );

  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 11,
        bgcolor: 'rgba(18, 18, 18, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        py: 1,
      }}
    >
      <Box sx={{display: 'flex', alignItems: 'center', maxWidth: 'sm', mx: 'auto'}}>
        <TextField
          fullWidth
          size="medium"
          variant="standard"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              tabIndex: 1,
              disableUnderline: true,
              startAdornment: (
                <Badge
                  badgeContent={activeFiltersCount}
                  color={showArchived ? 'warning' : 'primary'}
                  sx={{
                    mr: 1,
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      height: 16,
                      minWidth: 16,
                      top: 4,
                      right: 4,
                      border: '2px solid #1c1c1e',
                      transition: 'background-color 0.3s',
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={handleOpenTagMenu}
                    sx={{
                      color: activeFiltersCount > 0 ? '#90caf9' : '#8e8e93',
                      bgcolor: activeFiltersCount > 0 ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                      '&:hover': {bgcolor: 'rgba(255,255,255,0.05)'},
                      '&:focus-visible': {
                        boxShadow: '0 0 0 2px #90caf9',
                        borderColor: '#90caf9',
                      },
                    }}
                  >
                    <FilterList sx={{fontSize: 20}} />
                  </IconButton>
                </Badge>
              ),
              endAdornment: hasFilters && (
                <IconButton
                  size="small"
                  onClick={handleClearAll}
                  sx={{
                    color: '#8e8e93',
                    '&:hover': {color: '#ff453a'},
                  }}
                >
                  <Clear sx={{fontSize: 18}} />
                </IconButton>
              ),
              sx: {
                bgcolor: '#1c1c1e',
                px: 0.5,
                borderRadius: '4px',
                border: '1px solid transparent',
                '&:focus-within': {
                  bgcolor: '#252527',
                  border: '1px solid rgba(144, 202, 249, 0.3)',
                  boxShadow: '0 0 0 2px rgba(144, 202, 249, 0.05)',
                },
              },
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default SearchBox;
