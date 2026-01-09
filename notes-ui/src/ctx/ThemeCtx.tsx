import React, {createContext, useContext, useEffect, useState, useMemo} from 'react';
import {createTheme, ThemeProvider} from '@mui/material';
import {themeProps as baseThemeProps} from '../constants';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme-mode') as ThemeMode) || 'dark';
  });

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        ...baseThemeProps,
        palette: {
          ...baseThemeProps.palette,
          mode,
        },
      }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={{mode, toggleTheme}}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
