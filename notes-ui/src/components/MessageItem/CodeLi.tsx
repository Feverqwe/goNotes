import React, {FC, PropsWithChildren} from 'react';
import {Box} from '@mui/material';

const sx = {mb: 0.5};

const CodeLi: FC<PropsWithChildren> = ({children}) => (
  <Box component="li" sx={sx}>
    {children}
  </Box>
);

export default CodeLi;
