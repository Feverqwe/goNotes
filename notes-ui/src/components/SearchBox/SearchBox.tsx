import React, {FC} from 'react';
import {Badge, Box, IconButton, Paper, TextField} from '@mui/material';
import {Clear, FilterList} from '@mui/icons-material';

interface SearchBoxProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  currentTags: string[];
  handleOpenTagMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const SearchBox: FC<SearchBoxProps> = ({
  searchQuery,
  setSearchQuery,
  currentTags,
  handleOpenTagMenu,
}) => {
  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 11,
        // Более глубокое размытие и мягкий фон
        bgcolor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        py: 1, // Увеличим отступы для «воздуха»
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: 'sm',
          mx: 'auto',
        }}
      >
        <TextField
          fullWidth
          size="medium"
          variant="standard"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <Badge
                  badgeContent={currentTags.length}
                  color="primary"
                  // Настроим Badge, чтобы он был аккуратнее
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
                    size="small"
                    onClick={handleOpenTagMenu}
                    sx={{
                      color: currentTags.length > 0 ? '#90caf9' : '#8e8e93',
                      bgcolor: currentTags.length > 0 ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                      '&:hover': {bgcolor: 'rgba(255,255,255,0.05)'},
                    }}
                  >
                    <FilterList sx={{fontSize: 20}} />
                  </IconButton>
                </Badge>
              ),
              endAdornment: searchQuery && (
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery('')}
                  sx={{color: '#8e8e93', '&:hover': {color: '#efefef'}}}
                >
                  <Clear sx={{fontSize: 18}} />
                </IconButton>
              ),
              sx: {
                bgcolor: '#1c1c1e',
                px: 0.5,
                borderRadius: '4px', // Более скругленные углы
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
