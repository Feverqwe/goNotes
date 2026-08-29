import React, {
  FC,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {MoreVert, OpenInFull, Restore} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  Link,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import ReactMarkdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {SnackCtx} from '../../ctx/SnackCtx';
import {api} from '../../tools/api';
import {MarkNoteUsedRequest} from '../../tools/types';
import {Note} from '../../types';
import {formatFullDate, formatShortDate} from '../../utils/formatDate';
import {getNoteBackgroundColor, getNoteBorderColor} from '../../utils/noteColors';

import MarkdownCode from './MarkdownCode';
import MarkdownListItem from './MarkdownListItem';
import MarkdownParagraph from './MarkdownParagraph';
import MarkdownUnorderedList from './MarkdownUnorderedList';
import NoteAttachments from './NoteAttachments';
import NoteOrder from './NoteOrder';
import NoteTag from './NoteTag';
import Secret from './Secret';
import remarkSecret from './remarkSecret';

const remarkPlugins = [remarkGfm, remarkSecret];
const remarkComponents: Components = {
  span: ({node, ...props}) => {
    if (props.className === 'secret-spoiler') {
      return <Secret>{(props as Record<string, string>)['data-secret']}</Secret>;
    }
    return <span {...props} />;
  },
  code: MarkdownCode,
  p: MarkdownParagraph,
  ul: MarkdownUnorderedList,
  li: MarkdownListItem,
};

const tagsCtrSx = {display: 'flex', flexWrap: 'wrap', gap: 0.5, pr: 1};
const bottomSx = {
  mt: 1,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
};

const selectCheckboxSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  color: 'text.secondary',
  backdropFilter: 'blur(4px)',
  zIndex: 10,
};

const cardContentSx = {'&:last-child': {pb: 1.5}, p: 1.5};
const contentContainerSx = {position: 'relative'};
const noteActionButtonSx = (isMobile: boolean) => ({
  color: 'text.secondary',
  backdropFilter: isMobile ? 'none' : 'blur(4px)',
  '&:focus-visible': {
    boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
  },
});
const openNoteButtonSx = {
  position: 'absolute',
  left: '50%',
  bottom: 8,
  transform: 'translateX(-50%)',
};
const menuBtnSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  zIndex: 10,
  opacity: {xs: 1, sm: 0},
  transition: 'opacity 0.2s',
  '&:focus-visible': {opacity: 1},
};
const dateSx = {
  color: 'text.secondary',
  fontSize: '0.7rem',
  whiteSpace: 'nowrap',
  cursor: 'default',
  textAlign: 'right',
};

interface NoteCardProps {
  note: Note;
  onTagClick: (tags: string[]) => void;
  onOpenMenu: (event: React.MouseEvent, note: Note) => void;
  isSelectMode: boolean;
  onToggleSelection: (id: number) => void;
  isSelected: boolean;
  onEdit: (note: Note) => void;
  isReorderMode: boolean;
  onMove?: (id: number, direction: 'up' | 'down') => void;
  index: number;
  totalCount: number;
  onRequestDelete: (id: number) => void;
  showFullContent: boolean;
}

