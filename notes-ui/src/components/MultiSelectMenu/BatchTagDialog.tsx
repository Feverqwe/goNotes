import React, {FC, useEffect, useMemo, useState} from 'react';

import {Check, Close, LocalOfferOutlined} from '@mui/icons-material';
import {
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Theme,
  Typography,
} from '@mui/material';

const dialogTitleSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  py: 1.5,
};
const titleBoxSx = {display: 'flex', alignItems: 'center', gap: 1};
const titleIconSx = {color: 'primary.main', fontSize: 21};
const titleSx = {fontSize: '1.05rem'};
const actionButtonSx = {
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};
const dialogContentSx = {pt: 1, pb: 2};
const descriptionSx = {mb: 1.5, color: 'text.secondary', lineHeight: 1.5};
const tagListSx = {maxHeight: 320, overflowY: 'auto', mx: -1};
const tagLabelSx = {
  m: 0,
  px: 1,
  borderRadius: 1,
  '&:hover': {bgcolor: 'action.hover'},
  '& .MuiFormControlLabel-label': {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
const dialogActionsSx = {px: 3, pt: 0, pb: 2};

interface BatchTagDialogProps {
  open: boolean;
  tags: string[];
  selectedCount: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (tags: string[]) => void;
}

const BatchTagDialog: FC<BatchTagDialogProps> = ({
  open,
  tags,
  selectedCount,
  loading,
  onClose,
  onSubmit,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSelectedTags([]);
  }, [open]);

  const selectedTagNames = useMemo(
    () => new Set(selectedTags.map((tag) => tag.toLowerCase())),
    [selectedTags],
  );

  const handleToggle = (tag: string) => {
    const normalizedTag = tag.toLowerCase();
    setSelectedTags((currentTags) =>
      currentTags.some((item) => item.toLowerCase() === normalizedTag)
        ? currentTags.filter((item) => item.toLowerCase() !== normalizedTag)
        : [...currentTags, tag],
    );
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={dialogTitleSx}>
        <Box sx={titleBoxSx}>
          <LocalOfferOutlined sx={titleIconSx} />
          <Typography variant="h6" sx={titleSx}>
            Добавить теги
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          disabled={loading}
          aria-label="Закрыть"
          sx={actionButtonSx}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={dialogContentSx}>
        <Typography sx={descriptionSx}>
          Выберите теги, которые нужно добавить к заметкам ({selectedCount}):
        </Typography>
        {tags.length > 0 ? (
          <FormGroup sx={tagListSx}>
            {tags.map((tag) => (
              <FormControlLabel
                key={tag.toLowerCase()}
                control={
                  <Checkbox
                    checked={selectedTagNames.has(tag.toLowerCase())}
                    onChange={() => handleToggle(tag)}
                    disabled={loading}
                    size="small"
                  />
                }
                label={`#${tag}`}
                sx={tagLabelSx}
              />
            ))}
          </FormGroup>
        ) : (
          <Typography color="text.secondary">Пока нет доступных тегов</Typography>
        )}
      </DialogContent>
      <DialogActions sx={dialogActionsSx}>
        <IconButton
          onClick={() => onSubmit(selectedTags)}
          color="primary"
          loading={loading}
          disabled={selectedTags.length === 0}
          aria-label="Добавить теги"
          sx={actionButtonSx}
        >
          <Check />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};

export default BatchTagDialog;
