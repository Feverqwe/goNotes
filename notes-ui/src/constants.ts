import {ThemeOptions} from '@mui/material';

export const API_BASE = '';

export const themeProps = {
  palette: {
    mode: 'dark',
  },

  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
} satisfies ThemeOptions;

export const HEADER_HEIGHT = 49;

export const SIDE_PANEL_WIDTH = 240;

export const POST_LIMIT = 6;

export const NOTE_COLORS = [
  '',
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#3f51b5',
  '#2196f3',
  '#4caf50',
  '#ffeb3b',
  '#ff9800',
];
