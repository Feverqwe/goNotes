import React, {CSSProperties, FC, PropsWithChildren, useCallback, useContext, useMemo} from 'react';
import {Box, IconButton, Theme, Typography, useTheme} from '@mui/material';
import {ContentCopy} from '@mui/icons-material';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark, oneLight} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {SnackCtx} from '../../ctx/SnackCtx';

// Стили для инлайнового кода теперь используют функции темы
const getInlineCodeStyle = (theme: Theme): CSSProperties => ({
  backgroundColor: theme.palette.action.selected,
  color: theme.palette.primary.main,
  padding: '2px 5px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '0.85em',
  cursor: 'pointer',
  border: `1px solid ${theme.palette.divider}`,
  wordBreak: 'break-word',
  transition: theme.transitions.create(['background-color']),
});

const codeBoxSx = {
  my: 1.5,
  borderRadius: 2,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper', // Раньше был жесткий #282c34
};

const codeHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 1.5,
  py: 0.2,
  bgcolor: 'action.hover', // Раньше была ручная прозрачность
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const codeLangSx = {
  color: 'text.disabled',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontSize: '0.65rem',
};

const copySx = {
  color: 'text.secondary',
  p: 1,
  '&:hover': {color: 'primary.main'},
};

const copyIconSx = {fontSize: 16};

const codeTagProps = {
  style: {
    padding: 0,
    display: 'block',
    backgroundColor: 'transparent', // Позволяем Box управлять фоном
  },
};

const customStyle = {
  margin: 0,
  padding: '12px',
  backgroundColor: 'transparent', // Используем фон контейнера MUI
};

interface CodeCodeProps extends PropsWithChildren {
  node?: unknown;
  className?: string;
}

const CodeCode: FC<CodeCodeProps> = ({node, className, children, ...props}) => {
  const showSnackbar = useContext(SnackCtx);
  const theme = useTheme();

  const isMultiline = useMemo(() => /\n/.test(String(children)), [children]);
  const lang = useMemo(() => {
    const m = /language-(\w+)/.exec(className || '');
    return m ? m[1] : '';
  }, [className]);

  const codeContent = useMemo(() => String(children).trim(), [children]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(codeContent);
      showSnackbar('Код скопирован', 'success');
    },
    [codeContent, showSnackbar],
  );

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

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = theme.palette.action.hover;
    },
    [theme],
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = theme.palette.action.selected;
    },
    [theme],
  );

  if (!isMultiline) {
    return (
      <code
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleCopy}
        style={getInlineCodeStyle(theme)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onMouseLeave}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <Box sx={codeBoxSx}>
      <Box sx={codeHeaderSx}>
        <Typography variant="caption" sx={codeLangSx}>
          {lang || 'code'}
        </Typography>
        <IconButton onClick={handleCopy} size="medium" sx={copySx}>
          <ContentCopy sx={copyIconSx} />
        </IconButton>
      </Box>
      <SyntaxHighlighter
        style={theme.palette.mode === 'dark' ? oneDark : oneLight}
        language={lang}
        PreTag="div"
        wrapLines={true}
        wrapLongLines={true}
        codeTagProps={codeTagProps}
        customStyle={customStyle}
        {...props}
      >
        {codeContent}
      </SyntaxHighlighter>
    </Box>
  );
};

export default CodeCode;
