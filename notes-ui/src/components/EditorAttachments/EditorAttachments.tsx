import React, {FC, Fragment, memo, useMemo} from 'react';

import {AttachFile} from '@mui/icons-material';
import {Box, IconButton} from '@mui/material';

import {Attachment} from '../../types';

import ExistingAttachmentChip from './ExistingAttachmentChip';
import NewAttachmentChip from './NewAttachmentChip';

interface EditorAttachmentsProps {
  existingAttachments: Attachment[];
  deletedAttachIds: number[];
  files: File[];
  onToggleDeleteAttachment: (id: number) => void;
  onRemoveFile: (index: number) => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditorMode?: boolean;
}

const attachScrollBoxSx = {
  display: 'flex',
  gap: 1.5,
  px: 2,
  pt: 1.5,
  pb: 0,
  overflowX: 'auto',
  '&::-webkit-scrollbar': {display: 'none'},
};

const iconButtonSx = {p: 0.5, height: '42px', width: '42px'};

const EditorAttachments: FC<EditorAttachmentsProps> = ({
  existingAttachments,
  deletedAttachIds,
  files,
  onToggleDeleteAttachment,
  onRemoveFile,
  onFileChange,
  isEditorMode = false,
}) => {
  const hasAttachments = existingAttachments.length > 0 || files.length > 0;

  const sx = useMemo(() => {
    const s = {...attachScrollBoxSx};
    if (isEditorMode) {
      s.pt = 1;
      s.pb = 1;
    }
    return s;
  }, [isEditorMode]);

  if (!hasAttachments && !isEditorMode) {
    return null;
  }

  return (
    <Box sx={sx}>
      {isEditorMode && onFileChange && (
        <IconButton component="label" size="small" sx={iconButtonSx}>
          <AttachFile fontSize="small" />
          <input hidden multiple type="file" onChange={onFileChange} />
        </IconButton>
      )}

      {hasAttachments && (
        <Fragment>
          {existingAttachments?.map((att) => (
            <ExistingAttachmentChip
              key={att.id}
              attachment={att}
              isDeleted={deletedAttachIds.includes(att.id)}
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
        </Fragment>
      )}
    </Box>
  );
};

export default memo(EditorAttachments);
