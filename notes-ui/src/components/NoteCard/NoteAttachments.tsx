import React, {FC, useCallback, useMemo, useState} from 'react';

import {Stack} from '@mui/material';

import {Attachment} from '../../types';

import MediaPreview from './MediaPreview';
import MediaSpotlight from './MediaSpotlight';
import NoteAttachment from './NoteAttachment';

const stackSx = {mt: 1, pr: 0};

interface NoteAttachmentsProps {
  attachments: Attachment[];
}

const NoteAttachments: FC<NoteAttachmentsProps> = ({attachments}) => {
  const [spotlightMediaId, setSpotlightMediaId] = useState<number | null>(null);
  const media = useMemo(
    () =>
      attachments.filter(
        (attachment) => attachment.file_type === 'image' || attachment.file_type === 'video',
      ),
    [attachments],
  );
  const otherAttachments = useMemo(
    () =>
      attachments.filter(
        (attachment) => attachment.file_type !== 'image' && attachment.file_type !== 'video',
      ),
    [attachments],
  );
  const currentIndex = useMemo(
    () => media.findIndex((attachment) => attachment.id === spotlightMediaId),
    [media, spotlightMediaId],
  );
  const currentMedia = currentIndex === -1 ? null : (media[currentIndex] ?? null);

  const openSpotlight = useCallback((attachmentId: number) => {
    setSpotlightMediaId(attachmentId);
  }, []);

  const closeSpotlight = useCallback(() => {
    setSpotlightMediaId(null);
  }, []);

  const showPreviousMedia = useCallback(() => {
    if (currentIndex === -1 || media.length < 2) return;
    const previousIndex = (currentIndex - 1 + media.length) % media.length;
    setSpotlightMediaId(media[previousIndex].id);
  }, [currentIndex, media]);

  const showNextMedia = useCallback(() => {
    if (currentIndex === -1 || media.length < 2) return;
    const nextIndex = (currentIndex + 1) % media.length;
    setSpotlightMediaId(media[nextIndex].id);
  }, [currentIndex, media]);

  return (
    <>
      <Stack spacing={1} sx={stackSx}>
        {media.length > 0 && <MediaPreview media={media} onOpen={openSpotlight} />}
        {otherAttachments.map((attachment) => (
          <NoteAttachment key={attachment.id} att={attachment} />
        ))}
      </Stack>
      <MediaSpotlight
        media={currentMedia}
        currentIndex={currentIndex}
        mediaCount={media.length}
        onClose={closeSpotlight}
        onPrevious={showPreviousMedia}
        onNext={showNextMedia}
      />
    </>
  );
};

export default NoteAttachments;
