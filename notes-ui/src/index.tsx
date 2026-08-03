import React from 'react';

import {CssBaseline} from '@mui/material';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';

import App from './App';
import SnackProvider from './components/SnackProvider/SnackProvider';
import {AppThemeProvider} from './ctx/ThemeCtx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: true,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SnackProvider>
          <CssBaseline />
          <App />
        </SnackProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  </React.StrictMode>,
);
