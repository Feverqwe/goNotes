import React, {FC, memo, PropsWithChildren} from 'react';
import {Box, Typography} from '@mui/material';
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

const SideTagsPanel: FC<PropsWithChildren> = memo(({children}: PropsWithChildren) => {
  return (
    <Box component="aside" sx={asideSx}>
      <Box sx={contentWrapperSx}>
        <Typography sx={titleSx}>Навигация</Typography>
        {children}
      </Box>
    </Box>
  );
});

export default SideTagsPanel;
