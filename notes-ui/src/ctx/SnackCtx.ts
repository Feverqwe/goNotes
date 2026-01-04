import React from 'react';
import {AlertColor} from '@mui/material/Alert/Alert';

export const SnackCtx = React.createContext<(message: string, severity?: AlertColor) => void>(
  () => {},
);
