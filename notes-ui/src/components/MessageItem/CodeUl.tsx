import React, {FC, PropsWithChildren} from 'react';
import {Box} from '@mui/material';

const sx = {pl: 2, mb: 1};

const CodeUl: FC<PropsWithChildren> = ({children}) => (
  <Box component="ul" sx={sx}>
    {children}
  </Box>
);

export default CodeUl;
