import React, {FC, PropsWithChildren} from 'react';
import {Box} from '@mui/material';

const CodeLi: FC<PropsWithChildren> = ({children}) => (
  <Box component="li" sx={{mb: 0.5}}>
    {children}
  </Box>
);

export default CodeLi;
