import React, {FC, useCallback, useContext} from 'react';

import {useMutation, useQueryClient} from '@tanstack/react-query';

import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {DeleteNoteRequest} from '../../tools/types';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog/DeleteConfirmationDialog';

interface DeleteNoteDialogProps {
  open: boolean;
  onClose: () => void;
  noteIdRef: React.RefObject<number | null>;
  permanent: boolean;
}

const DeleteNoteDialog: FC<DeleteNoteDialogProps> = ({open, onClose, noteIdRef, permanent}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (params: DeleteNoteRequest) => api.notes.delete(params),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      onClose();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при удалении', 'error');
      onClose();
    },
  });

  const confirmDelete = useCallback(() => {
    const noteId = noteIdRef.current;
    if (!noteId) return;
    deleteMutation.mutate({id: noteId});
  }, [deleteMutation, noteIdRef]);

  return (
    <DeleteConfirmationDialog
      open={open}
      title={permanent ? 'Удалить заметку навсегда?' : 'Переместить заметку в корзину?'}
      description={
        permanent ? (
          <>
            Это действие нельзя отменить. <br />
            Все вложения будут стерты.
          </>
        ) : (
          'Заметку можно будет восстановить из корзины.'
        )
      }
      confirmLabel={permanent ? 'Удалить навсегда' : 'В корзину'}
      loading={deleteMutation.isPending}
      onConfirm={confirmDelete}
      onClose={onClose}
    />
  );
};

export default DeleteNoteDialog;
