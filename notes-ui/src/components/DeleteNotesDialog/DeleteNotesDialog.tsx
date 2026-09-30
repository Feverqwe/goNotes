import React, {FC, useCallback, useContext} from 'react';

import {useMutation, useQueryClient} from '@tanstack/react-query';

import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {BatchDeleteRequest} from '../../tools/types';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog/DeleteConfirmationDialog';

interface DeleteNotesDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  cancelSelectMode: () => void;
  permanent: boolean;
}

const DeleteNotesDialog: FC<DeleteNotesDialogProps> = ({
  open,
  onClose,
  selectedIds,
  cancelSelectMode,
  permanent,
}) => {
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();

  const batchDeleteMutation = useMutation({
    mutationFn: ({ids, immediately}: BatchDeleteRequest & {immediately: boolean}) =>
      immediately ? api.notes.deletePermanently({ids}) : api.notes.batchDelete({ids}),
    onSuccess: (_, {ids}) => {
      queryClient.invalidateQueries({queryKey: ['notes']});
      queryClient.invalidateQueries({queryKey: ['tags']});
      cancelSelectMode();
      onClose();
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при массовом удалении', 'error');
    },
  });

  const confirmDelete = useCallback(
    (immediately: boolean) => {
      batchDeleteMutation.mutate({ids: selectedIds, immediately});
    },
    [batchDeleteMutation, selectedIds],
  );

  return (
    <DeleteConfirmationDialog
      open={open}
      title={permanent ? 'Удалить выбранные заметки навсегда?' : 'Удалить выбранные заметки?'}
      description={
        permanent ? (
          <>
            Это действие нельзя отменить. <br />
            Все вложения будут стерты.
          </>
        ) : (
          'Из корзины заметки можно восстановить. При удалении навсегда заметки и все вложения будут стерты без возможности восстановления.'
        )
      }
      confirmLabel={permanent ? 'Удалить навсегда' : 'В корзину'}
      loading={batchDeleteMutation.isPending}
      onConfirm={() => confirmDelete(permanent)}
      onConfirmPermanently={permanent ? undefined : () => confirmDelete(true)}
      onClose={onClose}
    />
  );
};

export default DeleteNotesDialog;
