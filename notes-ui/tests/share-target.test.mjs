import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const origin = 'https://notes.example';
const workerSource = await readFile(new URL('../src/sw.js', import.meta.url), 'utf8');
const editorSource = await readFile(
  new URL('../src/components/NoteEditor/NoteEditor.tsx', import.meta.url),
  'utf8',
);

function createWorker(storage = new Map()) {
  const listeners = new Map();
  const cache = {
    put: async (url, response) => storage.set(String(url), response.clone()),
    match: async (url) => storage.get(String(url))?.clone(),
    delete: async (url) => storage.delete(String(url)),
  };
  vm.runInNewContext(workerSource, {
    self: {
      location: {origin},
      addEventListener: (name, listener) => listeners.set(name, listener),
      caches: {open: async () => cache},
      crypto: {randomUUID},
    },
    URL,
    Response,
  });
  return {
    storage,
    async share(formData) {
      let response;
      listeners.get('fetch')({
        request: new Request(`${origin}/share`, {method: 'POST', body: formData}),
        respondWith: (promise) => {
          response = promise;
        },
      });
      const redirect = await response;
      assert.equal(redirect.status, 303);
      return redirect.headers.get('location');
    },
    async receive(url, messages, data = {action: 'GET_SHARED_DATA'}) {
      let pending;
      listeners.get('message')({
        data,
        source: {url, postMessage: (message) => messages.push(message)},
        waitUntil: (promise) => {
          pending = promise;
        },
      });
      await pending;
    },
  };
}

test('attachments survive worker restart and are delivered once to the share window', async () => {
  const formData = new FormData();
  formData.set('text', 'Shared document');
  formData.append(
    'attachments',
    new File(['document body'], 'document.pdf', {type: 'application/pdf'}),
  );
  formData.append(
    'attachments',
    new File([new Uint8Array([0, 255, 1])], 'photo.png', {type: 'image/png'}),
  );
  const original = createWorker();
  const redirect = await original.share(formData);
  const restarted = createWorker(original.storage);
  const messages = [];

  await restarted.receive(`${origin}/`, messages);
  assert.equal(messages.length, 0, 'ordinary windows must not consume pending files');
  await Promise.all([restarted.receive(redirect, messages), restarted.receive(redirect, messages)]);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, 'Shared document');
  assert.equal(messages[0].files.length, 2);
  assert.equal(messages[0].files[0].name, 'document.pdf');
  assert.equal(messages[0].files[0].type, 'application/pdf');
  assert.equal(await messages[0].files[0].text(), 'document body');
  assert.equal(messages[0].files[1].name, 'photo.png');
  assert.deepEqual(
    new Uint8Array(await messages[0].files[1].arrayBuffer()),
    new Uint8Array([0, 255, 1]),
  );
  assert.equal(original.storage.size, 0, 'delivered files must be removed from the cache');
});

test('two shares retain their own payload and support both old and new UI messages', async () => {
  const worker = createWorker();
  const first = new FormData();
  first.set('url', 'https://example.com/article');
  const second = new FormData();
  second.set('title', 'Second share');
  const firstUrl = await worker.share(first);
  const secondUrl = await worker.share(second);
  const messages = [];
  await worker.receive(secondUrl, messages);
  await worker.receive(`${origin}/`, messages, {
    action: 'GET_SHARED_DATA',
    shareId: new URL(firstUrl).searchParams.get('shared'),
  });
  assert.deepEqual(
    messages.map((message) => message.text),
    ['Second share', 'https://example.com/article'],
  );
});

function createEditor({
  mobile = true,
  search = '?shared=share-id',
  supported = true,
  controlled = false,
} = {}) {
  const listeners = new Map();
  const states = [];
  const effects = [];
  const opened = [];
  const requests = [];
  const timers = new Map();
  let ready;
  const worker = {postMessage: (message) => requests.push(message)};
  const serviceWorker = {
    controller: controlled ? worker : null,
    ready: new Promise((resolve) => {
      ready = resolve;
    }),
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };
  const react = {
    useState(initial) {
      const index = states.length;
      states.push(initial);
      return [
        initial,
        (value) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        },
      ];
    },
    useRef: (value) => ({current: value}),
    useEffect: (effect) => effects.push(effect),
    useCallback: (callback) => callback,
  };
  const window = {
    location: {search, href: `${origin}/${search}`},
    history: {
      state: null,
      replaceState(_state, _unused, url) {
        window.location.href = String(url);
      },
    },
  };
  const exports = {};
  const compiled = ts.transpileModule(editorSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return {jsx: () => null, jsxs: () => null};
      if (name === '@mui/material')
        return {
          useMediaQuery: () => mobile,
          useTheme: () => ({breakpoints: {down: () => ''}}),
        };
      return {default: () => null};
    },
    navigator: supported ? {serviceWorker} : {},
    window,
    URL,
    URLSearchParams,
    setTimeout: (callback) => {
      const id = timers.size;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  exports.default({editingNote: null, open: false, setOpen: (value) => opened.push(value)});
  const cleanups = effects.map((effect) => effect()).filter(Boolean);
  return {
    states,
    opened,
    requests,
    window,
    startupTimeout: () => {
      timers.forEach((callback) => callback());
      timers.clear();
    },
    async activate() {
      serviceWorker.controller = worker;
      ready({active: worker});
      await Promise.resolve();
      listeners.get('controllerchange')?.();
    },
    message: (data) => listeners.get('message')?.({data}),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

for (const mobile of [true, false]) {
  test(`late service worker activation imports files and opens the ${mobile ? 'mobile' : 'desktop'} editor`, async () => {
    const editor = createEditor({mobile, search: '?shared=share-id&tags=work'});
    editor.startupTimeout();
    assert.equal(editor.requests.length, 0);
    await editor.activate();
    assert.equal(editor.requests.length, 1);
    assert.equal(editor.requests[0].shareId, 'share-id');
    const file = new File(['attachment'], 'file.txt');
    const data = {action: 'load-shared-files', files: [file], text: 'Shared text'};
    editor.message(data);
    editor.message(data);
    assert.equal(editor.states[0].length, 1);
    assert.equal(editor.states[0][0], file);
    assert.equal(editor.states[1], 'Shared text');
    assert.deepEqual(editor.opened, [true]);
    assert.equal(new URL(editor.window.location.href).search, '?tags=work');
  });
}

test('file-only shares open a closed desktop editor with an already active worker', async () => {
  const editor = createEditor({mobile: false, controlled: true, search: '?shared=1'});
  editor.startupTimeout();
  await editor.activate();
  assert.equal(editor.requests.length, 1, 'readiness must not duplicate the initial request');
  editor.message({action: 'load-shared-files', files: [new File(['file'], 'file.txt')], text: ''});
  assert.equal(editor.states[0].length, 1);
  assert.equal(editor.states[1], '');
  assert.deepEqual(editor.opened, [true]);
});

test('unmounted editor does not request files after activation', async () => {
  const editor = createEditor();
  editor.cleanup();
  await editor.activate();
  assert.equal(editor.requests.length, 0);
});

test('ordinary launches do not request files and unsupported browsers render safely', async () => {
  const editor = createEditor({search: ''});
  await editor.activate();
  assert.equal(editor.requests.length, 0);
  assert.doesNotThrow(() => createEditor({supported: false}));
});
