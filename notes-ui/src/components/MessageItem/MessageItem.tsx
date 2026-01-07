import React, {FC, useCallback, useMemo} from 'react';

import {
  Box,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import {MoreVert} from '@mui/icons-material';

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Note} from '../../types';
import {formatFullDate, formatShortDate} from './utils';
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
  color: '#8e8e93',
  '&:focus-visible': {
    opacity: 1,
    boxShadow: '0 0 0 2px #90caf9',
    borderColor: '#90caf9',
  },
};
const selectCheckboxSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  color: '#8e8e93',
};
const cardContentSx = {'&:last-child': {pb: 1.5}, p: 1.5};
const attachmentsStackSx = {mt: 1, pr: 0};
const dateSx = {
  color: '#8e8e93',
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
      if (isSelectMode) {
        e.stopPropagation();
        toggleSelect(msg.id);
      }
    },
    [isSelectMode, msg.id, toggleSelect],
  );

  const handleMenuClick = useCallback(
    (e: React.MouseEvent) => {
      handleOpenMenu(e, msg);
    },
    [handleOpenMenu, msg],
  );

  const cardSx = useMemo(
    () => ({
      position: 'relative',
      '&:hover .message-action': {opacity: 1},

      bgcolor: msg.is_archived ? '#161618' : '#1c1c1e',
      backgroundImage: msg.is_archived
        ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 10px)'
        : 'none',
      '&:focus-visible': {
        boxShadow: '0 0 0 2px #90caf9',
        borderColor: '#90caf9',
      },
      border: isSelected
        ? '1px solid #90caf9'
        : isReorderMode
          ? '1px dashed #90caf9'
          : msg.is_archived
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : 'none',
    }),
    [isReorderMode, msg.is_archived, isSelected],
  );

  const contentBoxSx = useMemo(
    () => ({
      color: msg.is_archived ? '#8e8e93' : '#fff',

      '& p': {
        m: 0,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        overflowWrap: 'anywhere',
      },
      '& code': {
        bgcolor: '#2c2c2e',
        px: 0.5,
        borderRadius: 1,
        fontFamily: 'monospace',
        fontSize: '0.9em',
      },
      '& a': {
        color: '#90caf9',
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
        onClick={handleCardClick}
        variant="outlined"
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
          {!isReorderMode && isSelectMode && <Checkbox checked={isSelected} sx={selectCheckboxSx} />}
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
                <Link color="textDisabled" underline="none" href={dateLink}>
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
