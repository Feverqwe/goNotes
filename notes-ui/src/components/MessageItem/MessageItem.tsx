import React, {FC, useCallback, useMemo} from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  Link,
  Stack,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {MoreVert} from '@mui/icons-material';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Note} from '../../types';
import {formatFullDate, formatShortDate, getBgColor, getBorderColor} from './utils';
import CodeP from './CodeP';
import CodeUl from './CodeUl';
import CodeLi from './CodeLi';
import CodeCode from './CodeCode';
import NoteAttachment from './components/NoteAttachment';
import NoteTag from './components/NoteTag';
import NoteOrder from './components/NoteOrder';

const remarkPlugins = [remarkGfm];
const remarkComponents = {
  code: CodeCode,
  p: CodeP,
  ul: CodeUl,
  li: CodeLi,
};

const tagsCtrSx = {display: 'flex', flexWrap: 'wrap', gap: 0.5, pr: 1};
const bottomSx = {
  mt: 1,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
};

const menuBtnSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  opacity: {xs: 1, sm: 0},
  transition: 'opacity 0.2s',
  color: 'text.secondary',
  backdropFilter: 'blur(4px)',
  '&:focus-visible': {
    opacity: 1,
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
};

const selectCheckboxSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  color: 'text.secondary',
  backdropFilter: 'blur(4px)',
};

const cardContentSx = {'&:last-child': {pb: 1.5}, p: 1.5};
const attachmentsStackSx = {mt: 1, pr: 0};
const dateSx = {
  color: 'text.secondary',
  fontSize: '0.7rem',
  whiteSpace: 'nowrap',
  cursor: 'default',
  lineHeight: 1,
  mb: '2px',
  textAlign: 'right',
};

interface MessageItemProps {
  msg: Note;
  onTagClick: React.Dispatch<React.SetStateAction<string[]>>;
  handleOpenMenu: (event: React.MouseEvent, msg: Note) => void;
  isSelectMode: boolean;
  toggleSelect: (id: number) => void;
  isSelected: boolean;
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
  isSelected,
  startEditing,
  isReorderMode,
  moveStep,
  index,
  totalCount,
}) => {
  const theme = useTheme();
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

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      toggleSelect(msg.id);
    },
    [msg.id, toggleSelect],
  );

  const handleMenuClick = useCallback(
    (e: React.MouseEvent) => {
      handleOpenMenu(e, msg);
    },
    [handleOpenMenu, msg],
  );

  const cardSx = useMemo(() => {
    const isDark = theme.palette.mode === 'dark';

    return {
      position: 'relative',
      '&:hover .message-action': {opacity: 1},
      bgcolor: msg.color ? getBgColor(msg.color) : msg.is_archived ? 'action.hover' : null,
      backgroundImage: msg.is_archived
        ? `repeating-linear-gradient(45deg, rgba(255,255,255,${isDark ? '0.02' : '0.3'}) 0px, rgba(255,255,255,${isDark ? '0.02' : '0.3'}) 2px, transparent 2px, transparent 10px)`
        : null,
      border: isSelected ? '1px solid' : isReorderMode ? '1px dashed' : '1px solid',
      borderColor:
        isSelected || isReorderMode
          ? 'primary.main'
          : msg.color
            ? getBorderColor(msg.color)
            : 'divider',
      cursor: isSelectMode ? 'pointer' : 'default',
      boxShadow: 'none',
    };
  }, [msg.color, msg.is_archived, theme.palette.mode, isSelected, isReorderMode, isSelectMode]);

  const contentBoxSx = useMemo(
    () => ({
      color: msg.is_archived ? 'text.secondary' : 'text.primary',
      '& p': {
        m: 0,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        overflowWrap: 'anywhere',
      },
      '& code': {
        bgcolor: 'action.selected', // Заменено с #2c2c2e
        px: 0.5,
        borderRadius: 1,
        fontFamily: 'monospace',
        fontSize: '0.9em',
      },
      '& a': {
        color: 'primary.main', // Заменено с #90caf9
        overflowWrap: 'anywhere',
      },
      '& ul, & ol': {pl: 2, my: 1},
    }),
    [msg.is_archived],
  );

  const fullDate = useMemo(() => formatFullDate(msg.created_at), [msg.created_at]);
  const shortDate = useMemo(() => formatShortDate(msg.created_at), [msg.created_at]);
  const updatedMark = useMemo(() => msg.updated_at !== msg.created_at && ' (ред.)', [msg]);
  const dateLink = useMemo(() => `?id=${msg.id}`, [msg.id]);

  return (
    <Box ref={setNodeRef} style={style}>
      <Card
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={isSelectMode ? handleCardClick : undefined}
        variant="elevation"
        sx={cardSx}
      >
        <CardContent sx={cardContentSx}>
          {!isSelectMode && isReorderMode && (
            <NoteOrder
              id={msg.id}
              index={index}
              moveStep={moveStep}
              totalCount={totalCount}
              attributes={attributes}
              listeners={listeners}
            />
          )}
          {!isReorderMode && isSelectMode && (
            <Checkbox checked={isSelected} sx={selectCheckboxSx} />
          )}
          {!isReorderMode && !isSelectMode && (
            <IconButton
              className="message-action"
              size="medium"
              onClick={handleMenuClick}
              sx={menuBtnSx}
            >
              <MoreVert fontSize="inherit" />
            </IconButton>
          )}
          <Box sx={contentBoxSx}>
            <ReactMarkdown remarkPlugins={remarkPlugins} components={remarkComponents}>
              {msg.content}
            </ReactMarkdown>
          </Box>
          {msg.attachments && msg.attachments.length > 0 && (
            <Stack spacing={1} sx={attachmentsStackSx}>
              {msg.attachments?.map((att) => (
                <NoteAttachment key={att.id} att={att} />
              ))}
            </Stack>
          )}
          <Box sx={bottomSx}>
            <Box sx={tagsCtrSx}>
              {msg.tags?.map((t) => (
                <NoteTag key={t} tag={t} onClick={onTagClick} />
              ))}
            </Box>
            <Tooltip title={fullDate} arrow placement="top" enterDelay={500}>
              <Typography variant="caption" sx={dateSx}>
                <Link color="inherit" underline="none" href={dateLink}>
                  {shortDate}
                  {updatedMark}
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
