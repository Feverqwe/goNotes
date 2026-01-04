import React, {FC, PropsWithChildren} from 'react';
import {Box} from '@mui/material';

const CodeUl: FC<PropsWithChildren> = ({children}) => (
  <Box component="ul" sx={{pl: 2, mb: 1}}>
    {children}
  </Box>
);

export default CodeUl;
