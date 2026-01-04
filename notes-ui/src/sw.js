self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Перехватываем запрос на /share, который мы указали в манифесте
  if (event.request.method === 'POST' && url.pathname === '/share') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const text = formData.get('text') || formData.get('url') || '';
        const files = formData.getAll('attachments');

        // Открываем окно приложения, если оно закрыто
        const client = await self.clients.claim();
        const allClients = await self.clients.matchAll({type: 'window'});
        const appWindow = allClients[0] || (await self.clients.openWindow('/'));

        // Ждем немного, пока страница загрузится, и шлем данные
        setTimeout(() => {
          appWindow.postMessage(
            {
              action: 'load-shared-files',
              text: text,
              files: files,
            },
            '*',
          );
        }, 1000);

        return Response.redirect('/', 303);
      })(),
    );
  }
});
