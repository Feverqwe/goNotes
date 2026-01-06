import React, {FC, useCallback, useMemo} from 'react';

import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {
  ArrowDownward,
  ArrowUpward,
  DragHandle,
  InsertDriveFile,
  MoreVert,
} from '@mui/icons-material';

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Note} from '../../types';
import {API_BASE} from '../../constants';
import {formatFullDate, formatShortDate} from './utils';
import CodeP from './CodeP';
import CodeUl from './CodeUl';
import CodeLi from './CodeLi';
import CodeCode from './CodeCode';

interface MessageItemProps {
  msg: Note;
  onTagClick: React.Dispatch<React.SetStateAction<string[]>>;
  handleOpenMenu: (event: React.MouseEvent, msg: Note) => void;
  isSelectMode: boolean;
  toggleSelect: (id: number) => void;
  selectedIds: number[];
  startEditing: (note: Note) => void;
  isReorderMode: boolean;
  moveStep?: (id: number, direction: 'up' | 'down') => void;
  index: number;
  totalCount: number;
}

const MessageItem: FC<MessageItemProps> = ({
  msg,
  onTagClick,
  handleOpenMenu,
  isSelectMode,
  toggleSelect,
  selectedIds,
  startEditing,
  isReorderMode,
  moveStep,
  index,
  totalCount,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: msg.id,
    disabled: !isReorderMode,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1300 : 'auto',
      opacity: isDragging ? 0.5 : 1,
    }),
    [isDragging, transform, transition],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;

      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у') {
        e.preventDefault();
        startEditing(msg);
      }
    },
    [startEditing, msg],
  );

  return (
    <Box ref={setNodeRef} style={style}>
      <Card
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          if (isSelectMode) {
            e.stopPropagation();
            toggleSelect(msg.id);
          }
        }}
        variant="outlined"
        sx={{
          position: 'relative',
          '&:hover .message-action': {opacity: 1},

          bgcolor: selectedIds.includes(msg.id)
            ? 'rgba(144, 202, 249, 0.05)'
            : msg.is_archived
              ? '#161618'
              : '#1c1c1e',
          boxShadow: selectedIds.includes(msg.id) ? '0 0 3px #90caf9' : 'none',
          backgroundImage: msg.is_archived
            ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 10px)'
            : 'none',
          '&:focus-visible': {
            boxShadow: '0 0 0 2px #90caf9',
            borderColor: '#90caf9',
          },
          border: isReorderMode
            ? '1px dashed #90caf9'
            : msg.is_archived
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : 'none',
        }}
      >
        <CardContent sx={{'&:last-child': {pb: 1.5}, pr: 1.5, pl: 2, pt: 1.5}}>
          {!isSelectMode && isReorderMode && (
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                display: 'flex',
                gap: 0.5,
                zIndex: 10,

                bgcolor: isMobile ? 'rgba(18, 18, 18, 0.6)' : 'transparent',
                borderRadius: '8px',
                p: 0.2,
              }}
            >
              {isMobile ? (
                <>
                  <IconButton
                    size="medium"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep?.(msg.id, 'up');
                    }}
                    sx={{color: '#90caf9'}}
                  >
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="medium"
                    disabled={index === totalCount - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep?.(msg.id, 'down');
                    }}
                    sx={{color: '#90caf9'}}
                  >
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                </>
              ) : (
                <IconButton
                  {...attributes}
                  {...listeners}
                  size="small"
                  sx={{cursor: 'grab', color: '#90caf9', p: 1}}
                >
                  <DragHandle />
                </IconButton>
              )}
            </Box>
          )}
          {!isReorderMode && isSelectMode && (
            <Checkbox
              checked={selectedIds.includes(msg.id)}
              sx={{position: 'absolute', top: 4, right: 4, color: '#8e8e93'}}
            />
          )}
          {!isReorderMode && !isSelectMode && (
            <IconButton
              className="message-action"
              size="medium"
              onClick={(e) => handleOpenMenu(e, msg)}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                opacity: {xs: 1, sm: 0},
                transition: 'opacity 0.2s',
                color: '#8e8e93',
                '&:focus-visible': {
                  opacity: 1,
                  boxShadow: '0 0 0 2px #90caf9',
                  borderColor: '#90caf9',
                },
              }}
            >
              <MoreVert fontSize="inherit" />
            </IconButton>
          )}
          <Box
            sx={{
              color: msg.is_archived ? '#8e8e93' : '#fff',

              '& p': {m: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6},
              '& code': {
                bgcolor: '#2c2c2e',
                px: 0.5,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.9em',
              },
              '& a': {color: '#90caf9'},
              '& ul, & ol': {pl: 2, my: 1},
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // @ts-expect-error cause!
                code: CodeCode,
                p: CodeP,
                ul: CodeUl,
                li: CodeLi,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </Box>
          {msg.attachments && msg.attachments?.length > 0 && (
            <Stack spacing={1} sx={{mt: 1, pr: 0}}>
              {msg.attachments?.map((att) => {
                const displayUrl = att.thumbnail_path
                  ? `${API_BASE}/files/${att.thumbnail_path}`
                  : `${API_BASE}/files/${att.file_path}`;

                const originalUrl = `${API_BASE}/files/${att.file_path}`;

                if (att.file_type === 'image') {
                  return (
                    <Box
                      key={att.id}
                      component="img"
                      src={displayUrl}
                      onClick={(e) => {
                        window.open(originalUrl, '_blank');
                      }}
                      sx={{
                        width: '100%',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                      }}
                    />
                  );
                }

                if (att.file_type === 'video') {
                  return (
                    <Box
                      key={att.id}
                      sx={{
                        mt: 1,
                        width: '100%',
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: '#000',
                      }}
                    >
                      <video
                        controls
                        preload="metadata"
                        style={{width: '100%', display: 'block', maxHeight: '500px'}}
                      >
                        <source src={originalUrl} type="video/mp4" />
                        <source src={originalUrl} type="video/quicktime" />
                        Ваш браузер не поддерживает видео.
                      </video>
                    </Box>
                  );
                }

                if (att.file_type === 'audio') {
                  return (
                    <Box
                      key={att.id}
                      sx={{
                        mt: 1,
                        width: '100%',
                        bgcolor: '#2c2c2e',
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{color: '#8e8e93', ml: 1, mb: 0.5}}>
                        {att.file_path.split('_').slice(1).join('_')}
                      </Typography>
                      <audio controls style={{width: '100%', height: '32px'}} preload="metadata">
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
                    key={att.id}
                    variant="outlined"
                    size="small"
                    startIcon={<InsertDriveFile />}
                    href={originalUrl}
                    target="_blank"
                    sx={{justifyContent: 'start', textTransform: 'none'}}
                  >
                    {att.file_path.split('_').slice(1).join('_')}
                  </Button>
                );
              })}
            </Stack>
          )}
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, pr: 1}}>
              {msg.tags?.map((t) => (
                <Chip
                  key={t}
                  label={`#${t}`}
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    onTagClick([t]);
                  }}
                  sx={{border: 'none', bgcolor: '#2c2c2e', fontSize: '0.7rem', height: '20px'}}
                />
              ))}
            </Box>

            <Tooltip title={formatFullDate(msg.created_at)} arrow placement="top" enterDelay={500}>
              <Typography
                variant="caption"
                sx={{
                  color: '#8e8e93',
                  fontSize: '0.7rem',

                  whiteSpace: 'nowrap',
                  cursor: 'default',
                  lineHeight: 1,
                  mb: '2px',
                  textAlign: 'right',
                }}
              >
                <Link color="textDisabled" underline="none" href={`?id=${msg.id}`}>
                  {formatShortDate(msg.created_at)}
                  {msg.updated_at !== msg.created_at && ' (ред.)'}
                </Link>
              </Typography>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MessageItem;
