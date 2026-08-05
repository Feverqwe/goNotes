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

import {Note} from '../../types';

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
const tagListSx = {
  maxHeight: 320,
  overflowY: 'auto',
  mx: -1,
};
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
const submitButtonSx = {
  ...actionButtonSx,
  width: 40,
  height: 40,
  flexShrink: 0,
};

interface NoteTagDialogProps {
  note: Note | null;
  tags: string[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (tags: string[]) => void;
}

const NoteTagDialog: FC<NoteTagDialogProps> = ({note, tags, loading, onClose, onSubmit}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => setSelectedTags(note?.tags ?? []), [note]);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Map([...tags, ...(note?.tags ?? [])].map((tag) => [tag.toLowerCase(), tag])).values(),
      ),
    [note?.tags, tags],
  );
  const selectedTagNames = useMemo(
    () => new Set(selectedTags.map((tag) => tag.toLowerCase())),
    [selectedTags],
  );
  const initialTagNames = useMemo(
    () => new Set((note?.tags ?? []).map((tag) => tag.toLowerCase())),
    [note?.tags],
  );
  const hasChanges =
    selectedTagNames.size !== initialTagNames.size ||
    [...selectedTagNames].some((tag) => !initialTagNames.has(tag));

  const handleToggle = (tag: string) => {
    const normalizedTag = tag.toLowerCase();
    setSelectedTags((currentTags) =>
      currentTags.some((item) => item.toLowerCase() === normalizedTag)
        ? currentTags.filter((item) => item.toLowerCase() !== normalizedTag)
        : [...currentTags, tag],
    );
  };

  return (
    <Dialog open={Boolean(note)} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={dialogTitleSx}>
        <Box sx={titleBoxSx}>
          <LocalOfferOutlined sx={titleIconSx} />
          <Typography variant="h6" sx={titleSx}>
            Изменить теги
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
        <Typography sx={descriptionSx}>Выберите теги для заметки:</Typography>
        {availableTags.length > 0 ? (
          <FormGroup sx={tagListSx}>
            {availableTags.map((tag) => (
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
          disabled={!hasChanges}
          aria-label="Сохранить теги"
          sx={submitButtonSx}
        >
          <Check />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};

export default NoteTagDialog;
