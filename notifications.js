const VAPID_PUBLIC_KEY = "BEvElTn5LvbdDxtwUWJiXFnRnhyUTwKW_IguIrtJslTh7yaDxTsoDeSL3vj_hFS9uLSb6SADOYCsKg5-h3umeDo";
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
async function enableNexoraNotifications() {
  if (!("Notification" in window)) {
    alert("Notifications are not supported in this browser.");
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    alert("Service Worker is not supported in this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
    console.log("Nexora notifications permission granted");

const registration = await navigator.serviceWorker.ready;

const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
});
console.log("Nexora push subscription created:", subscription);

await fetch("/api/subscribe", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(subscription.toJSON())
});

console.log("Nexora push subscription saved to Cloudflare");
return true;
    }

    if (permission === "denied") {
      console.log("Nexora notifications permission denied");
      return false;
    }

    console.log("Nexora notifications permission dismissed");
    return false;
  } catch (error) {
    console.error("Notification permission failed:", error);
    return false;
  }
}

window.enableNexoraNotifications = enableNexoraNotifications;
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("enable-notifications");

  if (!button) return;

  button.addEventListener("click", () => {
    enableNexoraNotifications();
  });
});