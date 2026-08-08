import React, {FC, useCallback, useMemo} from 'react';

import {
  ArchiveOutlined,
  FilterAltOff,
  Menu as MenuIcon,
  Search as SearchIcon,
  Unarchive,
} from '@mui/icons-material';
import {
  AppBar,
  Badge,
  Box,
  IconButton,
  TextField,
  Theme,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {SIDE_PANEL_WIDTH} from '../../constants';

const textFieldWrapperSx = {
  width: '100%',
  maxWidth: 'sm',
  mx: 'auto',
};

const brandSlotSx = {
  width: SIDE_PANEL_WIDTH,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
};

const brandIconSx = {
  width: 30,
  height: 30,
};

const pageTitleSx = {
  minWidth: 0,
  ml: 0.5,
  color: 'text.primary',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const badgeSx = {
  '& .MuiBadge-badge': {
    top: 6,
    right: 6,
  },
};

const clearBtnSx = {
  color: 'text.secondary',
  '&:hover': {color: 'error.main'},
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const actionsSx = {display: 'flex', alignItems: 'center'};

const textFieldInputSx = {
  px: 1,
  borderRadius: '8px',
  fontSize: '0.95rem',
  border: '1px solid',
  borderColor: 'divider',
  '&:focus-within': {
    bgcolor: 'action.hover',
  },
};

const inputBaseProps = {tabIndex: 1};

interface SearchBoxProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  currentTags: string[];
  showArchived: boolean;
  showTrash: boolean;
  hasActiveFilters: boolean;
  pageTitle: string;
  onResetFilters: () => void;
  onCategoryArchiveChange: (archived: boolean) => void;
  onMenuClick: () => void;
}

const SearchBox: FC<SearchBoxProps> = ({
  searchQuery,
  onSearchQueryChange,
  currentTags,
  showArchived,
  showTrash,
  hasActiveFilters,
  pageTitle,
  onResetFilters,
  onCategoryArchiveChange,
  onMenuClick,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchQueryChange(e.target.value),
    [onSearchQueryChange],
  );

  const handleCategoryArchiveClick = useCallback(
    () => onCategoryArchiveChange(!showArchived),
    [onCategoryArchiveChange, showArchived],
  );

  const appBarSx = useMemo(
    () =>
      ({
        zIndex: theme.zIndex.drawer + 1,
        py: 0.5,
        px: 1,
        display: 'flex',
        flexDirection: 'row',
        bgcolor: alpha(theme.palette.background.paper, 0.7),
        backgroundImage: 'none',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderLeft: 0,
        borderRight: 0,
        borderTop: 0,
      }) satisfies React.ComponentProps<typeof AppBar>['sx'],
    [theme.palette.background.paper, theme.zIndex.drawer],
  );

  const slotProps = useMemo(
    () => ({
      input: {
        slotProps: {
          input: inputBaseProps,
        },
        disableUnderline: true,
        startAdornment: (
          <Badge
            variant="dot"
            color={showArchived || showTrash ? 'warning' : 'primary'}
            invisible={!hasActiveFilters}
            sx={badgeSx}
          >
            {isDesktop ? (
              <Box
                sx={{
                  p: 1,
                  display: 'flex',
                }}
              >
                <SearchIcon sx={{fontSize: 22}} />
              </Box>
            ) : (
              <IconButton onClick={onMenuClick}>
                <MenuIcon sx={{fontSize: 24}} />
              </IconButton>
            )}
          </Badge>
        ),
        endAdornment: (
          <Box sx={actionsSx}>
            {currentTags.length === 1 && !showTrash && (
              <Tooltip
                title={showArchived ? 'Показать текущие заметки' : 'Показать архив категории'}
              >
                <IconButton
                  size="medium"
                  onClick={handleCategoryArchiveClick}
                  color={showArchived ? 'primary' : 'default'}
                  aria-label={
                    showArchived ? 'Показать текущие заметки' : 'Показать архив категории'
                  }
                >
                  {showArchived ? (
                    <Unarchive sx={{fontSize: 20}} />
                  ) : (
                    <ArchiveOutlined sx={{fontSize: 20}} />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {hasActiveFilters && (
              <Tooltip title="Сбросить все фильтры">
                <IconButton
                  size="medium"
                  onClick={onResetFilters}
                  sx={clearBtnSx}
                  aria-label="Сбросить все фильтры"
                >
                  <FilterAltOff sx={{fontSize: 20}} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
        sx: textFieldInputSx,
      },
    }),
    [
      currentTags.length,
      showArchived,
      showTrash,
      isDesktop,
      onMenuClick,
      hasActiveFilters,
      handleCategoryArchiveClick,
      onResetFilters,
    ],
  );

  return (
    <AppBar variant="outlined" position="sticky" sx={appBarSx}>
      {isDesktop && (
        <Box sx={brandSlotSx}>
          <Typography sx={pageTitleSx}>{pageTitle}</Typography>
        </Box>
      )}
      <Box sx={textFieldWrapperSx}>
        <TextField
          fullWidth
          variant="standard"
          placeholder={showTrash ? 'Поиск в корзине...' : 'Глобальный поиск...'}
          value={searchQuery}
          onChange={handleChange}
          slotProps={slotProps}
        />
      </Box>
    </AppBar>
  );
};

export default SearchBox;
