import React, {FC, PropsWithChildren, memo, useMemo} from 'react';

import {
  Add as AddIcon,
  ArchiveOutlined,
  DarkMode,
  DeleteOutlined,
  LightMode,
} from '@mui/icons-material';
import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Switch,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {HEADER_HEIGHT, SIDE_PANEL_WIDTH} from '../../constants';
import {useAppTheme} from '../../ctx/ThemeCtx';

const drawerSx = {
  width: SIDE_PANEL_WIDTH,
};

const menuSx = {
  flexGrow: 1,
  overflowY: 'auto',
};

interface NavigationDrawerProps extends PropsWithChildren {
  onCreateClick: () => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  showArchived: boolean;
  onArchiveClick: () => void;
  showTrash: boolean;
  onTrashClick: () => void;
}

const NavigationDrawer: FC<NavigationDrawerProps> = ({
  children,
  onCreateClick,
  open,
  onOpen,
  onClose,
  showArchived,
  onArchiveClick,
  showTrash,
  onTrashClick,
}: NavigationDrawerProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const {mode, toggleTheme} = useAppTheme();

  const drawerSlotProps = useMemo(
    () =>
      ({
        paper: {
          sx: {
            width: SIDE_PANEL_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            paddingTop: `${HEADER_HEIGHT}px`,
          },
          variant: 'elevation',
          elevation: 1,
        },
      }) satisfies React.ComponentProps<typeof SwipeableDrawer>['slotProps'],
    [],
  );

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
      <Box sx={menuSx}>
        {isDesktop && (
          <ListItemButton onClick={onCreateClick}>
            <ListItemIcon>
              <AddIcon sx={{fontSize: 18}} />
            </ListItemIcon>
            <ListItemText
              primary="Добавить заметку"
              slotProps={{primary: {sx: {fontSize: '0.85rem'}}}}
            />
          </ListItemButton>
        )}
        {children}
      </Box>
      <Box sx={{mt: 'auto'}}>
        <Divider />
        <ListItemButton selected={showArchived} onClick={onArchiveClick}>
          <ListItemIcon sx={{minWidth: 40}}>
            <ArchiveOutlined
              sx={{fontSize: 18, color: showArchived ? 'primary.main' : 'text.secondary'}}
            />
          </ListItemIcon>
          <ListItemText primary="Архив" slotProps={{primary: {sx: {fontSize: '0.85rem'}}}} />
        </ListItemButton>
        <ListItemButton selected={showTrash} onClick={onTrashClick}>
          <ListItemIcon sx={{minWidth: 40}}>
            <DeleteOutlined
              sx={{fontSize: 18, color: showTrash ? 'primary.main' : 'text.secondary'}}
            />
          </ListItemIcon>
          <ListItemText primary="Корзина" slotProps={{primary: {sx: {fontSize: '0.85rem'}}}} />
        </ListItemButton>
        <ListItemButton onClick={toggleTheme}>
          <ListItemIcon sx={{minWidth: 40}}>
            {mode === 'dark' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
          </ListItemIcon>
          <ListItemText
            primary={mode === 'dark' ? 'Темная тема' : 'Светлая тема'}
            slotProps={{primary: {sx: {fontSize: '0.85rem'}}}}
          />
          <Switch edge="end" checked={mode === 'dark'} size="small" />
        </ListItemButton>
      </Box>
    </SwipeableDrawer>
  );
};

export default memo(NavigationDrawer);
