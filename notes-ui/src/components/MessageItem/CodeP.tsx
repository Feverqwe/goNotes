import React, {FC, PropsWithChildren} from 'react';
import {Typography} from '@mui/material';

const CodeP: FC<PropsWithChildren> = ({children}) => (
  <Typography variant="body1" sx={{mb: 1, lineHeight: 1.6}}>
    {children}
  </Typography>
);

export default CodeP;
