import React, {FC, PropsWithChildren, useCallback, useContext} from 'react';
import {Box, IconButton} from '@mui/material';
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
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeContent);
    showSnackbar('Код скопирован', 'success');
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Если фокус на кнопке внутри карточки (например, меню), не перехватываем
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
          backgroundColor: 'rgba(144, 202, 249, 0.1)', // Полупрозрачный голубой фон
          color: '#90caf9', // Цвет текста в тон темы
          padding: '2px 5px', // Чуть более компактные отступы
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '0.85em', // Чуть меньше основного текста
          cursor: 'pointer',
          border: '1px solid rgba(144, 202, 249, 0.2)', // Тонкая рамка для четкости
          wordBreak: 'break-word', // Чтобы не ломало верстку
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
          '&:focus-visible': {
            opacity: 1,
            boxShadow: '0 0 0 2px #90caf9',
            borderColor: '#90caf9',
          },
        }}
      >
        <ContentCopy fontSize="small" />
      </IconButton>

      <SyntaxHighlighter
        style={oneDark}
        language={match?.[1]}
        wrapLines={true}
        lineProps={{
          style: {wordBreak: 'normal', whiteSpace: 'pre-wrap'},
        }}
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
