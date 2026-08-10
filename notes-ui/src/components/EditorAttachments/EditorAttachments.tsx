import React, {FC, memo, useCallback, useRef, useState} from 'react';

import {AttachFile} from '@mui/icons-material';
import {Badge, Box, Button, Divider, IconButton, Popover, Stack} from '@mui/material';

import {Attachment} from '../../types';

import ExistingAttachmentChip from './ExistingAttachmentChip';
import NewAttachmentChip from './NewAttachmentChip';

interface EditorAttachmentsProps {
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  files: File[];
  onToggleDeleteAttachment: (id: number) => void;
  onRemoveFile: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  buttonSx?: React.ComponentProps<typeof IconButton>['sx'];
  tabIndex?: number;
}

const badgeSx = {
  '& .MuiBadge-badge': {
    fontSize: '0.65rem',
    height: 16,
    minWidth: 16,
    px: 0.5,
  },
};

const menuContentSx = {
  width: 296,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  p: 1,
};

const addButtonSx = {
  justifyContent: 'flex-start',
  px: 1.5,
  py: 1,
  borderRadius: '8px',
  textTransform: 'none',
  fontSize: '0.85rem',
};

const popoverPaperSx = {
  borderRadius: '8px',
  border: '1px solid',
  borderColor: 'divider',
  backgroundImage: 'none',
};

const attachIconSx = {transform: 'rotate(45deg)'};

const anchorOrigin = {vertical: 'top', horizontal: 'left'} as const;
const transformOrigin = {vertical: 'bottom', horizontal: 'left'} as const;

const EditorAttachments: FC<EditorAttachmentsProps> = ({
  existingAttachments,
  deletedAttachIds,
  files,
  onToggleDeleteAttachment,
  onRemoveFile,
  onFileChange,
  buttonSx,
  tabIndex,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const attachmentCount = existingAttachments.length + files.length;
  const hasAttachments = attachmentCount > 0;
  const isMenuOpen = Boolean(anchorElement);

  const openFileDialog = useCallback(() => inputRef.current?.click(), []);

  const handleButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (hasAttachments) {
        setAnchorElement(event.currentTarget);
        return;
      }
      openFileDialog();
    },
    [hasAttachments, openFileDialog],
  );

  const handleCloseMenu = useCallback(() => setAnchorElement(null), []);

  const handleAddFiles = useCallback(() => {
    handleCloseMenu();
    openFileDialog();
  }, [handleCloseMenu, openFileDialog]);

  const buttonLabel = hasAttachments ? `Вложения: ${attachmentCount}` : 'Добавить вложения';

  return (
    <>
      <IconButton
        tabIndex={tabIndex}
        onClick={handleButtonClick}
        sx={buttonSx}
        aria-label={buttonLabel}
        aria-haspopup={hasAttachments ? 'dialog' : undefined}
        aria-expanded={isMenuOpen || undefined}
      >
        <Badge
          badgeContent={attachmentCount}
          color="primary"
          invisible={!hasAttachments}
          max={99}
          sx={badgeSx}
        >
          <AttachFile sx={attachIconSx} />
        </Badge>
      </IconButton>

      <input ref={inputRef} hidden multiple type="file" onChange={onFileChange} />

      <Popover
        anchorEl={anchorElement}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        slotProps={{paper: {sx: popoverPaperSx}}}
      >
        <Box role="dialog" aria-label="Вложения" sx={menuContentSx}>
          <Stack spacing={0.75}>
            {existingAttachments.map((attachment) => (
              <ExistingAttachmentChip
                key={attachment.id}
                attachment={attachment}
                isDeleted={deletedAttachIds.includes(attachment.id)}
                onToggle={onToggleDeleteAttachment}
              />
            ))}

            {files.map((file, index) => (
              <NewAttachmentChip
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={onRemoveFile}
              />
            ))}
          </Stack>
          {hasAttachments && <Divider sx={{my: 1}} />}
          <Button
            fullWidth
            size="small"
            startIcon={<AttachFile fontSize="small" />}
            onClick={handleAddFiles}
            sx={addButtonSx}
          >
            Добавить файлы
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default memo(EditorAttachments);
