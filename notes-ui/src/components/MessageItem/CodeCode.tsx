import React, {FC, PropsWithChildren, useCallback, useMemo} from 'react';
import {Box, IconButton, SxProps, Theme, Typography, useTheme} from '@mui/material';
import {ContentCopy} from '@mui/icons-material';
import {PrismAsync as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark, oneLight} from 'react-syntax-highlighter/dist/esm/styles/prism';

const getInlineCodeStyle = (theme: Theme): SxProps<Theme> => ({
  backgroundColor: theme.palette.action.selected,
  color: theme.palette.primary.main,
  padding: '2px 5px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '0.85em',
  cursor: 'pointer',
  border: `1px solid ${theme.palette.divider}`,
  wordBreak: 'break-word',
  '&:active': {
    bgcolor: theme.palette.action.hover,
  },
});

const codeBoxSx = {
  my: 1.5,
  borderRadius: 2,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
};

const codeHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 1.5,
  py: 0.2,
  bgcolor: 'action.hover',
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
    display: 'block',
    fontFamily: 'monospace',
    fontSize: '0.9em',
  },
};

const customStyle = {
  margin: 0,
  padding: '12px',
  borderRadius: 0,
};

interface CodeCodeProps extends PropsWithChildren {
  node?: unknown;
  className?: string;
}

const CodeCode: FC<CodeCodeProps> = ({node, className, children, ...props}) => {
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
    },
    [codeContent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key.toLowerCase() === 'enter') {
        e.stopPropagation();
        navigator.clipboard.writeText(codeContent);
      }
    },
    [codeContent],
  );

  if (!isMultiline) {
    return (
      <Box
        component={'code'}
        tabIndex={0}
        className="inline"
        onKeyDown={handleKeyDown}
        onClick={handleCopy}
        sx={getInlineCodeStyle(theme)}
        {...props}
      >
        {children}
      </Box>
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
        key={theme.palette.mode}
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
