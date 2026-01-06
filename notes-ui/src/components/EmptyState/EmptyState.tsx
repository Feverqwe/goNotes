import React, {FC} from 'react';
import {Box, Typography} from '@mui/material';
import {NoteAdd} from '@mui/icons-material';

const containerSx = {
  textAlign: 'center',
  mt: 8,
  p: 3,
  bgcolor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 4,
  border: '1px dashed rgba(255, 255, 255, 0.1)',
};

const iconSx = {
  fontSize: 64,
  color: '#8e8e93',
  mb: 2,
};

const titleSx = {
  color: '#fff',
  mb: 1,
};

const descriptionSx = {
  color: '#8e8e93',
  mb: 3,
};

interface EmptyStateProps {
  hasFilters: boolean;
}

const EmptyState: FC<EmptyStateProps> = ({hasFilters}) => {
  return (
    <Box sx={containerSx}>
      <NoteAdd sx={iconSx} />

      {hasFilters ? (
        <>
          <Typography variant="h6" sx={titleSx}>
            Заметки не найдены
          </Typography>
          <Typography variant="body2" sx={descriptionSx}>
            Попробуйте изменить параметры поиска или сбросить фильтры.
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="h6" sx={titleSx}>
            У вас пока нет заметок
          </Typography>
          <Typography variant="body2" sx={descriptionSx}>
            Начните вести записи, чтобы упорядочить свои мысли и идеи.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default EmptyState;
