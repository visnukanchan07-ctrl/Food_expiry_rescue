
import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = "http://127.0.0.1:8001";

const DEFAULT_CENTER = [16.5062, 80.6480];

const donationIcon = L.divIcon({
  className: "donation-map-marker",
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #16803c;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapClickSelector({ onSelectLocation }) {
  useMapEvents({
    click(event) {
      onSelectLocation({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function DonateFood() {
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [expiryTime, setExpiryTime] = useState("");

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleMapLocationSelect(coords) {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");

    const token = localStorage.getItem("access_token");

    // Check login
    if (!token) {
      setMessage("Please login before donating food.");
      return;
    }

    // Check donor role
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);

        if (user.role !== "donor") {
          setMessage("Only donor accounts can donate food.");
          return;
        }
      } catch {
        setMessage("Please login again.");
        return;
      }
    }

    if (latitude === null || longitude === null) {
      setMessage("Please select your donation location on the map.");
      return;
    }

    if (!foodName.trim() || !quantity.trim() || !location.trim()) {
      setMessage("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const donationData = {
      food_name: foodName.trim(),
      quantity: quantity.trim(),
      location: location.trim(),
      latitude,
      longitude,
      description: description.trim() || null,
      expiry_time: expiryTime
        ? new Date(expiryTime).toISOString()
        : null,
    };

    try {
      const response = await fetch(`${API_URL}/food`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(donationData),
      });

      const responseText = await response.text();

      let data;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { detail: responseText };
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          throw new Error("Your session has expired. Please login again.");
        }

        if (response.status === 403) {
          throw new Error("You are not authorized to donate food.");
        }

        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || data);

        throw new Error(
          `Server error (${response.status}): ${errorMessage}`
        );
      }

      setMessage("Food donated successfully!");

      setFoodName("");
      setQuantity("");
      setLocation("");
      setDescription("");
      setExpiryTime("");
      setLatitude(null);
      setLongitude(null);

    } catch (error) {
      console.error("Donation error:", error);

      if (error instanceof TypeError) {
        setMessage(
          "Unable to connect to the backend. Check that the API is running on port 8001."
        );
      } else {
        setMessage(error.message || "Donation failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          .donation-map {
            width: 100%;
            height: 350px;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
            margin-bottom: 12px;
            border: 1px solid #ccc;
          }

          .donation-map-marker {
            background: transparent;
            border: none;
          }

          .map-help {
            font-size: 14px;
            color: #555;
            margin: 8px 0 12px;
          }

          .map-coordinates {
            padding: 10px;
            border-radius: 6px;
            background: #e7f5eb;
            color: #176333;
            font-size: 14px;
            margin-bottom: 16px;
            overflow-wrap: anywhere;
          }
        `}
      </style>

      <h1 style={styles.heading}>Donate Food</h1>

      <p style={styles.subtitle}>
        Share extra food with people who need it.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="foodName">Food Name</label>
        <input
          id="foodName"
          type="text"
          value={foodName}
          onChange={(event) => setFoodName(event.target.value)}
          placeholder="Vegetable rice"
          required
          style={styles.input}
        />

        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          type="text"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="5 meals"
          required
          style={styles.input}
        />

        <label htmlFor="location">Location Name / Address</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="College hostel, Vijayawada"
          required
          style={styles.input}
        />

        <label>Select Donation Location on Map</label>

        <p className="map-help">
          Click the map to place a marker at your food pickup location.
        </p>

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          className="donation-map"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickSelector
            onSelectLocation={handleMapLocationSelect}
          />

          {latitude !== null && longitude !== null && (
            <Marker
              position={[latitude, longitude]}
              icon={donationIcon}
            />
          )}
        </MapContainer>

        {latitude !== null && longitude !== null ? (
          <div className="map-coordinates">
            <strong>Selected coordinates:</strong>
            <br />
            Latitude: {latitude.toFixed(6)}
            <br />
            Longitude: {longitude.toFixed(6)}
          </div>
        ) : (
          <div className="map-help">
            No map location selected yet.
          </div>
        )}

        <label htmlFor="description">Description</label>

        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Additional details"
          rows={3}
          style={styles.input}
        />

        <label htmlFor="expiryTime">
          Expiry Date and Time (optional)
        </label>

        <input
          id="expiryTime"
          type="datetime-local"
          value={expiryTime}
          onChange={(event) => setExpiryTime(event.target.value)}
          style={styles.input}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Submitting..." : "Donate Food"}
        </button>
      </form>

      {message && (
        <p
          role="status"
          style={{
            ...styles.message,
            color: message.includes("successfully")
              ? "#16803c"
              : "#c62828",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "500px",
    margin: "40px auto",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    color: "#222",
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },

  heading: {
    textAlign: "center",
    color: "#16803c",
  },

  subtitle: {
    textAlign: "center",
    marginBottom: "24px",
  },

  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    margin: "8px 0 16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
  },

  button: {
    width: "100%",
    padding: "14px 20px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "#16803c",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
  },

  message: {
    marginTop: "16px",
    textAlign: "center",
    fontWeight: "bold",
    overflowWrap: "anywhere",
  },
};
