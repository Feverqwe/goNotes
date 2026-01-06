import React, {FC, PropsWithChildren} from 'react';
import {Typography} from '@mui/material';

const sx = {mb: 1, lineHeight: 1.6};

const CodeP: FC<PropsWithChildren> = ({children}) => (
  <Typography variant="body1" sx={sx}>
    {children}
  </Typography>
);

export default CodeP;
