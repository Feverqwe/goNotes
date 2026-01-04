import React, {FC, useCallback, useRef} from 'react';

// MUI Core Components
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

// MUI Icons
import {InsertDriveFile, MoreVert} from '@mui/icons-material';

// Markdown & Syntax Highlighting
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
  isLast: boolean;
  refIsLoading: React.RefObject<boolean>;
  refHasMore: React.RefObject<boolean>;
  fetchMessages: (isInitial?: boolean) => Promise<void>;
  startEditing: (note: Note) => void;
}

const MessageItem: FC<MessageItemProps> = ({
  msg,
  onTagClick,
  isLast,
  handleOpenMenu,
  isSelectMode,
  toggleSelect,
  selectedIds,
  refIsLoading,
  refHasMore,
  fetchMessages,
  startEditing,
}) => {
  const observer = useRef<IntersectionObserver | undefined>(undefined);

  // Коллбэк для отслеживания самого верхнего элемента
  const firstMessageRef = useCallback(
    (node: Element) => {
      const isLoading = refIsLoading.current;
      const hasMore = refHasMore.current;
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMessages(false);
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchMessages, refHasMore, refIsLoading],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Если фокус на кнопке внутри карточки (например, меню), не перехватываем
      if (e.target !== e.currentTarget) return;

      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у') {
        e.preventDefault();
        startEditing(msg);
      }
    },
    [startEditing, msg],
  );

  return (
    <Box ref={isLast ? firstMessageRef : undefined}>
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
          position: 'relative', // Для позиционирования кнопки
          '&:hover .message-action': {opacity: 1}, // Показываем кнопку при наведении (на десктопе)
          // Подсветка выбранного сообщения
          bgcolor: selectedIds.includes(msg.id)
            ? 'rgba(144, 202, 249, 0.05)'
            : msg.is_archived
              ? '#161618'
              : '#1c1c1e',
          boxShadow: selectedIds.includes(msg.id) ? '0 0 3px #90caf9' : 'none',
          backgroundImage: msg.is_archived
            ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 10px)'
            : 'none',
          border: msg.is_archived ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          '&:focus-visible': {
            boxShadow: '0 0 0 2px #90caf9',
            borderColor: '#90caf9',
          },
        }}
      >
        <CardContent sx={{'&:last-child': {pb: 1.5}, pr: 1.5, pl: 2, pt: 1.5}}>
          {/* Добавим чекбокс в режиме выбора */}
          {isSelectMode && (
            <Checkbox
              checked={selectedIds.includes(msg.id)}
              sx={{position: 'absolute', top: 4, right: 4, color: '#8e8e93'}}
            />
          )}
          {/* КНОПКА ВЫЗОВА МЕНЮ (в углу) */}
          {!isSelectMode && (
            <IconButton
              className="message-action"
              size="medium"
              onClick={(e) => handleOpenMenu(e, msg)}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                opacity: {xs: 1, sm: 0}, // На мобилках видна всегда, на ПК — при наведении
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
              pr: 3,
              // Стилизуем элементы Markdown под наш интерфейс
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
                // Улучшим отображение других элементов для чата
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
                // Определяем URL для отображения: сначала миниатюра, если есть, иначе оригинал
                const displayUrl = att.thumbnail_path
                  ? `${API_BASE}/files/${att.thumbnail_path}`
                  : `${API_BASE}/files/${att.file_path}`;

                // URL для открытия в новой вкладке (всегда оригинал)
                const originalUrl = `${API_BASE}/files/${att.file_path}`;

                if (att.file_type === 'image') {
                  return (
                    <Box
                      key={att.id}
                      component="img"
                      src={displayUrl} // Используем миниатюру
                      onClick={(e) => {
                        window.open(originalUrl, '_blank'); // Открываем оригинал
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
                        <source src={originalUrl} type="video/quicktime" /> {/* Для .mov файлов */}
                        Ваш браузер не поддерживает видео.
                      </video>
                    </Box>
                  );
                }

                // ОБРАБОТКА АУДИО
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

          {/* НИЖНЯЯ ПАНЕЛЬ: Теги + Дата */}
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            {/* Теги слева */}
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

            {/* Дата справа БЕЗ отступа */}
            <Tooltip title={formatFullDate(msg.created_at)} arrow placement="top" enterDelay={500}>
              <Typography
                variant="caption"
                sx={{
                  color: '#8e8e93',
                  fontSize: '0.7rem',
                  // Убираем ml: 1, выравниваем по правому краю контейнера
                  whiteSpace: 'nowrap',
                  cursor: 'default',
                  lineHeight: 1,
                  mb: '2px', // Небольшая корректировка для выравнивания по базовой линии тегов
                  textAlign: 'right',
                }}
              >
                {formatShortDate(msg.created_at)}
                {msg.updated_at !== msg.created_at && ' (ред.)'}
              </Typography>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MessageItem;
