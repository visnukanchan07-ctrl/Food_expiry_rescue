
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8001";

export default function MyRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMyRequests = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login to view your food requests.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/food/requests`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => []);

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Your account is not authorized to view receiver requests."
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to load food requests."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from the server.");
      }

      setRequests(data);
    } catch (err) {
      console.error("Error loading requests:", err);
      setError(err.message || "Could not load food requests.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  function getStatusStyle(status) {
    const normalizedStatus = String(status || "pending").toLowerCase();

    if (
      normalizedStatus === "accepted" ||
      normalizedStatus === "approved"
    ) {
      return styles.acceptedStatus;
    }

    if (normalizedStatus === "rejected") {
      return styles.rejectedStatus;
    }

    return styles.pendingStatus;
  }

  function formatStatus(status) {
    const value = String(status || "pending");
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.heading}>My Food Requests</h1>

        <p style={styles.subtitle}>
          Track the status of food you have requested.
        </p>

        <button
          onClick={fetchMyRequests}
          style={{
            ...styles.refreshButton,
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Requests"}
        </button>

        {loading && <p>Loading your requests...</p>}

        {error && (
          <div style={styles.emptyBox}>
            <p style={styles.error}>{error}</p>

            <button
              onClick={fetchMyRequests}
              style={styles.refreshButton}
            >
              Try Again
            </button>

            {!localStorage.getItem("access_token") && (
              <button
                onClick={() => navigate("/login")}
                style={styles.loginButton}
              >
                Login
              </button>
            )}
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div style={styles.emptyBox}>
            <h3>No food requests yet</h3>
            <p>Food requests you submit will appear here.</p>

            <button
              onClick={() => navigate("/find-food")}
              style={styles.refreshButton}
            >
              Find Food
            </button>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div style={styles.requestList}>
            {requests.map((request, index) => (
              <div
                key={request.request_id ?? request.id ?? index}
                style={styles.card}
              >
                <h2 style={styles.foodName}>
                  {request.food_name || "Food request"}
                </h2>

                <p>
                  <strong>Food location:</strong>{" "}
                  {request.food_location || "Not specified"}
                </p>

                <p>
                  <strong>Requested quantity:</strong>{" "}
                  {request.requested_quantity ?? "Not specified"}
                </p>

                <p>
                  <strong>Request status:</strong>{" "}
                  <span
                    style={{
                      ...styles.status,
                      ...getStatusStyle(request.status),
                    }}
                  >
                    {formatStatus(request.status)}
                  </span>
                </p>

                {request.message && (
                  <p>
                    <strong>Your message:</strong> {request.message}
                  </p>
                )}
                {request.request_id || request.id ? (
                  <button
                    onClick={() =>
                      navigate(`/chat/${request.request_id ?? request.id}`)
                    }
                    style={styles.chatButton}
                   >
                    Chat with Donor
                   </button>
                ) : null}
              </div>
            ))} 
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f8f4",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },

  heading: {
    color: "#1b4332",
    fontSize: "36px",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#666",
    fontSize: "16px",
    marginBottom: "20px",
  },

  refreshButton: {
    backgroundColor: "#237b4b",
    color: "white",
    border: "none",
    padding: "11px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "25px",
    fontWeight: "bold",
  },

  loginButton: {
    backgroundColor: "#174c35",
    color: "white",
    border: "none",
    padding: "11px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginLeft: "10px",
    fontWeight: "bold",
  },

  requestList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    borderLeft: "5px solid #2d6a4f",
    overflowWrap: "anywhere",
  },

  foodName: {
    color: "#1b4332",
    marginTop: "0",
    marginBottom: "18px",
  },

  status: {
    display: "inline-block",
    padding: "5px 12px",
    borderRadius: "20px",
    fontWeight: "bold",
    textTransform: "capitalize",
  },

  acceptedStatus: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },

  rejectedStatus: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },

  pendingStatus: {
    backgroundColor: "#fff1cf",
    color: "#8a5700",
  },

  error: {
    color: "#b00020",
  },

  emptyBox: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    color: "#666",
  },
  chatButton: {
  backgroundColor: "#1d6f42",
  color: "white",
  border: "none",
  padding: "11px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
  marginTop: "12px",
},
};
