import React, {FC, useCallback, useMemo} from 'react';
import {Badge, Box, IconButton, Paper, TextField} from '@mui/material';
import {Clear, FilterList} from '@mui/icons-material';

interface SearchBoxProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  handleOpenTagMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  setSelectedNoteId: (id: number | undefined) => void;
  hasActiveFilters: boolean;
}

const SearchBox: FC<SearchBoxProps> = ({
  searchQuery,
  setSearchQuery,
  currentTags,
  setCurrentTags,
  handleOpenTagMenu,
  showArchived,
  setShowArchived,
  hasActiveFilters,
  setSelectedNoteId,
}) => {
  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setCurrentTags([]);
    setShowArchived(false);
    setSelectedNoteId(undefined);
  }, [setSearchQuery, setCurrentTags, setShowArchived, setSelectedNoteId]);

  const activeFiltersCount = useMemo(
    () => currentTags.length + (showArchived ? 1 : 0),
    [currentTags.length, showArchived],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [setSearchQuery],
  );

  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 11,
        bgcolor: 'rgba(18, 18, 18, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid #2c2c2e',
        py: 0.5,
        px: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: 'sm',
          mx: 'auto',
          height: '48px',
        }}
      >
        <TextField
          fullWidth
          variant="standard"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={handleChange}
          slotProps={{
            input: {
              slotProps: {
                input: {
                  tabIndex: 1,
                },
              },
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
                    },
                  }}
                >
                  <IconButton
                    tabIndex={1}
                    size="medium"
                    onClick={handleOpenTagMenu}
                    sx={{
                      p: 1,
                      color: activeFiltersCount > 0 ? '#90caf9' : '#8e8e93',

                      bgcolor: activeFiltersCount > 0 ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                      '&:focus-visible': {
                        boxShadow: '0 0 0 2px #90caf9',
                        borderColor: '#90caf9',
                      },
                    }}
                  >
                    <FilterList sx={{fontSize: 22}} />
                  </IconButton>
                </Badge>
              ),
              endAdornment: hasActiveFilters && (
                <IconButton
                  tabIndex={1}
                  size="medium"
                  onClick={handleClearAll}
                  sx={{
                    p: 1,
                    color: '#8e8e93',
                    '&:hover': {color: '#ff453a'},
                    '&:focus-visible': {
                      boxShadow: '0 0 0 2px #90caf9',
                      borderColor: '#90caf9',
                    },
                  }}
                >
                  <Clear sx={{fontSize: 20}} />
                </IconButton>
              ),
              sx: {
                bgcolor: '#1c1c1e',
                px: 1,
                borderRadius: '8px',
                height: '40px',
                fontSize: '0.95rem',
                border: '1px solid #2c2c2e',
                '&:focus-within': {
                  bgcolor: '#252527',
                  borderColor: 'rgba(144, 202, 249, 0.5)',
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
