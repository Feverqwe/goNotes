import React, {FC, memo} from 'react';
import {Box} from '@mui/material';

interface ColorItemProps {
  color: string;
  isSelected: boolean;
  onClick: (color: string) => void;
}

const ColorItem: FC<ColorItemProps> = memo(({color, isSelected, onClick}: ColorItemProps) => {
  return (
    <Box
      onClick={() => onClick(color)}
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: color || 'transparent',
        border: '2px solid',
        borderColor: color ? 'transparent' : '#8e8e93',
        cursor: 'pointer',
        '&:hover': {scale: '1.1'},
        outline: isSelected ? '2px solid #90caf9' : 'none',
        outlineOffset: 2,
      }}
    />
  );
});

export default ColorItem;
