import React, {FC, ReactNode, useEffect, useMemo, useState} from 'react';

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

interface TagSelectionDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  tags: string[];
  initialSelectedTags?: string[];
  loading: boolean;
  requireChanges?: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (tags: string[]) => void;
}

const normalizeTags = (tags: string[]) => new Set(tags.map((tag) => tag.toLowerCase()));
const EMPTY_TAGS: string[] = [];

const TagSelectionDialog: FC<TagSelectionDialogProps> = ({
  open,
  title,
  description,
  tags,
  initialSelectedTags = EMPTY_TAGS,
  loading,
  requireChanges = false,
  submitLabel,
  onClose,
  onSubmit,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSelectedTags(initialSelectedTags);
  }, [initialSelectedTags, open]);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Map([...tags, ...initialSelectedTags].map((tag) => [tag.toLowerCase(), tag])).values(),
      ),
    [initialSelectedTags, tags],
  );
  const selectedTagNames = useMemo(() => normalizeTags(selectedTags), [selectedTags]);
  const initialTagNames = useMemo(() => normalizeTags(initialSelectedTags), [initialSelectedTags]);
  const hasChanges =
    selectedTagNames.size !== initialTagNames.size ||
    [...selectedTagNames].some((tag) => !initialTagNames.has(tag));
  const submitDisabled = requireChanges ? !hasChanges : selectedTags.length === 0;

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
            {title}
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
        <Typography sx={descriptionSx}>{description}</Typography>
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
          disabled={submitDisabled}
          aria-label={submitLabel}
          sx={actionButtonSx}
        >
          <Check />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};

export default TagSelectionDialog;
