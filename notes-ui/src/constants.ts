import {ThemeOptions} from '@mui/material';

export const API_BASE = '';

export const themeProps = {
  palette: {
    mode: 'dark',
    primary: {main: '#90caf9'},
    background: {default: '#000', paper: '#121212'},
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

export const HEADER_HEIGHT = 57;

export const POST_LIMIT = 6;
