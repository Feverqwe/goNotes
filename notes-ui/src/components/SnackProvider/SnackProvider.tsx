import React, {FC, PropsWithChildren, useCallback, useState} from 'react';
import {AlertColor} from '@mui/material/Alert/Alert';
import {Alert, Snackbar, useTheme} from '@mui/material';
import {SnackCtx} from '../../ctx/SnackCtx';

const SnackProvider: FC<PropsWithChildren> = ({children}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');

  const theme = useTheme();

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleCloseSnackbar = useCallback((event: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  return (
    <SnackCtx.Provider value={showSnackbar}>
      {children}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{width: '100%', bgcolor: theme.palette.background.paper}}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </SnackCtx.Provider>
  );
};

export default SnackProvider;
