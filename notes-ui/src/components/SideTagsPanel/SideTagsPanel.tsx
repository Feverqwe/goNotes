import React, {FC, memo, PropsWithChildren} from 'react';
import {Box, Button, SwipeableDrawer, useMediaQuery, useTheme} from '@mui/material';
import {Add as AddIcon} from '@mui/icons-material';
import {SIDE_PANEL_WIDTH} from '../../constants';

const drawerPaperSx = {
  paper: {
    sx: {
      width: SIDE_PANEL_WIDTH,
      bgcolor: '#121212',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      backgroundImage: 'none',
    },
  },
};

const contentWrapperSx = {
  pt: 3,
  pb: 4,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
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

const boxSx = {px: 2, mb: 3};

const btnSx = {
  textTransform: 'none',
  borderRadius: '8px',
  '&:focus-visible': {
    boxShadow: '0 0 0 2px #90caf9',
  },
};

const menuSx = {
  flexGrow: 1,
  overflowY: 'auto',
};

interface SideTagsPanelProps extends PropsWithChildren {
  onCreateClick: () => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const SideTagsPanel: FC<SideTagsPanelProps> = memo(
  ({children, onCreateClick, open, onOpen, onClose}: SideTagsPanelProps) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    return (
      <SwipeableDrawer
        anchor="left"
        open={isDesktop ? true : open}
        onOpen={onOpen}
        onClose={onClose}
        variant={isDesktop ? 'permanent' : 'temporary'}
        disableDiscovery={false}
        disableSwipeToOpen={false}
        swipeAreaWidth={30}
        slotProps={drawerPaperSx}
      >
        <Box sx={contentWrapperSx}>
          {isDesktop && (
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
          )}

          <Box sx={menuSx}>{children}</Box>
        </Box>
      </SwipeableDrawer>
    );
  },
);

export default SideTagsPanel;
