import React from 'react';

import {Box, CssBaseline} from '@mui/material';
import type {Preview} from '@storybook/react-vite';

import {DESKTOP_NOTE_CARD_WIDTH} from '../src/constants';
import {AppThemeProvider} from '../src/ctx/ThemeCtx';

import '../src/index.css';

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <AppThemeProvider>
        <CssBaseline />
        <Box
          sx={{
            width:
              context.parameters.contentWidth ??
              `min(${DESKTOP_NOTE_CARD_WIDTH}px, calc(100vw - 32px))`,
          }}
        >
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
