let sharedData = null;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();

        sharedData = {
          text: formData.get('text') || formData.get('url') || formData.get('title') || '',
          files: formData.getAll('attachments'),
        };

        return Response.redirect('/?shared=1', 303);
      })(),
    );
  }

  if (url.pathname === '/get-shared-data' && sharedData) {
    const data = JSON.stringify({
      text: sharedData.text,

      hasFiles: sharedData.files.length > 0,
    });
  }
});

self.addEventListener('message', (event) => {
  if (event.data.action === 'GET_SHARED_DATA' && sharedData) {
    event.source.postMessage({
      action: 'load-shared-files',
      text: sharedData.text,
      files: sharedData.files,
    });
    sharedData = null;
  }
});
