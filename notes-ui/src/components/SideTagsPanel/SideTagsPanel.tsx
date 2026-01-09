import React, {FC, memo, PropsWithChildren} from 'react';
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
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
  pt: 3,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  marginTop: `${HEADER_HEIGHT}px`,
};

const boxSx = {px: 2, mb: 3};

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
            <Box sx={boxSx}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onCreateClick}
                sx={btnSx}
                color="primary"
              >
                Создать заметку
              </Button>
            </Box>
          )}
          <Box sx={menuSx}>{children}</Box>
          <Box sx={{mt: 'auto'}}>
            <Divider sx={{borderColor: 'divider'}} />
            <List>
              <ListItem>
                <ListItemIcon sx={{minWidth: 40}}>
                  {mode === 'dark' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={mode === 'dark' ? 'Темная тема' : 'Светлая тема'}
                  slotProps={{primary: {fontSize: '0.85rem'}}}
                />
                <Switch edge="end" onChange={toggleTheme} checked={mode === 'dark'} size="small" />
              </ListItem>
            </List>
          </Box>
        </Box>
      </SwipeableDrawer>
    );
  },
);

export default SideTagsPanel;
