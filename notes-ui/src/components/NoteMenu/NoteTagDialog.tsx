import React, {FC, FormEvent, useEffect, useMemo, useState} from 'react';
import {
  Autocomplete,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Theme,
  Typography,
} from '@mui/material';
import {Check, Close, DeleteOutline, LocalOfferOutlined} from '@mui/icons-material';
import {Note} from '../../types';

const INVALID_TAG_PATTERN = new RegExp(String.raw`[\s$!@#%^&*()=+\[\]{}|\\;:'",.<>?/\x60]`, 'u');

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
const dialogContentSx = {pt: 1, pb: 2.5};
const descriptionSx = {mb: 1.5, color: 'text.secondary', lineHeight: 1.5};
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
  onSubmit: (tag: string) => void;
}

const NoteTagDialog: FC<NoteTagDialogProps> = ({note, tags, loading, onClose, onSubmit}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => setInputValue(''), [note?.id]);

  const normalizedTag = inputValue.trim().replace(/^#+/, '').toLowerCase();
  const isInvalid = normalizedTag.length === 0 || INVALID_TAG_PATTERN.test(normalizedTag);
  const hasTag = useMemo(
    () => note?.tags?.some((tag) => tag.toLowerCase() === normalizedTag) ?? false,
    [normalizedTag, note?.tags],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isInvalid && !loading) onSubmit(normalizedTag);
  };

  return (
    <Dialog open={Boolean(note)} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={dialogTitleSx}>
        <Box sx={titleBoxSx}>
          <LocalOfferOutlined sx={titleIconSx} />
          <Typography variant="h6" sx={titleSx}>
            Изменить тег
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
        <Box sx={{pb: 2}}>Введите новый тег или выберите существующий:</Box>
        <Box component="form" id="note-tag-form" onSubmit={handleSubmit}>
          <Autocomplete
            freeSolo
            options={tags}
            inputValue={inputValue}
            onInputChange={(_, value) => setInputValue(value.replace(/^#+/, ''))}
            disabled={loading}
            noOptionsText="Новый тег будет создан"
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                size="small"
                label="Тег"
                error={Boolean(normalizedTag) && isInvalid}
                slotProps={{inputLabel: {shrink: true}}}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={dialogActionsSx}>
        <IconButton
          type="submit"
          form="note-tag-form"
          color={hasTag ? 'error' : 'primary'}
          loading={loading}
          disabled={isInvalid}
          aria-label={hasTag ? 'Удалить тег' : 'Добавить тег'}
          sx={submitButtonSx}
        >
          {hasTag ? <DeleteOutline /> : <Check />}
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};

export default NoteTagDialog;
