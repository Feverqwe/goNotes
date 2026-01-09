import React, {FC, useMemo} from 'react';
import {Box, Button, Link, Typography} from '@mui/material';
import {InsertDriveFile} from '@mui/icons-material';
import {Attachment} from '../../../types';
import {API_BASE} from '../../../constants';

const imageSx = {
  width: '100%',
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider', // Заменено на системный разделитель
  cursor: 'pointer',
};

const videoSx = {
  mt: 1,
  width: '100%',
  borderRadius: 3,
  overflow: 'hidden',
  bgcolor: 'common.black', // Вместо #000
};

const videoStyle = {width: '100%', display: 'block', maxHeight: '500px'};

const audioSx = {
  mt: 1,
  width: '100%',
  bgcolor: 'action.hover', // Вместо #2c2c2e используем системный фон для второстепенных элементов
  borderRadius: 2,
  p: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  border: '1px solid',
  borderColor: 'divider',
};

const audioCaptainSx = {color: 'text.secondary', ml: 1, mb: 0.5}; // Вместо #8e8e93

const audioStyle = {width: '100%', height: '32px'};

const fileSx = {
  justifyContent: 'start',
  textTransform: 'none',
  borderColor: 'divider',
  color: 'text.primary',
  '&:hover': {
    bgcolor: 'action.hover',
    borderColor: 'primary.main',
  },
};

interface NoteAttachmentProps {
  att: Attachment;
}

const NoteAttachment: FC<NoteAttachmentProps> = ({att}) => {
  const filename = useMemo(() => att.file_path.split('_').slice(1).join('_'), [att.file_path]);

  const displayUrl = useMemo(
    () =>
      att.thumbnail_path
        ? `${API_BASE}/files/${att.thumbnail_path}`
        : `${API_BASE}/files/${att.file_path}`,
    [att],
  );

  const originalUrl = `${API_BASE}/files/${att.file_path}`;

  if (att.file_type === 'image') {
    return (
      <Link href={originalUrl} target="_blank">
        <Box component="img" src={displayUrl} sx={imageSx} />
      </Link>
    );
  }

  if (att.file_type === 'video') {
    return (
      <Box sx={videoSx}>
        <video controls preload="metadata" style={videoStyle}>
          <source src={originalUrl} type="video/mp4" />
          <source src={originalUrl} type="video/quicktime" />
          Ваш браузер не поддерживает видео.
        </video>
      </Box>
    );
  }

  if (att.file_type === 'audio') {
    return (
      <Box sx={audioSx}>
        <Typography variant="caption" sx={audioCaptainSx}>
          {filename}
        </Typography>
        <audio controls style={audioStyle} preload="metadata">
          <source src={originalUrl} type="audio/mpeg" />
          <source src={originalUrl} type="audio/mp4" />
          <source src={originalUrl} type="audio/wav" />
          Ваш браузер не поддерживает аудио.
        </audio>
      </Box>
    );
  }

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<InsertDriveFile />}
      href={originalUrl}
      target="_blank"
      sx={fileSx}
    >
      {filename}
    </Button>
  );
};

export default NoteAttachment;
