import React, {FC, useMemo} from 'react';
import {Box, Button, Link, Typography} from '@mui/material';
import {InsertDriveFile} from '@mui/icons-material';
import {Attachment} from '../../../types';
import {API_BASE} from '../../../constants';

const imageSx = {
  width: '100%',
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  cursor: 'pointer',
};

const videoSx = {
  mt: 1,
  width: '100%',
  borderRadius: 3,
  overflow: 'hidden',
  bgcolor: '#000',
};

const videoStyle = {width: '100%', display: 'block', maxHeight: '500px'};

const audioSx = {
  mt: 1,
  width: '100%',
  bgcolor: '#2c2c2e',
  borderRadius: 2,
  p: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
};

const audioCaptainSx = {color: '#8e8e93', ml: 1, mb: 0.5};

const audioStyle = {width: '100%', height: '32px'};

const fileSx = {justifyContent: 'start', textTransform: 'none'};

interface NoteAttachmentProps {
  att: Attachment;
}

const NoteAttachment: FC<NoteAttachmentProps> = ({att}) => {
  const filename = useMemo(() => att.file_path.split('_').slice(1).join('_'), [att.file_path]);
  const displayUrl = useMemo(
    () => (att.thumbnail_path
        ? `${API_BASE}/files/${att.thumbnail_path}`
        : `${API_BASE}/files/${att.file_path}`),
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
