import React, {FC, useMemo} from 'react';

import {PlayArrow} from '@mui/icons-material';
import {Box, Theme, Typography} from '@mui/material';

import {API_BASE} from '../../constants';
import {Attachment} from '../../types';

const MAX_VISIBLE_MEDIA = 4;

const containerSx = {
  display: 'grid',
  gap: '2px',
  overflow: 'hidden',
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'divider',
};

const previewButtonSx = {
  position: 'relative',
  minWidth: 0,
  minHeight: 0,
  p: 0,
  border: 0,
  overflow: 'hidden',
  bgcolor: (theme: Theme) =>
    theme.palette.mode === 'dark' ? theme.palette.common.black : theme.palette.action.hover,
  cursor: 'pointer',
  '&:hover .media-preview-content': {transform: 'scale(1.03)'},
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: -2,
    zIndex: 1,
  },
} as const;

const previewContentSx = {
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'cover',
  transition: 'transform 0.2s ease',
};

const videoPreviewSx = {...previewContentSx, bgcolor: 'common.black'};

const playIconSx = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: 'common.white',
  fontSize: 48,
  filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.8))',
};

const remainingCountSx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'common.white',
  bgcolor: 'rgba(0, 0, 0, 0.58)',
  fontSize: {xs: '1.5rem', sm: '2rem'},
  fontWeight: 600,
};

interface MediaPreviewProps {
  media: Attachment[];
  onOpen: (attachmentId: number) => void;
}

const MediaPreview: FC<MediaPreviewProps> = ({media, onOpen}) => {
  const visibleMedia = useMemo(() => media.slice(0, MAX_VISIBLE_MEDIA), [media]);
  const visibleCount = visibleMedia.length;
  const remainingCount = media.length - visibleCount;
  const gridSx = {
    ...containerSx,
    gridTemplateColumns: visibleCount === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: visibleCount < 3 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
    height:
      visibleCount === 1
        ? {xs: 220, sm: 320}
        : visibleCount === 2
          ? {xs: 180, sm: 240}
          : {xs: 280, sm: 360},
  };

  return (
    <Box sx={gridSx}>
      {visibleMedia.map((attachment, index) => {
        const filename = attachment.file_path.split('_').slice(1).join('_');
        const originalUrl = `${API_BASE}/files/${attachment.file_path}`;
        const previewUrl = attachment.thumbnail_path
          ? `${API_BASE}/files/${attachment.thumbnail_path}`
          : originalUrl;
        const isVideo = attachment.file_type === 'video';
        const showsRemainingCount = remainingCount > 0 && index === visibleCount - 1;

        return (
          <Box
            key={attachment.id}
            component="button"
            type="button"
            onClick={() => onOpen(attachment.id)}
            aria-label={`Открыть ${isVideo ? 'видео' : 'изображение'} ${filename} в spotlight`}
            sx={{
              ...previewButtonSx,
              gridColumn: visibleCount === 3 && index === 2 ? '1 / -1' : undefined,
            }}
          >
            {isVideo ? (
              <Box
                component="video"
                src={originalUrl}
                muted
                playsInline
                preload="metadata"
                className="media-preview-content"
                sx={videoPreviewSx}
              />
            ) : (
              <Box
                component="img"
                src={previewUrl}
                alt=""
                loading="lazy"
                className="media-preview-content"
                sx={previewContentSx}
              />
            )}
            {isVideo && !showsRemainingCount && <PlayArrow sx={playIconSx} />}
            {showsRemainingCount && (
              <Typography component="span" sx={remainingCountSx}>
                +{remainingCount}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default MediaPreview;
