import React, {FC, PropsWithChildren, useState} from 'react';
import {Link, Typography, useTheme} from '@mui/material';
import CodeCode from '../CodeCode';

interface SecretProps extends PropsWithChildren {
  node?: unknown;
}

const Secret: FC<SecretProps> = ({children}) => {
  const theme = useTheme();
  const [isRevealed, setIsRevealed] = useState(false);

  const handleClick = () => {
    setIsRevealed(!isRevealed);
  };

  const placeholderText = String(children).replace(/[^\s\n]/g, '•');

  if (isRevealed) {
    return <CodeCode>{children}</CodeCode>;
  }

  return (
    <Link
      component="span"
      onClick={handleClick}
      title={'Показать секрет'}
      underline="none"
      sx={{
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
      }}
    >
      {placeholderText}
    </Link>
  );
};

export default Secret;
