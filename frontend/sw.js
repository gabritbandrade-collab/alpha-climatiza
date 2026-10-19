// Service worker mínimo, só para o app poder ser instalado.
// NÃO guarda nada em cache e NÃO intercepta requisições: páginas, dados do
// Supabase, login e fotos continuam sempre indo direto para a rede.
// Também apaga qualquer cache antigo que por acaso exista.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
