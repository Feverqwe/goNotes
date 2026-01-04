import React, {FC, PropsWithChildren, useContext} from 'react';
import {Box} from '@mui/material';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {oneDark} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {AlertColor} from '@mui/material/Alert/Alert';
import {SnackCtx} from '../../ctx/SnackCtx';

interface CodeCodeProps extends PropsWithChildren {
  node: Element;
  className: string;
  inline: boolean;
  showSnackbar: (message: string, severity?: AlertColor) => void;
}

const CodeCode: FC<CodeCodeProps> = ({node, inline, className, children, ...props}) => {
  const showSnackbar = useContext(SnackCtx);

  // Проверяем, есть ли указание языка (например, ```go )
  const match = /language-(\w+)/.exec(className || '');
  const codeContent = String(children).replace(/\n$/, '');

  // Функция для копирования именно этого блока кода
  const copyCodeBlock = () => {
    navigator.clipboard.writeText(codeContent);
    showSnackbar('Код скопирован в буфер обмена', 'success');
  };

  return !inline && match ? (
    <Box
      onClick={copyCodeBlock} // Клик по блоку копирует его
      sx={{
        my: 1,
        borderRadius: 2,
        overflow: 'hidden',
        fontSize: '0.85rem',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.1s',
        '&:active': {transform: 'scale(0.99)'}, // Эффект нажатия
        '&:hover::after': {
          content: '"Кликните, чтобы скопировать"',
          position: 'absolute',
          top: 5,
          right: 10,
          fontSize: '0.6rem',
          color: 'rgba(255,255,255,0.5)',
          bgcolor: 'rgba(0,0,0,0.3)',
          px: 1,
          borderRadius: 1,
        },
      }}
    >
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        customStyle={{margin: 0, padding: '12px'}}
        {...props}
      >
        {codeContent}
      </SyntaxHighlighter>
    </Box>
  ) : (
    // Стиль для инлайнового кода (внутри предложения)
    <code
      onClick={(e) => {
        navigator.clipboard.writeText(codeContent);
        showSnackbar('Скопировано', 'success');
      }}
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
};

export default CodeCode;
