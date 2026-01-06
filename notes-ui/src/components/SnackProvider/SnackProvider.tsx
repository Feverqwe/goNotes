import React, {FC, PropsWithChildren, useCallback, useState} from 'react';
import {AlertColor} from '@mui/material/Alert/Alert';
import {Alert, Snackbar} from '@mui/material';
import {SnackCtx} from '../../ctx/SnackCtx';

const snackAnchorOrigin: {vertical: 'top'; horizontal: 'center'} = {
  vertical: 'top',
  horizontal: 'center',
};

const alertSx = {
  width: '100%',
  // Цвет фона берется из темы, но объект sx статичен
  bgcolor: 'background.paper',
};

const SnackProvider: FC<PropsWithChildren> = ({children}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');

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
        anchorOrigin={snackAnchorOrigin}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={alertSx}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </SnackCtx.Provider>
  );
};

export default SnackProvider;
