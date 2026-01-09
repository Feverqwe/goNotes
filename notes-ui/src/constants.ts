import {ThemeOptions} from '@mui/material';

export const API_BASE = '';

export const themeProps = {
  palette: {},

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
  '', // Стандартный (без цвета)
  '#f44336', // Красный
  '#ff9800', // Оранжевый
  '#ffeb3b', // Желтый
  '#4caf50', // Зеленый
  '#00bcd4', // Циан
  '#2196f3', // Синий
  '#3f51b5', // Индиго
  '#9c27b0', // Фиолетовый
  '#795548', // Коричневый
];
