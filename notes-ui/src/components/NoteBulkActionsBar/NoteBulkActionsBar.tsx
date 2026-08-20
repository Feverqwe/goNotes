import React, {FC, useCallback, useContext, useEffect, useMemo, useState} from 'react';

import {
  Archive,
  Close,
  Delete,
  LocalOfferOutlined,
  RestoreFromTrash,
  Unarchive,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {DESKTOP_NOTE_CARD_WIDTH} from '../../constants';
import {SnackCtx} from '../../ctx/SnackCtx';
import {useTags} from '../../hooks/useTags';
import {api} from '../../tools/api';
import TagSelectionDialog from '../TagSelectionDialog/TagSelectionDialog';

const containerSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  maxWidth: {md: DESKTOP_NOTE_CARD_WIDTH},
  px: 1,
};

const infoBoxSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
};

const countTextSx = {
  color: 'text.primary',
  ml: 0.5,
};

const btnSx = {
  borderRadius: '6px',
  textTransform: 'none',
  minWidth: {xs: 40, sm: 64},
  px: {xs: 1, sm: 1.5},
  '& .MuiButton-startIcon': {
    ml: {xs: 0, sm: -0.5},
    mr: {xs: 0, sm: 1},
  },
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

const btnCtrSx = {display: 'flex', gap: {xs: 0, sm: 1}};
const btnLabelSx = {display: {xs: 'none', sm: 'inline'}};

interface NoteBulkActionsBarProps {
  onCancel: () => void;
  selectedIds: number[];
  onRequestDelete: () => void;
  showArchived: boolean;
  showTrash: boolean;
}

const NoteBulkActionsBar: FC<NoteBulkActionsBarProps> = ({
  onCancel,
  selectedIds,
  onRequestDelete,
  showArchived,
  showTrash,
}) => {
  const theme = useTheme();
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const {data: allTags = []} = useTags();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const isActionDisabled = selectedIds.length === 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !tagDialogOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, tagDialogOpen]);

  const batchArchiveMutation = useMutation({
    mutationFn: (archive: number) => api.notes.batchArchive({ids: selectedIds, archive}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      onCancel();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка действия', 'error');
    },
  });

  const batchRestoreMutation = useMutation({
    mutationFn: () => api.notes.batchRestore({ids: selectedIds}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      onCancel();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка восстановления', 'error');
    },
  });

  const batchTagsMutation = useMutation({
    mutationFn: (tags: string[]) => api.notes.batchTags({ids: selectedIds, tags}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      setTagDialogOpen(false);
      onCancel();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при добавлении тегов', 'error');
    },
  });

  const handleArchive = useCallback(() => {
    if (showTrash) {
      batchRestoreMutation.mutate();
    } else {
      batchArchiveMutation.mutate(showArchived ? 0 : 1);
    }
  }, [batchArchiveMutation, batchRestoreMutation, showArchived, showTrash]);

  const handleDelete = useCallback(() => {
    onRequestDelete();
  }, [onRequestDelete]);

  const paperSx = useMemo(
    () => ({
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      bgcolor: alpha(theme.palette.background.paper, 0.85),
      backdropFilter: 'blur(20px) saturate(180%)',
      backgroundImage: 'none',
      borderTop: '1px solid',
      borderColor: alpha(theme.palette.primary.main, 0.3),
      zIndex: 1200,
      animation: 'slideUp 0.2s ease-out',
    }),
    [theme.palette.background.paper, theme.palette.primary.main],
  );

  return (
    <Paper square elevation={0} sx={paperSx}>
      <Container maxWidth="sm" sx={containerSx}>
        <Box sx={infoBoxSx}>
          <IconButton onClick={onCancel} size="medium" sx={{color: 'text.secondary'}}>
            <Close />
          </IconButton>
          <Typography variant="body2" sx={countTextSx}>
            Выбрано: {selectedIds.length}
          </Typography>
        </Box>
        <Box sx={btnCtrSx}>
          <Button
            size="medium"
            variant="text"
            disabled={isActionDisabled || allTags.length === 0}
            startIcon={<LocalOfferOutlined />}
            onClick={() => setTagDialogOpen(true)}
            sx={{...btnSx, color: 'primary.main'}}
            aria-label="Добавить теги"
          >
            <Box component="span" sx={btnLabelSx}>
              Теги
            </Box>
          </Button>
          <Button
            size="medium"
            variant="text"
            disabled={isActionDisabled}
            startIcon={
              showTrash ? <RestoreFromTrash /> : showArchived ? <Unarchive /> : <Archive />
            }
            onClick={handleArchive}
            sx={{...btnSx, color: 'primary.main'}}
            aria-label={showTrash ? 'Восстановить' : showArchived ? 'Разархивировать' : 'В архив'}
          >
            <Box component="span" sx={btnLabelSx}>
              {showTrash ? 'Восстановить' : showArchived ? 'Разархивировать' : 'В архив'}
            </Box>
          </Button>
          <Button
            size="medium"
            variant="text"
            color="error"
            disabled={isActionDisabled}
            startIcon={<Delete />}
            sx={btnSx}
            onClick={handleDelete}
            aria-label={showTrash ? 'Удалить навсегда' : 'В корзину'}
          >
            <Box component="span" sx={btnLabelSx}>
              {showTrash ? 'Удалить навсегда' : 'В корзину'}
            </Box>
          </Button>
        </Box>
      </Container>
      <TagSelectionDialog
        open={tagDialogOpen}
        title="Добавить теги"
        description={`Выберите теги, которые нужно добавить к заметкам (${selectedIds.length}):`}
        tags={allTags}
        loading={batchTagsMutation.isPending}
        submitLabel="Добавить теги"
        onClose={() => setTagDialogOpen(false)}
        onSubmit={(tags) => batchTagsMutation.mutate(tags)}
      />
    </Paper>
  );
};

export default NoteBulkActionsBar;
