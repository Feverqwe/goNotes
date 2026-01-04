self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share') {
    // Останавливаем стандартную отправку на сервер
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const text = formData.get('text') || formData.get('url') || formData.get('title') || '';
        const files = formData.getAll('attachments');

        // Редиректим на главную (303 See Other — стандарт для POST-редиректа)
        // Добавляем флаг в URL, чтобы приложение знало, что мы ждем данные
        const response = Response.redirect('/?shared=1', 303);

        // Ждем появления окна приложения
        const clientsList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        // Пытаемся найти уже открытое окно или открываем новое
        let client = clientsList.find((c) => c.visibilityState === 'visible') || clientsList[0];

        if (!client) {
          client = await self.clients.openWindow('/?shared=1');
        }

        // Функция отправки данных с повторами, пока клиент не будет готов
        const sendData = async () => {
          let attempts = 0;
          const maxAttempts = 20;

          const interval = setInterval(async () => {
            attempts++;
            const currentClients = await self.clients.matchAll({type: 'window'});
            const activeClient = currentClients.find((c) => c.url.includes('/'));

            if (activeClient) {
              activeClient.postMessage({
                action: 'load-shared-files',
                text: text,
                files: files,
              });
              clearInterval(interval);
            }

            if (attempts >= maxAttempts) clearInterval(interval);
          }, 500);
        };

        sendData();

        return response;
      })(),
    );
  }
});
