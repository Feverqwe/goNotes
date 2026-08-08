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
    mutationFn: (params: BatchDeleteRequest) => api.notes.batchDelete(params),
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

  const confirmDelete = useCallback(() => {
    batchDeleteMutation.mutate({ids: selectedIds});
  }, [batchDeleteMutation, selectedIds]);

  return (
    <DeleteConfirmationDialog
      open={open}
      title={permanent ? 'Удалить выбранные заметки навсегда?' : 'Переместить заметки в корзину?'}
      description={
        permanent ? (
          <>
            Это действие нельзя отменить. <br />
            Все вложения будут стерты.
          </>
        ) : (
          'Заметки можно будет восстановить из корзины.'
        )
      }
      confirmLabel={permanent ? 'Удалить навсегда' : 'В корзину'}
      loading={batchDeleteMutation.isPending}
      onConfirm={confirmDelete}
      onClose={onClose}
    />
  );
};

export default DeleteNotesDialog;
