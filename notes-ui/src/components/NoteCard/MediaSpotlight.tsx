import React, {FC, useCallback, useEffect, useRef, useState} from 'react';

import {
  ArrowBackIosNew,
  ArrowForwardIos,
  Close,
  Fullscreen,
  FullscreenExit,
  OpenInNew,
} from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';

import {API_BASE} from '../../constants';
import {Attachment} from '../../types';

const getSpotlightBackground = (theme: Theme) =>
  theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(32, 36, 42, 0.76)';

const getFullscreenBackground = (theme: Theme) =>
  theme.palette.mode === 'dark' ? '#090909' : '#4a4f56';

const spotlightContentSx = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  p: 2,
  overflow: 'hidden',
  bgcolor: getSpotlightBackground,
  '&:fullscreen': {bgcolor: getFullscreenBackground},
};

const spotlightMediaSx = {
  display: 'block',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  borderRadius: 1,
  boxShadow: 8,
  outline: 'none',
};

const actionsSx = {
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  gap: 0.5,
};

const actionSx = {
  color: 'rgba(255, 255, 255, 0.64)',
  bgcolor: 'transparent',
  backdropFilter: 'blur(4px)',
  transition: 'color 0.2s ease, background-color 0.2s ease',
  '&:hover': {
    color: 'common.white',
    bgcolor: 'rgba(0, 0, 0, 0.36)',
  },
  '&:focus-visible': {
    color: 'common.white',
    bgcolor: 'rgba(0, 0, 0, 0.36)',
    outline: '2px solid',
    outlineColor: 'primary.main',
  },
};

const navigationSx = {
  ...actionSx,
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
};

const counterSx = {
  position: 'absolute',
  top: 8,
  left: 8,
  px: 1.5,
  py: 0.5,
  borderRadius: 4,
  color: 'rgba(255, 255, 255, 0.64)',
  bgcolor: 'rgba(0, 0, 0, 0.16)',
  backdropFilter: 'blur(4px)',
};

interface MediaSpotlightProps {
  media: Attachment | null;
  currentIndex: number;
  mediaCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const MediaSpotlight: FC<MediaSpotlightProps> = ({
  media,
  currentIndex,
  mediaCount,
  onClose,
  onPrevious,
  onNext,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const isFinePointer = useMediaQuery('(pointer: fine)');
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current === null) return;
    window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  }, []);

  const showControls = useCallback(() => {
    clearControlsTimer();
    setAreControlsVisible(true);
    if (!isFinePointer) return;
    controlsTimerRef.current = window.setTimeout(() => setAreControlsVisible(false), 2500);
  }, [clearControlsTimer, isFinePointer]);

  useEffect(() => {
    if (media) showControls();
    return clearControlsTimer;
  }, [clearControlsTimer, media, showControls]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(document.fullscreenElement === contentRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const stopPropagation = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const fullscreenChange = document.fullscreenElement
      ? document.exitFullscreen()
      : contentRef.current?.requestFullscreen?.();

    fullscreenChange?.catch((error) => {
      console.error('Не удалось переключить полноэкранный режим', error);
    });
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.error('Не удалось выйти из полноэкранного режима', error);
      });
    }
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      showControls();
      if (
        (event.code === 'KeyF' || event.key.toLowerCase() === 'f') &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.repeat
      ) {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    },
    [onNext, onPrevious, showControls, toggleFullscreen],
  );

  if (!media) return null;

  const filename = media.file_path.split('_').slice(1).join('_');
  const originalUrl = `${API_BASE}/files/${media.file_path}`;
  const hasMultipleMedia = mediaCount > 1;
  const controlsVisibilitySx = {
    opacity: areControlsVisible ? 1 : 0,
    pointerEvents: areControlsVisible ? 'auto' : 'none',
    transition: 'opacity 0.2s ease, color 0.2s ease, background-color 0.2s ease',
  };

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      onClick={stopPropagation}
      onKeyDown={handleKeyDown}
      aria-label={`Просмотр медиафайла ${filename}`}
      maxWidth={false}
      fullScreen
      slotProps={{
        backdrop: {sx: {bgcolor: 'transparent'}},
        paper: {
          sx: {
            m: 0,
            maxWidth: 'none',
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogContent
        ref={contentRef}
        onClick={handleContentClick}
        onMouseMove={showControls}
        sx={{
          ...spotlightContentSx,
          cursor: areControlsVisible || !isFinePointer ? 'default' : 'none',
        }}
      >
        {media.file_type === 'video' ? (
          <Box
            key={media.id}
            component="video"
            src={originalUrl}
            controls
            preload="metadata"
            sx={spotlightMediaSx}
          >
            Ваш браузер не поддерживает видео.
          </Box>
        ) : (
          <Box
            key={media.id}
            component="img"
            src={originalUrl}
            alt={filename}
            sx={spotlightMediaSx}
          />
        )}
        <Box sx={{...actionsSx, ...controlsVisibilitySx}}>
          <Tooltip title="Открыть оригинал" arrow>
            <IconButton
              component="a"
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopPropagation}
              aria-label="Открыть оригинал в новой вкладке"
              sx={actionSx}
            >
              <OpenInNew />
            </IconButton>
          </Tooltip>
          {document.fullscreenEnabled && (
            <Tooltip
              title={isBrowserFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
              arrow
            >
              <IconButton
                onClick={toggleFullscreen}
                aria-label={
                  isBrowserFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'
                }
                sx={actionSx}
              >
                {isBrowserFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Закрыть" arrow>
            <IconButton
              onClick={handleClose}
              aria-label="Закрыть просмотр медиафайла"
              sx={actionSx}
            >
              <Close />
            </IconButton>
          </Tooltip>
        </Box>
        {hasMultipleMedia && (
          <>
            <IconButton
              onClick={onPrevious}
              aria-label="Предыдущий медиафайл"
              sx={{
                ...navigationSx,
                ...controlsVisibilitySx,
                left: {xs: 8, sm: 24},
              }}
            >
              <ArrowBackIosNew />
            </IconButton>
            <IconButton
              onClick={onNext}
              aria-label="Следующий медиафайл"
              sx={{
                ...navigationSx,
                ...controlsVisibilitySx,
                right: {xs: 8, sm: 24},
              }}
            >
              <ArrowForwardIos />
            </IconButton>
            <Typography variant="body2" sx={{...counterSx, ...controlsVisibilitySx}}>
              {currentIndex + 1} / {mediaCount}
            </Typography>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MediaSpotlight;
