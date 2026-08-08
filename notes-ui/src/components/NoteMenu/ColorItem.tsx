import React, {FC, memo} from 'react';

import {Box} from '@mui/material';

import {getNoteBackgroundColor, getNoteBorderColor} from '../../utils/noteColors';

interface ColorItemProps {
  color: string;
  isSelected: boolean;
  onClick: (color: string) => void;
}

const ColorItem: FC<ColorItemProps> = ({color, isSelected, onClick}: ColorItemProps) => {
  return (
    <Box
      onClick={() => onClick(color)}
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: color ? getNoteBackgroundColor(color) : 'transparent',
        border: '1px solid',
        borderColor: color ? getNoteBorderColor(color) : '#8e8e93',
        cursor: 'pointer',
        '&:hover': {scale: '1.1'},
        outline: isSelected ? '2px solid #90caf9' : 'none',
        outlineOffset: 2,
      }}
    />
  );
};

export default memo(ColorItem);
