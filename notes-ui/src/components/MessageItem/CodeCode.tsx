import React, {CSSProperties, FC, PropsWithChildren, useCallback, useContext, useMemo} from 'react';
import {Box, IconButton, Typography} from '@mui/material';
import {ContentCopy} from '@mui/icons-material';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {SnackCtx} from '../../ctx/SnackCtx';

const inlineCodeStyle = {
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
} satisfies CSSProperties;

const codeBoxSx = {
  my: 1.5,
  borderRadius: 2,
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  bgcolor: '#282c34',
  code: {
    bgcolor: '#282c34',
  },
};

const codeHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 1.5,
  py: 0.2,
  bgcolor: 'rgba(0, 0, 0, 0.3)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const codeLangSx = {
  color: '#5c6370',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontSize: '0.65rem',
};

const copySx = {
  color: '#8e8e93',
  p: 1,
  '&:hover': {color: '#90caf9'},
};

const copyIconSx = {fontSize: 16};

const codeTagProps = {
  style: {
    padding: 0,
    display: 'block',
  },
};

const customStyle = {
  margin: 0,
  padding: '12px',
};

interface CodeCodeProps extends PropsWithChildren {
  node?: unknown;
  className?: string;
}

const CodeCode: FC<CodeCodeProps> = ({node, className, children, ...props}) => {
  const showSnackbar = useContext(SnackCtx);

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

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(144, 202, 249, 0.2)';
  }, []);

  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(144, 202, 249, 0.1)';
  }, []);

  if (!isMultiline) {
    return (
      <code
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleCopy}
        style={inlineCodeStyle}
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
        style={oneDark}
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
