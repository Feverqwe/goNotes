import React, {FC} from 'react';
import {Box, Typography} from '@mui/material';
import {NoteAdd} from '@mui/icons-material';

const containerSx = {
  textAlign: 'center',
  mt: 8,
  p: 3,
  // Используем системный цвет для едва заметного фона
  bgcolor: 'action.hover',
  borderRadius: 4,
  // Используем системный divider для пунктирной границы
  border: '1px dashed',
  borderColor: 'divider',
};

const iconSx = {
  fontSize: 64,
  // Вместо #8e8e93
  color: 'text.disabled',
  mb: 2,
};

const titleSx = {
  // Вместо #fff
  color: 'text.primary',
  mb: 1,
};

const descriptionSx = {
  // Вместо #8e8e93
  color: 'text.secondary',
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
