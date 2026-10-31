self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || "Food Expiry Rescue";

  const options = {
    body: data.body || "You have a food expiry alert.",
    icon: "/vite.svg",
    badge: "/vite.svg",
    data: {
      url: "/notifications",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(
      event.notification.data.url || "/notifications"
    )
  );
});