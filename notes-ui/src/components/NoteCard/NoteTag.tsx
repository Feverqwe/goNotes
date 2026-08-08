import React, {FC, useCallback} from 'react';

import {Chip, Theme} from '@mui/material';

const chipSx = {
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.selected',
  fontSize: '0.7rem',
  height: '20px',
  color: 'text.secondary',
  transition: (theme: Theme) =>
    theme.transitions.create(['background-color', 'color', 'border-color']),
  '&:hover': {
    bgcolor: 'action.hover',
    color: 'primary.main',
    borderColor: 'primary.main',
  },
};

interface NoteTagProps {
  tag: string;
  onClick: (t: string[]) => void;
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
      clickable
    />
  );
};

export default NoteTag;
