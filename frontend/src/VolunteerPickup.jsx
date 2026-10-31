
import { useCallback, useEffect, useState } from "react";
import {
  Truck,
  Leaf,
  Package,
  Clock,
  CheckCircle,
  MapPin,
  Phone,
  User,
  RefreshCw,
  Heart,
  AlertCircle,
} from "lucide-react";

import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const API = "http://127.0.0.1:8000";

// Map marker icon
const pickupIcon = L.divIcon({
  className: "pickup-map-marker",
  html: '<div class="pickup-marker-dot">📍</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 32],
  popupAnchor: [0, -30],
});

// Read coordinates from a pickup task.
// The API should provide latitude and longitude for each task.
function getTaskCoordinates(task) {
  const lat = Number(
    task.latitude ??
      task.lat ??
      task.pickup_latitude ??
      task.pickup_lat
  );

  const lng = Number(
    task.longitude ??
      task.lng ??
      task.lon ??
      task.pickup_longitude ??
      task.pickup_lng
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

// Automatically fit the map to all pickup markers
function MapBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 1) {
      map.setView(locations[0].coordinates, 14);
    } else if (locations.length > 1) {
      const bounds = L.latLngBounds(
        locations.map((item) => item.coordinates)
      );

      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [locations, map]);

  return null;
}

export default function VolunteerPickup() {
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState(null);

  // Load volunteer pickup tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "Please log in with your volunteer account to view pickup tasks."
      );
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API}/volunteer/pickups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not load pickup tasks."
        );
      }

      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Accept pickup / update pickup status
 
