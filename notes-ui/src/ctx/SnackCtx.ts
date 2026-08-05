import React from 'react';

import {type AlertColor} from '@mui/material';

export const SnackCtx = React.createContext<(message: string, severity?: AlertColor) => void>(
  () => {},
);
