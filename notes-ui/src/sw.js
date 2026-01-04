self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share') {
    // ВАЖНО: Мы должны вызвать respondWith сразу
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const text = formData.get('text') || formData.get('url') || formData.get('title') || '';
        const files = formData.getAll('attachments');

        // Вместо openWindow сначала пробуем найти существующее окно
        const allClients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
        let client = allClients.find((c) => c.visibilityState === 'visible');

        // Если окна нет, открываем новое. Браузер разрешает это внутри обработки share_target
        if (!client && allClients.length > 0) {
          client = allClients[0];
        }

        if (!client) {
          // Если совсем нет окон, открываем.
          // Ошибка InvalidAccessError часто возникает, если пытаться открыть URL,
          // отличный от того, что в манифесте, или если домен не в фокусе.
          client = await self.clients.openWindow('/');
        }

        // Ждем, пока клиент станет активным
        if (client.focused === false) {
          client = await client.focus();
        }

        // Передаем данные. Используем небольшой таймаут, чтобы страница успела проснуться
        const sendPayload = () => {
          client.postMessage({
            action: 'load-shared-files',
            text: text,
            files: files, // Это объекты File/Blob, они корректно передаются через Structured Clone
          });
        };

        // В 2026 году лучше использовать ping-pong для проверки готовности страницы
        // Но для начала попробуем просто задержку
        setTimeout(sendPayload, 800);

        // Возвращаем редирект, чтобы завершить POST-запрос share_target
        return Response.redirect('/', 303);
      })(),
    );
  }
});
