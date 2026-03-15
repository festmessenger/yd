/* FestMessenger — Yandex Disk Transport */
'use strict';

const DiskAPI = (() => {
  const BASE = 'https://cloud-api.yandex.net/v1/disk';
  const enc = encodeURIComponent;
  let _token = '';

  function setToken(t) { _token = t; }
  function getToken() { return _token; }

  async function req(path, opts = {}) {
    return fetch(BASE + path, {
      ...opts,
      headers: { Authorization: `OAuth ${_token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
  }

  async function read(diskPath) {
    const r = await req(`/resources/download?path=${enc(diskPath)}`);
    if (!r.ok) return null;
    const { href } = await r.json();
    const fr = await fetch(href);
    if (!fr.ok) return null;
    return fr.json();
  }

  async function write(diskPath, data) {
    const r = await req(`/resources/upload?path=${enc(diskPath)}&overwrite=true`);
    if (!r.ok) throw new Error('upload_url ' + r.status);
    const { href } = await r.json();
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const wr = await fetch(href, { method: 'PUT', body });
    if (!wr.ok && wr.status !== 201) throw new Error('write ' + wr.status);
  }

  async function writeBlob(diskPath, blob, onProgress) {
    const r = await req(`/resources/upload?path=${enc(diskPath)}&overwrite=true`);
    if (!r.ok) throw new Error('upload_url');
    const { href } = await r.json();
    return new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', href);
      if (onProgress) xhr.upload.onprogress = e => onProgress(e.loaded / e.total);
      xhr.onload = () => (xhr.status < 300 || xhr.status === 201) ? res() : rej(new Error('write ' + xhr.status));
      xhr.onerror = () => rej(new Error('network'));
      xhr.send(blob);
    });
  }

  async function mkdir(diskPath) {
    const r = await req(`/resources?path=${enc(diskPath)}`, { method: 'PUT' });
    return r.status === 201 || r.status === 409;
  }

  async function remove(diskPath) {
    return req(`/resources?path=${enc(diskPath)}&permanently=true`, { method: 'DELETE' });
  }

  async function list(diskPath) {
    const r = await req(`/resources?path=${enc(diskPath)}&limit=1000&sort=created`);
    if (!r.ok) return null;
    const d = await r.json();
    return d._embedded?.items || [];
  }

  async function downloadUrl(diskPath) {
    const r = await req(`/resources/download?path=${enc(diskPath)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.href;
  }

  async function diskInfo() {
    const r = await req('/');
    if (!r.ok) return null;
    return r.json();
  }

  async function validateToken(token) {
    const r = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${token}` }
    });
    if (!r.ok) return null;
    return r.json();
  }

  async function ensureRootDirs(root) {
    await mkdir(root);
    await mkdir(`${root}/users`);
    await mkdir(`${root}/chats`);
  }

  return {
    setToken, getToken,
    read, write, writeBlob,
    mkdir, remove, list,
    downloadUrl, diskInfo,
    validateToken, ensureRootDirs
  };
})();

window.DiskAPI = DiskAPI;