const NoteCard: FC<NoteCardProps> = ({
  note,
  onTagClick,
  onOpenMenu,
  isSelectMode,
  onToggleSelection,
  isSelected,
  onEdit,
  isReorderMode,
  onMove,
  index,
  totalCount,
  onRequestDelete,
  showFullContent,
}) => {
  const theme = useTheme();
  const showSnackbar = useContext(SnackCtx);
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const contentRef = useRef<HTMLDivElement>(null);
  const [isContentOverflowing, setIsContentOverflowing] = useState(false);
  const collapsedContentHeight = isMobile ? 220 : 320;
  const isContentCollapsed = !showFullContent && isContentOverflowing;
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: note.id,
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

  const useItMutation = useMutation({
    mutationFn: async (params: MarkNoteUsedRequest) => {
      const [r] = await Promise.all([
        api.notes.markUsed(params),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        }),
      ]);
      return r;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notes']});
    },
    onError: (err) => {
      console.error(err);
      showSnackbar('Ошибка при пометке сообщения использованной', 'error');
    },
  });

  const handleUseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      useItMutation.mutate({id: note.id});
    },
    [note.id, useItMutation],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у') {
        e.preventDefault();
        onEdit(note);
      }
      if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'в') {
        e.preventDefault();
        onRequestDelete(note.id);
      }
    },
    [onEdit, note, onRequestDelete],
  );

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateOverflow = () => {
      setIsContentOverflowing(content.scrollHeight > collapsedContentHeight + 1);
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [collapsedContentHeight, note.content]);

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onToggleSelection(note.id);
    },
    [note.id, onToggleSelection],
  );

  const handleMenuClick = useCallback(
    (e: React.MouseEvent) => {
      onOpenMenu(e, note);
    },
    [onOpenMenu, note],
  );

  const cardSx = useMemo(() => {
    const isDark = theme.palette.mode === 'dark';

    return {
      position: 'relative',
      '&:hover .note-menu-action, &:hover .note-context-action': {opacity: 1},
      bgcolor: note.color
        ? getNoteBackgroundColor(note.color)
        : note.is_archived
          ? 'action.hover'
          : null,
      backgroundImage: note.is_archived
        ? `repeating-linear-gradient(45deg, rgba(255,255,255,${isDark ? '0.01' : '0.2'}) 0px, rgba(255,255,255,${isDark ? '0.01' : '0.2'}) 2px, transparent 2px, transparent 10px)`
        : null,
      border: isSelected ? '1px solid' : isReorderMode ? '1px dashed' : '1px solid',
      borderColor:
        isSelected || isReorderMode
          ? 'primary.main'
          : note.color
            ? getNoteBorderColor(note.color)
            : 'divider',
      cursor: isSelectMode ? 'pointer' : 'default',
      boxShadow: 'none',
    };
  }, [note.color, note.is_archived, theme.palette.mode, isSelected, isReorderMode, isSelectMode]);

  const contentBoxSx = useMemo(
    () => ({
      color: note.is_archived ? 'text.secondary' : 'text.primary',
      maxHeight: isContentCollapsed ? `${collapsedContentHeight}px` : 'none',
      overflow: 'hidden',
      WebkitMaskImage: isContentCollapsed
        ? 'linear-gradient(to bottom, black calc(100% - 64px), transparent 100%)'
        : 'none',
      maskImage: isContentCollapsed
        ? 'linear-gradient(to bottom, black calc(100% - 64px), transparent 100%)'
        : 'none',
      '& p': {
        m: 0,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        overflowWrap: 'anywhere',
      },
      '& a': {
        color: 'primary.main',
        overflowWrap: 'anywhere',
      },
      '& h1, & h2, & h3, & h4, & h5, & h6': {
        mt: 2,
        mb: 1,
        lineHeight: 1.25,
        overflowWrap: 'anywhere',
      },
      '& h1': {fontSize: '1.5rem'},
      '& h2': {fontSize: '1.25rem'},
      '& h3': {fontSize: '1.1rem'},
      '& h4': {fontSize: '1rem'},
      '& h5': {fontSize: '0.9rem'},
      '& h6': {fontSize: '0.8rem'},
      '& > h1:first-of-type': {mt: 0},
      '& ul, & ol': {pl: 2, my: 1},
      '& blockquote': {
        mx: 0,
        my: 1.5,
        pl: 1.5,
        borderLeft: '3px solid',
        borderColor: 'divider',
        color: 'text.secondary',
      },
      '& hr': {
        my: 1.5,
        border: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
      },
      '& table': {
        width: '100%',
        my: 1.5,
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontSize: '0.9rem',
      },
      '& th, & td': {
        px: 1,
        py: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'left',
        verticalAlign: 'top',
        overflowWrap: 'anywhere',
      },
      '& th': {
        bgcolor: 'action.hover',
        fontWeight: 700,
      },
    }),
    [collapsedContentHeight, isContentCollapsed, note.is_archived],
  );

  const contextActionBtnSx = useMemo(
    () => ({
      color: 'text.disabled',
      '&:hover': {color: 'primary.main'},
      opacity: {xs: 1, sm: 0},
      transition: 'opacity 0.2s',
      '&:focus-visible': {
        opacity: 1,
        boxShadow: (theme: Theme) => `0 0 0 2px ${theme.palette.primary.main}`,
      },
    }),
    [],
  );

  const fullDate = useMemo(() => formatFullDate(note.created_at), [note.created_at]);
  const shortDate = useMemo(() => formatShortDate(note.created_at), [note.created_at]);
  const updatedMark = useMemo(() => note.updated_at !== note.created_at && ' (ред.)', [note]);
  const dateLink = useMemo(() => `?id=${note.id}`, [note.id]);

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
              id={note.id}
              index={index}
              onMove={onMove}
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
              className="note-menu-action"
              size="medium"
              onClick={handleMenuClick}
              sx={[noteActionButtonSx(isMobile), menuBtnSx]}
            >
              <MoreVert fontSize="inherit" />
            </IconButton>
          )}
          <Box sx={contentContainerSx}>
            <Box id={`note-content-${note.id}`} ref={contentRef} sx={contentBoxSx}>
              <ReactMarkdown remarkPlugins={remarkPlugins} components={remarkComponents}>
                {note.content}
              </ReactMarkdown>
            </Box>
            {isContentCollapsed && !isSelectMode && !isReorderMode && (
              <IconButton
                component="a"
                href={dateLink}
                aria-label="Открыть только эту заметку"
                sx={[noteActionButtonSx(isMobile), openNoteButtonSx]}
              >
                <OpenInFull fontSize="inherit" />
              </IconButton>
            )}
          </Box>
          {note.attachments && note.attachments.length > 0 && (
            <NoteAttachments attachments={note.attachments} />
          )}
          <Box sx={[bottomSx, {display: 'flex', alignItems: 'center'}]}>
            <Box sx={tagsCtrSx}>
              {note.tags?.map((t) => (
                <NoteTag key={t} tag={t} onClick={onTagClick} />
              ))}
            </Box>

            <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
              {!isSelectMode && !isReorderMode && (
                <>
                  <Tooltip title="Отметить использование" arrow>
                    <IconButton
                      size="small"
                      className="note-context-action"
                      onClick={handleUseClick}
                      loading={useItMutation.isPending}
                      sx={contextActionBtnSx}
                    >
                      <Restore sx={{fontSize: 16}} />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              <Tooltip title={fullDate} arrow>
                <Typography variant="caption" sx={dateSx}>
                  <Link color="inherit" underline="none" href={dateLink}>
                    {shortDate}
                    {updatedMark}
                  </Link>
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NoteCard;
