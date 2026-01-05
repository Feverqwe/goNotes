import React, {FC, PropsWithChildren, useCallback, useContext} from 'react';
import {Box, IconButton, Typography} from '@mui/material';
import {ContentCopy} from '@mui/icons-material';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {SnackCtx} from '../../ctx/SnackCtx';

interface CodeCodeProps extends PropsWithChildren {
  node: unknown;
  className: string;
}

const CodeCode: FC<CodeCodeProps> = ({node, className, children, ...props}) => {
  const showSnackbar = useContext(SnackCtx);

  const isMultiline = /\n/.test(String(children));
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const codeContent = String(children).trim();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeContent);
    showSnackbar('Код скопирован', 'success');
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;

      if (e.key.toLowerCase() === 'enter') {
        e.stopPropagation();
        navigator.clipboard.writeText(codeContent);
        showSnackbar('Код скопирован', 'success');
      }
    },
    [codeContent, showSnackbar],
  );

  if (!isMultiline) {
    return (
      <code
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleCopy}
        style={{
          backgroundColor: 'rgba(144, 202, 249, 0.1)',
          color: '#90caf9',
          padding: '2px 5px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '0.85em',
          cursor: 'pointer',
          border: '1px solid rgba(144, 202, 249, 0.2)',
          wordBreak: 'break-word',
          transition: 'all 0.1s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(144, 202, 249, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(144, 202, 249, 0.1)';
        }}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <Box
      sx={{
        my: 1.5,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        bgcolor: '#282c34',
        code: {
          bgcolor: '#282c34',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.2,
          bgcolor: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#5c6370',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.65rem',
          }}
        >
          {lang || 'code'}
        </Typography>

        <IconButton
          onClick={handleCopy}
          size="medium"
          sx={{
            color: '#8e8e93',
            p: 1,
            '&:hover': {color: '#90caf9'},
          }}
        >
          <ContentCopy sx={{fontSize: 16}} />
        </IconButton>
      </Box>

      <SyntaxHighlighter
        style={oneDark}
        language={lang}
        PreTag="div"
        wrapLines={true}
        wrapLongLines={true}
        codeTagProps={{
          style: {
            padding: 0,
            display: 'block',
          },
        }}
        customStyle={{
          margin: 0,
          padding: '12px',
        }}
        {...props}
      >
        {codeContent}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeCode;