async function updateTask(url, method, taskId) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    setMessage("Please log in again to continue.");
    setMessageType("error");
    return;
  }

  setBusyTask(taskId);
  setMessage("");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || `Request failed (${response.status})`
      );
    }

    setMessage(data.message || "Task updated successfully!");
    setMessageType("success");

    await loadTasks();
  } catch (error) {
    setMessage(error.message || "Unable to update task.");
    setMessageType("error");
  } finally {
    setBusyTask(null);
  }
}


  // Dashboard statistics
  const waiting = tasks.filter(
    (task) => task.pickup_status === "waiting"
  ).length;

  const assigned = tasks.filter(
    (task) => task.pickup_status === "assigned"
  ).length;

  const collected = tasks.filter(
    (task) => task.pickup_status === "collected"
  ).length;

  const delivered = tasks.filter(
    (task) => task.pickup_status === "delivered"
  ).length;

  // Tasks with valid map coordinates
  const mappedTasks = tasks
    .map((task) => ({
      task,
      coordinates: getTaskCoordinates(task),
    }))
    .filter((item) => item.coordinates);

  // Determine available action for each task
  function getAction(task) {
    if (task.pickup_status === "waiting") {
      return {
        label: "Accept Pickup",
        icon: <Package size={17} />,
        url: `${API}/volunteer/pickups/${task.request_id}/accept`,
        method: "POST",
      };
    }

    if (task.pickup_status === "assigned") {
      return {
        label: "Mark as Collected",
        icon: <CheckCircle size={17} />,
        url: `${API}/volunteer/pickups/${task.request_id}/status?new_status=collected`,
        method: "PUT",
      };
    }

    if (task.pickup_status === "collected") {
      return {
        label: "Mark as Delivered",
        icon: <Truck size={17} />,
        url: `${API}/volunteer/pickups/${task.request_id}/status?new_status=delivered`,
        method: "PUT",
      };
    }

    return null;
  }

  return (
    <div className="volunteer-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .volunteer-page {
          min-height: 100vh;
          padding: 38px 6%;
          background: #f4faf5;
          font-family: Arial, sans-serif;
          color: #183b27;
        }

        .volunteer-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          padding: 42px;
          border-radius: 24px;
          background: linear-gradient(120deg, #105c36, #239653);
          color: white;
          box-shadow: 0 15px 35px rgba(20, 100, 55, 0.15);
        }

        .volunteer-hero-content {
          position: relative;
          z-index: 1;
          max-width: 650px;
        }

        .volunteer-hero h1 {
          margin: 0 0 14px;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          letter-spacing: -1px;
        }

        .volunteer-hero p {
          margin: 0;
          color: #e1f5e7;
          line-height: 1.8;
          font-size: 16px;
        }

        .volunteer-hero-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 105px;
          height: 105px;
          flex-shrink: 0;
          border-radius: 25px;
          background: rgba(255, 255, 255, 0.15);
        }

        .volunteer-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin: 27px 0 38px;
        }

        .volunteer-stat {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 22px;
          background: white;
          border: 1px solid #e5efe7;
          border-radius: 17px;
          box-shadow: 0 5px 18px rgba(24, 60, 32, 0.05);
          transition: 0.2s ease;
        }

        .volunteer-stat:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(24, 60, 32, 0.09);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 13px;
          background: #eaf7ed;
          color: #168447;
        }

        .volunteer-stat span {
          color: #718176;
          font-size: 13px;
        }

        .volunteer-stat h2 {
          margin: 7px 0 0;
          color: #167344;
          font-size: 28px;
        }

        .volunteer-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }

        .volunteer-heading h2 {
          margin: 0;
          font-size: 25px;
        }

        .refresh-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 17px;
          border: 1px solid #19834c;
          border-radius: 10px;
          background: white;
          color: #187344;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .refresh-action:hover {
          background: #eaf8ee;
        }

        .volunteer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
          gap: 21px;
        }

        .pickup-card {
          display: flex;
          flex-direction: column;
          background: white;
          padding: 24px;
          border-radius: 19px;
          border: 1px solid #e2ebe2;
          box-shadow: 0 5px 18px rgba(24, 60, 32, 0.055);
          transition: 0.25s ease;
        }

        .pickup-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 13px 28px rgba(24, 60, 32, 0.10);
        }

        .pickup-card h3 {
          font-size: 21px;
          margin: 0 0 12px;
          color: #17683e;
        }

        .pickup-info {
          display: grid;
          gap: 12px;
          color: #68786e;
          font-size: 14px;
          line-height: 1.5;
        }

        .pickup-info div {
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .pickup-info svg {
          flex-shrink: 0;
          color: #19834c;
          margin-top: 1px;
        }

        .pickup-info strong {
          color: #344a3a;
        }

        .status-badge {
          display: inline-flex;
          align-self: flex-start;
          padding: 7px 13px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
          margin: 20px 0 10px;
        }

        .status-badge.waiting {
          background: #fff2d8;
          color: #996300;
        }

        .status-badge.assigned {
          background: #e4efff;
          color: #245b9b;
        }

        .status-badge.collected {
          background: #eee7ff;
          color: #6842a0;
        }

        .status-badge.delivered {
          background: #ddf5e5;
          color: #18703b;
        }

        .pickup-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          padding: 13px;
          margin-top: auto;
          border: none;
          border-radius: 10px;
          background: #19834c;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .pickup-action:hover {
          background: #11673a;
          transform: translateY(-2px);
        }

        .pickup-action:disabled,
        .refresh-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .pickup-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 17px;
          border-radius: 11px;
          margin: 18px 0;
          line-height: 1.5;
        }

        .pickup-message.success {
          background: #e4f5e9;
          color: #17683e;
        }

        .pickup-message.error {
          background: #fff0ee;
          color: #b42318;
        }

        .pickup-empty {
          text-align: center;
          background: white;
          padding: 55px 20px;
          border-radius: 19px;
          border: 1px dashed #cbded0;
          color: #68786c;
        }

        .pickup-empty svg {
          color: #19834c;
          margin-bottom: 10px;
        }

        .loading-state {
          text-align: center;
          padding: 45px 15px;
          color: #68786c;
        }

        .pickup-map-section {
          margin: 10px 0 35px;
        }

        .pickup-map-section h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        .pickup-map-description {
          color: #68786e;
          margin: 0 0 17px;
          font-size: 14px;
        }

        .pickup-map {
          width: 100%;
          height: 400px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid #dce9df;
          z-index: 1;
        }

        .pickup-map-empty {
          background: white;
          border: 1px dashed #cbded0;
          border-radius: 16px;
          padding: 28px;
          color: #68786c;
          text-align: center;
        }

        .pickup-marker-dot {
          font-size: 29px;
          line-height: 36px;
          text-align: center;
        }

        .pickup-popup h3 {
          margin: 0 0 7px;
          color: #17683e;
          font-size: 16px;
        }

        .pickup-popup p {
          margin: 5px 0;
          font-size: 13px;
        }

        .pickup-popup a {
          display: inline-block;
          margin-top: 8px;
          color: #167344;
          font-weight: bold;
        }

        .volunteer-footer {
          margin-top: 45px;
          text-align: center;
          color: #849187;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .volunteer-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .volunteer-page {
            padding: 20px 14px;
          }

          .volunteer-hero {
            padding: 27px 21px;
          }

          .volunteer-hero-icon {
            display: none;
          }

          .volunteer-stats {
            gap: 10px;
          }

          .volunteer-stat {
            padding: 14px 10px;
            gap: 8px;
          }

          .stat-icon {
            width: 35px;
            height: 35px;
          }

          .stat-icon svg {
            width: 18px;
          }

          .volunteer-stat h2 {
            font-size: 23px;
          }

          .volunteer-stat span {
            font-size: 11px;
          }

          .volunteer-heading h2 {
            font-size: 21px;
          }

          .pickup-card {
            padding: 19px;
          }

          .pickup-map {
            height: 330px;
          }
        }
      `}</style>

      {/* Dashboard Header */}
      <header className="volunteer-hero">
        <div className="volunteer-hero-content">
          <h1>Volunteer Dashboard</h1>
          <p>
            Every delivery makes a difference. Collect donated food,
            support your community, and help create a hunger-free world.
          </p>
        </div>

        <div className="volunteer-hero-icon">
          <Heart size={55} />
        </div>
      </header>

      {/* Dashboard Statistics */}
      <section className="volunteer-stats">
        <div className="volunteer-stat">
          <div className="stat-icon">
            <Package size={23} />
          </div>
          <div>
            <span>Available Tasks</span>
            <h2>{waiting}</h2>
          </div>
        </div>

        <div className="volunteer-stat">
          <div className="stat-icon">
            <Clock size={23} />
          </div>
          <div>
            <span>In Progress</span>
            <h2>{assigned + collected}</h2>
          </div>
        </div>

        <div className="volunteer-stat">
          <div className="stat-icon">
            <Truck size={23} />
          </div>
          <div>
            <span>Collected</span>
            <h2>{collected}</h2>
          </div>
        </div>

        <div className="volunteer-stat">
          <div className="stat-icon">
            <CheckCircle size={23} />
          </div>
          <div>
            <span>Delivered</span>
            <h2>{delivered}</h2>
          </div>
        </div>
      </section>

      {/* Food Pickup Locations Map */}
      <section className="pickup-map-section">
        <h2>
          <MapPin
            size={23}
            style={{
              verticalAlign: "middle",
              marginRight: 7,
            }}
          />
          Food Pickup Locations
        </h2>

        <p className="pickup-map-description">
          View food pickup points on the map. Select a marker to see
          its details and directions.
        </p>

        {mappedTasks.length > 0 ? (
          <MapContainer
            center={mappedTasks[0].coordinates}
            zoom={12}
            scrollWheelZoom={false}
            className="pickup-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapBounds locations={mappedTasks} />

            {mappedTasks.map(({ task, coordinates }) => (
              <Marker
                key={task.request_id}
                position={coordinates}
                icon={pickupIcon}
              >
                <Popup>
                  <div className="pickup-popup">
                    <h3>{task.food_name || "Food Donation"}</h3>

                    <p>
                      <strong>Request:</strong> #{task.request_id}
                    </p>

                    <p>
                      <strong>Location:</strong>{" "}
                      {task.location || "Address not provided"}
                    </p>

                    <p>
                      <strong>Quantity:</strong>{" "}
                      {task.quantity ?? "Not specified"}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      {task.pickup_status}
                    </p>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${coordinates[0]},${coordinates[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get Directions
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="pickup-map-empty">
            <MapPin size={30} />
            <p>
              No pickup coordinates are available yet. The map will
              display markers when your pickup tasks include latitude
              and longitude.
            </p>
          </div>
        )}
      </section>

      {/* Pickup Tasks Heading */}
      <div className="volunteer-heading">
        <h2>Food Pickup Tasks</h2>

        <button
          className="refresh-action"
          onClick={loadTasks}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh Tasks"}
        </button>
      </div>

      {/* Success and Error Messages */}
      {message && (
        <div className={`pickup-message ${messageType}`}>
          <AlertCircle size={19} />
          <span>{message}</span>
        </div>
      )}

      {/* Loading / Empty / Pickup Cards */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={25} />
          <p>Loading food pickup tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="pickup-empty">
          <Leaf size={42} />
          <h2>No pickup tasks available</h2>
          <p>
            Approved food requests will appear here when they are
            ready for volunteer pickup.
          </p>
        </div>
      ) : (
        <div className="volunteer-grid">
          {tasks.map((task) => {
            const action = getAction(task);

            return (
              <article
                className="pickup-card"
                key={task.request_id}
              >
                <h3>{task.food_name || "Food Donation"}</h3>

                <div className="pickup-info">
                  <div>
                    <Package size={17} />
                    <span>
                      <strong>Request ID:</strong> #{task.request_id}
                    </span>
                  </div>

                  <div>
                    <MapPin size={17} />
                    <span>
                      <strong>Location:</strong>{" "}
                      {task.location || "Not provided"}
                    </span>
                  </div>

                  <div>
                    <Package size={17} />
                    <span>
                      <strong>Quantity:</strong>{" "}
                      {task.quantity ?? "Not specified"}
                    </span>
                  </div>

                  <div>
                    <User size={17} />
                    <span>
                      <strong>Receiver:</strong>{" "}
                      {task.receiver_name || "Not provided"}
                    </span>
                  </div>

                  <div>
                    <Phone size={17} />
                    <span>
                      <strong>Phone:</strong>{" "}
                      {task.receiver_phone || "Not provided"}
                    </span>
                  </div>
                </div>

                <span
                  className={`status-badge ${task.pickup_status}`}
                >
                  {task.pickup_status}
                </span>

                {action ? (
                  <button
                    className="pickup-action"
                    disabled={busyTask === task.request_id}
                    onClick={() =>
                      updateTask(
                        action.url,
                        action.method,
                        task.request_id
                      )
                    }
                  >
                    {busyTask === task.request_id ? (
                      "Updating..."
                    ) : (
                      <>
                        {action.icon}
                        {action.label}
                      </>
                    )}
                  </button>
                ) : (
                  <p
                    style={{
                      color: "#18703b",
                      fontWeight: "bold",
                    }}
                  >
                    <CheckCircle
                      size={17}
                      style={{ verticalAlign: "middle" }}
                    />
                    {" "}Successfully Delivered!
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="volunteer-footer">
        <Leaf
          size={15}
          style={{ verticalAlign: "middle" }}
        />
        {" "}Food Expiry Rescue · Saving food, serving communities.
      </footer>
    </div>
  );
}
