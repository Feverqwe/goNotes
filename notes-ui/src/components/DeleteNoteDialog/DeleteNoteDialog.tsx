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
    mutationFn: ({id, immediately}: DeleteNoteRequest & {immediately: boolean}) =>
      immediately ? api.notes.deletePermanently({ids: [id]}) : api.notes.delete({id}),
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

  const confirmDelete = useCallback(
    (immediately: boolean) => {
      const noteId = noteIdRef.current;
      if (!noteId) return;
      deleteMutation.mutate({id: noteId, immediately});
    },
    [deleteMutation, noteIdRef],
  );

  return (
    <DeleteConfirmationDialog
      open={open}
      title={permanent ? 'Удалить заметку навсегда?' : 'Удалить заметку?'}
      description={
        permanent ? (
          <>
            Это действие нельзя отменить. <br />
            Все вложения будут стерты.
          </>
        ) : (
          'Из корзины заметку можно восстановить. При удалении навсегда заметка и все вложения будут стерты без возможности восстановления.'
        )
      }
      confirmLabel={permanent ? 'Удалить навсегда' : 'В корзину'}
      loading={deleteMutation.isPending}
      onConfirm={() => confirmDelete(permanent)}
      onConfirmPermanently={permanent ? undefined : () => confirmDelete(true)}
      onClose={onClose}
    />
  );
};

export default DeleteNoteDialog;
