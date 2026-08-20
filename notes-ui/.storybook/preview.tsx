import React from 'react';

import {Box, CssBaseline} from '@mui/material';
import type {Preview} from '@storybook/react-vite';

import {AppThemeProvider} from '../src/ctx/ThemeCtx';

import '../src/index.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <AppThemeProvider>
        <CssBaseline />
        <Box sx={{width: 'min(480px, calc(100vw - 32px))'}}>
          <Story />
        </Box>
      </AppThemeProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
};

export default preview;
