import {FC, useCallback} from 'react';
import {Chip} from '@mui/material';
import React from 'react';

const chipSx = {border: 'none', bgcolor: '#2c2c2e', fontSize: '0.7rem', height: '20px'};

interface NoteTagProps {
  tag: string;
  onClick: (t: string[]) => void
}

const NoteTag: FC<NoteTagProps> = ({tag, onClick}) => {
  const handleClick = useCallback(() => {
    onClick([tag]);
  }, [onClick, tag]);

  return (
    <Chip
      key={tag}
      label={`#${tag}`}
      size="small"
      variant="outlined"
      onClick={handleClick}
      sx={chipSx}
    />
  );
};

export default NoteTag;
