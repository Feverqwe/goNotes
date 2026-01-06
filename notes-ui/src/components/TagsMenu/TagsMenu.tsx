import {Menu} from '@mui/material';
import React, {FC} from 'react';
import TagsManager from '../TagsManager/TagsManager';

const menuSlotProps = {
  paper: {
    sx: {
      bgcolor: 'rgba(24, 24, 26, 0.85)',
      backdropFilter: 'blur(15px) saturate(140%)',
      minWidth: 240,
      maxHeight: 450,
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      mt: 0.5,
      backgroundImage: 'none',
    },
  },
};

interface TagsMenuProps {
  tagMenuAnchor: HTMLButtonElement | null;
  handleCloseTagMenu: () => void;
  currentTags: string[];
  setCurrentTags: React.Dispatch<React.SetStateAction<string[]>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
}

const TagsMenu: FC<TagsMenuProps> = (props) => {
  const {tagMenuAnchor, handleCloseTagMenu} = props;
  return (
    <Menu
      anchorEl={tagMenuAnchor}
      open={Boolean(tagMenuAnchor)}
      onClose={handleCloseTagMenu}
      slotProps={menuSlotProps}
    >
      <TagsManager {...props} onActionFinished={handleCloseTagMenu} />
    </Menu>
  );
};

export default TagsMenu;
