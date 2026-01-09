import React, {FC, memo} from 'react';
import {Box} from '@mui/material';
import {getBgColor, getBorderColor} from '../MessageItem/utils';

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
        bgcolor: color ? getBgColor(color) : 'transparent',
        border: '1px solid',
        borderColor: color ? getBorderColor(color) : '#8e8e93',
        cursor: 'pointer',
        '&:hover': {scale: '1.1'},
        outline: isSelected ? '2px solid #90caf9' : 'none',
        outlineOffset: 2,
      }}
    />
  );
});

export default ColorItem;
