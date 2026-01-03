import {ThemeOptions} from '@mui/material';

export const API_BASE = '';

export const themeProps = {
  palette: {
    mode: 'dark',
    primary: {main: '#90caf9'},
    background: {default: '#000', paper: '#121212'},
  },
  // Глобальное отключение эффектов
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true, // Отключает пульсацию для всех кнопок и иконок
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Опционально: убирает тени у кнопок для плоского стиля
      },
    },
  },
} satisfies ThemeOptions;
