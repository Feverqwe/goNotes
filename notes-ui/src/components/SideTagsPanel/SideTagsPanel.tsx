import React, {FC, memo, PropsWithChildren} from 'react';
import {Box, Button, Typography} from '@mui/material';
import {Add as AddIcon} from '@mui/icons-material';
import {HEADER_HEIGHT, SIDE_PANEL_WIDTH} from '../../constants';

const asideSx = {
  width: SIDE_PANEL_WIDTH,
  display: {xs: 'none', md: 'block'},
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',

  position: 'sticky',
  top: HEADER_HEIGHT,

  height: `calc(100vh - ${HEADER_HEIGHT}px)`,
  overflowY: 'auto',

  '&::-webkit-scrollbar': {display: 'none'},
  scrollbarWidth: 'none',
};

const contentWrapperSx = {
  pt: 2,
  pb: 4,
};

const titleSx = {
  px: 2,
  mb: 1,
  color: '#5c6370',
  fontWeight: 700,
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const boxSx = {px: 2, mb: 2};

const btnSx = {
  textTransform: 'none',
  borderRadius: '8px',
  '&:focus-visible': {
    boxShadow: '0 0 0 2px #90caf9',
  },
};

interface SideTagsPanelProps extends PropsWithChildren {
  onCreateClick: () => void;
}

const SideTagsPanel: FC<SideTagsPanelProps> = memo(
  ({children, onCreateClick}: SideTagsPanelProps) => {
    return (
      <Box component="aside" sx={asideSx}>
        <Box sx={contentWrapperSx}>
          <Box sx={boxSx}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onCreateClick}
              sx={btnSx}
            >
              Создать заметку
            </Button>
          </Box>
          <Typography sx={titleSx}>Навигация</Typography>
          {children}
        </Box>
      </Box>
    );
  },
);

export default SideTagsPanel;
