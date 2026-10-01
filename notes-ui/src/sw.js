const sharedCacheName = 'goNotes-shared-data';
let delivery = Promise.resolve();

const getSharedUrl = (id) =>
  new URL(`/shared-data/${encodeURIComponent(id)}`, self.location.origin);

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();

        const id = self.crypto.randomUUID();
        const cache = await self.caches.open(sharedCacheName);
        // Keep the payload across worker termination and slow application startup.
        await cache.put(getSharedUrl(id), new Response(formData));

        const redirectUrl = new URL('/', self.location.origin);
        redirectUrl.searchParams.set('shared', id);
        return Response.redirect(redirectUrl, 303);
      })(),
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.action !== 'GET_SHARED_DATA' || !event.source) return;

  // Older UI versions send only the action; their redirect URL still identifies the share.
  const id = event.data.shareId || new URL(event.source.url).searchParams.get('shared');
  if (!id) return;

  delivery = delivery
    .catch(() => {})
    .then(async () => {
      const cache = await self.caches.open(sharedCacheName);
      const sharedUrl = getSharedUrl(id);
      const response = await cache.match(sharedUrl);
      if (!response) return;

      const formData = await response.formData();
      event.source.postMessage({
        action: 'load-shared-files',
        text: formData.get('text') || formData.get('url') || formData.get('title') || '',
        files: formData.getAll('attachments'),
      });
      await cache.delete(sharedUrl);
    });
  event.waitUntil(delivery);
});
