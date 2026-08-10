import React, {FC, useMemo} from 'react';

import {Download, InsertDriveFile} from '@mui/icons-material';
import {Box, Button, Typography} from '@mui/material';

import {API_BASE} from '../../constants';
import {Attachment} from '../../types';

const audioSx = {
  mt: 1,
  width: '100%',
  bgcolor: 'action.hover',
  borderRadius: 2,
  p: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  border: '1px solid',
  borderColor: 'divider',
};

const audioCaptainSx = {color: 'text.secondary', ml: 1, mb: 0.5};

const audioStyle = {width: '100%', height: '32px'};

const fileSx = {
  width: '100%',
  minWidth: 0,
  justifyContent: 'flex-start',
  textTransform: 'none',
  borderColor: 'divider',
  color: 'text.primary',
  '& .MuiButton-endIcon': {ml: 'auto'},
  '&:hover': {
    bgcolor: 'action.hover',
    borderColor: 'divider',
  },
};

const fileNameSx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

interface NoteAttachmentProps {
  att: Attachment;
}

const NoteAttachment: FC<NoteAttachmentProps> = ({att}) => {
  const filename = useMemo(() => att.file_path.split('_').slice(1).join('_'), [att.file_path]);

  const originalUrl = `${API_BASE}/files/${att.file_path}`;

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
      endIcon={<Download />}
      href={originalUrl}
      download={filename}
      title={filename}
      aria-label={`Скачать файл ${filename}`}
      sx={fileSx}
    >
      <Typography component="span" variant="body2" sx={fileNameSx}>
        {filename}
      </Typography>
    </Button>
  );
};

export default NoteAttachment;
