import React, {FC, memo, PropsWithChildren} from 'react';
import {
  Box,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Switch,
  Theme,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {Add as AddIcon, DarkMode, LightMode} from '@mui/icons-material';
import {HEADER_HEIGHT, SIDE_PANEL_WIDTH} from '../../constants';
import {useAppTheme} from '../../ctx/ThemeCtx';

const drawerSx = {
  width: SIDE_PANEL_WIDTH,
};

const contentWrapperSx = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  marginTop: `${HEADER_HEIGHT}px`,
  overflow: 'auto',
};

const boxSx = {px: 2, my: 3};

const btnSx = {
  textTransform: 'none',
  borderRadius: '8px',
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
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
    const {mode, toggleTheme} = useAppTheme();

    const drawerSlotProps = {
      paper: {
        sx: {
          width: SIDE_PANEL_WIDTH,
          borderRight: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        },
        variant: 'elevation',
        elevation: 1,
      },
    } satisfies React.ComponentProps<typeof SwipeableDrawer>['slotProps'];

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
        sx={drawerSx}
        slotProps={drawerSlotProps}
        elevation={2}
      >
        <Box sx={contentWrapperSx}>
          {isDesktop && (
            <ListItem disablePadding onClick={onCreateClick}>
              <ListItemButton>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Добавить заметку"
                  slotProps={{primary: {fontSize: '0.85rem'}}}
                />
              </ListItemButton>
            </ListItem>
          )}
          <Box sx={menuSx}>{children}</Box>
          <Box sx={{mt: 'auto'}}>
            <Divider />
            <ListItem disablePadding onClick={toggleTheme}>
              <ListItemButton>
                <ListItemIcon sx={{minWidth: 40}}>
                  {mode === 'dark' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={mode === 'dark' ? 'Темная тема' : 'Светлая тема'}
                  slotProps={{primary: {fontSize: '0.85rem'}}}
                />
                <Switch edge="end" checked={mode === 'dark'} size="small" />
              </ListItemButton>
            </ListItem>
          </Box>
        </Box>
      </SwipeableDrawer>
    );
  },
);

export default SideTagsPanel;
