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
        my: 1.5,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        bgcolor: '#282c34', // Основной фон OneDark
      }}
    >
      {/* Постоянная сервисная панель */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.2, // Узкая и аккуратная
          bgcolor: 'rgba(0, 0, 0, 0.3)', // Тёмная подложка
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
          size="medium" // Крупная область нажатия для тача
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
        lineProps={{style: {wordBreak: 'break-all', whiteSpace: 'pre-wrap'}}}
        customStyle={{
          margin: 0,
          padding: '12px',
          background: 'transparent', // Прозрачность, чтобы видеть фон родителя
        }}
        {...props}
      >
        {codeContent}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeCode;
