import React, {FC, useCallback, useMemo} from 'react';
import {
  alpha,
  AppBar,
  Badge,
  Box,
  IconButton,
  TextField,
  Theme,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {Clear, Menu as MenuIcon, Search as SearchIcon} from '@mui/icons-material';
import {SIDE_PANEL_WIDTH} from '../../constants';

const textFieldWrapperSx = {
  width: '100%',
  maxWidth: 'sm',
  mx: 'auto',
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
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  setSelectedNoteId: (id: number | undefined) => void;
  hasActiveFilters: boolean;
  onMenuClick: () => void;
}

const SearchBox: FC<SearchBoxProps> = ({
  searchQuery,
  setSearchQuery,
  currentTags,
  setCurrentTags,
  showArchived,
  setShowArchived,
  hasActiveFilters,
  setSelectedNoteId,
  onMenuClick,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setCurrentTags([]);
    setShowArchived(false);
    setSelectedNoteId(undefined);
  }, [setSearchQuery, setCurrentTags, setShowArchived, setSelectedNoteId]);

  const activeFiltersCount = useMemo(
    () => Boolean(currentTags.length + (showArchived ? 1 : 0)),
    [currentTags.length, showArchived],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [setSearchQuery],
  );

  const appBarSx = useMemo(
    () => ({
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
            color={activeFiltersCount ? (showArchived ? 'warning' : 'primary') : 'default'}
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
              <IconButton
                onClick={onMenuClick}
              >
                <MenuIcon sx={{fontSize: 24}} />
              </IconButton>
            )}
          </Badge>
        ),
        endAdornment: hasActiveFilters && (
          <IconButton size="medium" onClick={handleClearAll} sx={clearBtnSx}>
            <Clear sx={{fontSize: 20}} />
          </IconButton>
        ),
        sx: textFieldInputSx,
      },
    }),
    [activeFiltersCount, showArchived, isDesktop, onMenuClick, hasActiveFilters, handleClearAll],
  );

  return (
    <AppBar variant="outlined" position="sticky" sx={appBarSx}>
      {isDesktop && <Box width={SIDE_PANEL_WIDTH} />}
      <Box sx={textFieldWrapperSx}>
        <TextField
          fullWidth
          variant="standard"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={handleChange}
          slotProps={slotProps}
        />
      </Box>
    </AppBar>
  );
};

export default SearchBox;
