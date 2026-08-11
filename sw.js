// 1. バージョン名を更新（今後アプリをアップデートする時はここを v2, v3... と書き換えます）
const CACHE_NAME = 'fuzoku-zukan-v2';

const urlsToCache = [
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// インストール時にファイルをキャッシュ ＆ 即座に有効化準備
self.addEventListener('install', (event) => {
  // 待機状態を作らず、すぐに新しいSWをアクティブ化の準備へ移動させる
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティベート時（古いキャッシュを削除して最新を反映）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          // 現在の CACHE_NAME 以外の古いキャッシュを全削除
          if (key !== CACHE_NAME) {
            console.log('古いキャッシュを削除しました:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // 開いているすべてのページに即座に新しいSWを適用
  );
});

// リクエスト処理（ネットワークから最新取得を優先し、ダメならキャッシュから返す）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 正常に取得できたらキャッシュも最新に更新
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // オフラインなどで通信失敗した場合はキャッシュから返す
        return caches.match(event.request);
      })
  );
});

// プッシュ通知またはバックグラウンドからの通知表示処理
self.addEventListener('push', (event) => {
  let data = { title: 'リマインダー', body: '予定の時間になりました', icon: './icon.png' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './icon.png',
    badge: './icon.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知をクリックした時の動作（アプリのウィンドウを開く/フォーカスする）
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
