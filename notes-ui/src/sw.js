let sharedData = null;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();

        // Сохраняем данные во временную переменную внутри SW
        sharedData = {
          text: formData.get('text') || formData.get('url') || formData.get('title') || '',
          files: formData.getAll('attachments'),
        };

        // Просто редиректим. Браузер сам откроет/фокусирует окно приложения.
        return Response.redirect('/?shared=1', 303);
      })(),
    );
  }

  // Обработка запроса от приложения "Дай данные"
  if (url.pathname === '/get-shared-data' && sharedData) {
    const data = JSON.stringify({
      text: sharedData.text,
      // Файлы нельзя просто сериализовать в JSON,
      // поэтому файлы мы передадим через postMessage позже или через Cache API.
      hasFiles: sharedData.files.length > 0,
    });
    // Но проще всего передать их через MessageChannel, когда страница оживет.
  }
});

// Слушаем сигнал "Я загрузился" от страницы
self.addEventListener('message', (event) => {
  if (event.data.action === 'GET_SHARED_DATA' && sharedData) {
    event.source.postMessage({
      action: 'load-shared-files',
      text: sharedData.text,
      files: sharedData.files,
    });
    sharedData = null; // Очищаем после передачи
  }
});
