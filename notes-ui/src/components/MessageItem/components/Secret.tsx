import React, {FC, PropsWithChildren, useState} from 'react';
import {Typography} from '@mui/material';

interface SecretProps extends PropsWithChildren {
  node?: unknown;
}

const Secret: FC<SecretProps> = ({children}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleClick = () => {
    setIsRevealed(!isRevealed);
  };

  const placeholderText = String(children).replace(/[^\s\n]/g, '•');

  if (isRevealed) {
    return <>{children}</>;
  }

  return (
    <Typography
      component="span"
      onClick={handleClick}
      title={'Показать секрет'}
      sx={{
        cursor: 'pointer',
      }}
    >
      {placeholderText}
    </Typography>
  );
};

export default Secret;