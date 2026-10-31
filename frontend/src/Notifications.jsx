
import React, { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8001";

// IMPORTANT: Keep your actual generated public key here.
const VAPID_PUBLIC_KEY = "BOLNzYm3Pep9KVXoHBCMoThPxslZfrNLkwmor-cg30IepzszWGG7YqqQgtnKwlV9hjxr-PhkuO9t3JDOut6X02E";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

function Notifications() {
  const [expired, setExpired] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);

  // Load expiry notifications from the backend
  const fetchExpiryNotifications = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage("Please log in to view your notifications.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/notifications/expiry`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        setMessage("Your login session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load expiry notifications.");
      }

      const data = await response.json();

      setExpired(
        data.expired || data.expired_foods || []
      );

      setExpiringSoon(
        data.expiring_soon || data.expiring_soon_foods || []
      );

      setMessage("");
    } catch (error) {
      console.error("Notification loading error:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enable automatic browser push notifications
  const enablePushNotifications = async () => {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        alert("Please log in first.");
        return;
      }

      if (!("serviceWorker" in navigator) ||
          !("PushManager" in window)) {
        alert("Your browser does not support push notifications.");
        return;
      }

      if (!VAPID_PUBLIC_KEY ||
          VAPID_PUBLIC_KEY.includes("PASTE_")) {
        alert("Please add your generated VAPID public key first.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Please allow browser notifications.");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const response = await fetch(
        `${API_URL}/notifications/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || "Could not save push subscription."
        );
      }

      setPushEnabled(true);
      alert("Automatic expiry alerts enabled successfully!");
    } catch (error) {
      console.error("Push notification error:", error);
      alert("Could not enable notifications: " + error.message);
    }
  };

  // Show a test browser notification
  const testBrowserNotification = async () => {
    try {
      if (!("Notification" in window)) {
        alert("Your browser does not support notifications.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        new Notification("Food Expiry Rescue", {
          body: "Your browser notifications are working!",
          icon: "/vite.svg",
        });
      } else {
        alert("Please allow notifications in your browser settings.");
      }
    } catch (error) {
      console.error(error);
      alert("Could not show test notification.");
    }
  };

  useEffect(() => {
    fetchExpiryNotifications();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((error) =>
          console.error("Service worker registration error:", error)
        );
    }
  }, []);

  const getFoodName = (item) =>
    item.food_name || item.name || item.title || "Food item";

  const getExpiryDate = (item) => {
    const date =
      item.expiry_time || item.expiry_date || item.expires_at;

    if (!date) return "Expiry date unavailable";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? date
      : parsedDate.toLocaleString();
  };

  const renderFoodList = (items, emptyMessage) => {
    if (!items.length) {
      return <p>{emptyMessage}</p>;
    }

    return items.map((item, index) => (
      <div
        key={item.id || item.food_id || index}
        style={styles.foodItem}
      >
        <strong>{getFoodName(item)}</strong>
        <p>Expiry: {getExpiryDate(item)}</p>
        {item.quantity && <p>Quantity: {item.quantity}</p>}
      </div>
    ));
  };

  return (
    <div style={styles.container}>
      <h1>Food Expiry Notifications</h1>

      <p style={styles.description}>
        Keep track of food that has expired or is approaching its expiry date.
      </p>

      <div style={styles.buttonGroup}>
        <button
          onClick={enablePushNotifications}
          style={styles.primaryButton}
        >
          Enable Automatic Expiry Alerts
        </button>

        <button
          onClick={testBrowserNotification}
          style={styles.secondaryButton}
        >
          Test Browser Notification
        </button>

        <button
          onClick={fetchExpiryNotifications}
          style={styles.secondaryButton}
        >
          Refresh Notifications
        </button>
      </div>

      {pushEnabled && (
        <p style={styles.success}>
          Browser push notifications are enabled.
        </p>
      )}

      {loading ? (
        <p>Loading notifications...</p>
      ) : (
        <>
          {message && <p style={styles.error}>{message}</p>}

          <section style={styles.section}>
            <h2 style={styles.expiredHeading}>
              Expired Food ({expired.length})
            </h2>

            {renderFoodList(
              expired,
              "No expired food found."
            )}
          </section>

          <section style={styles.section}>
            <h2 style={styles.soonHeading}>
              Expiring Soon ({expiringSoon.length})
            </h2>

            {renderFoodList(
              expiringSoon,
              "No food is expiring soon."
            )}
          </section>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "850px",
    margin: "30px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  description: {
    color: "#555",
    marginBottom: "25px",
  },

  buttonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "25px",
  },

  primaryButton: {
    background: "#198754",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  secondaryButton: {
    background: "#e9ecef",
    color: "#222",
    border: "none",
    padding: "12px 18px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  section: {
    marginTop: "25px",
    padding: "18px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },

  expiredHeading: {
    color: "#dc3545",
  },

  soonHeading: {
    color: "#d18b00",
  },

  foodItem: {
    padding: "12px",
    marginTop: "10px",
    background: "#f8f9fa",
    borderRadius: "6px",
  },

  success: {
    color: "green",
  },

  error: {
    color: "#dc3545",
  },
};

export default Notifications;
