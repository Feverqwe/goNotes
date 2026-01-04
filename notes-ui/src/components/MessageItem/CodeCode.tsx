import React, {FC, PropsWithChildren, useContext} from 'react';
import {Box, IconButton} from '@mui/material';
import {ContentCopy} from '@mui/icons-material';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {SnackCtx} from '../../ctx/SnackCtx';

interface CodeCodeProps extends PropsWithChildren {
  node: any;
  className: string;
}

const CodeCode: FC<CodeCodeProps> = ({node, className, children, ...props}) => {
  const showSnackbar = useContext(SnackCtx);

  const isMultiline = /\n/.test(String(children));
  const match = /language-(\w+)/.exec(className || '');
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeContent);
    showSnackbar('Код скопирован', 'success');
  };

  if (!isMultiline) {
    return (
      <code
        onClick={handleCopy}
        style={{
          backgroundColor: '#2c2c2e',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          color: '#90caf9',
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
        my: 1,
        borderRadius: 2,
        overflow: 'hidden',
        fontSize: '0.85rem',
        position: 'relative',
        '&:hover .copy-button': {opacity: 1},
      }}
    >
      <IconButton
        className="copy-button"
        onClick={handleCopy}
        size="medium" // Ваш выбор размера
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          zIndex: 2,
          color: '#90caf9',
          bgcolor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)', // Добавим немного блюра для эстетики
          opacity: {xs: 1, sm: 0},
          transition: 'opacity 0.2s, background-color 0.2s',
          '&:hover': {
            bgcolor: 'rgba(144, 202, 249, 0.15)',
            color: '#fff',
          },
        }}
      >
        <ContentCopy fontSize="small" />
      </IconButton>

      <SyntaxHighlighter
        style={oneDark}
        language={match?.[1]}
        PreTag="div"
        // Добавили pr: 6, чтобы текст кода не заезжал под кнопку medium размера
        customStyle={{margin: 0, padding: '12px', paddingRight: '48px'}}
        {...props}
      >
        {codeContent}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeCode;
