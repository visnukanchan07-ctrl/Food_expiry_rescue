
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8001";

export default function DonorRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingRequestId, setUpdatingRequestId] = useState(null);

  const handleUnauthorized = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const fetchRequests = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      setError("Please log in as a donor to view requests.");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/food/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load food requests.");
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
    fetchRequests();
  }, [fetchRequests]);

  async function updateRequestStatus(requestId, newStatus) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setUpdatingRequestId(requestId);
      setError("");

      const response = await fetch(
        `${API_URL}/food/requests/${requestId}/status?new_status=${encodeURIComponent(newStatus)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Could not update request status.");
      }

      setRequests((previousRequests) =>
        previousRequests.map((request) =>
          request.request_id === requestId
            ? { ...request, status: newStatus }
            : request
        )
      );
    } catch (err) {
      console.error("Error updating request:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setUpdatingRequestId(null);
    }
  }

  function getStatusStyle(status) {
    const value = String(status || "pending").toLowerCase();

    if (value === "accepted" || value === "approved") {
      return styles.acceptedStatus;
    }

    if (value === "rejected") {
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
        <h1 style={styles.heading}>Food Requests</h1>

        <p style={styles.subtitle}>
          View requests submitted by people interested in your donated food.
        </p>

        <button
          style={styles.refreshButton}
          onClick={fetchRequests}
          disabled={loading || updatingRequestId !== null}
        >
          {loading ? "Loading..." : "Refresh Requests"}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {loading && (
          <p style={styles.message}>Loading food requests...</p>
        )}

        {!loading && !error && requests.length === 0 && (
          <div style={styles.emptyBox}>
            <h3>No food requests yet</h3>
            <p>Requests for donated food will appear here.</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div style={styles.requestList}>
            {requests.map((request) => {
              const status = String(
                request.status || "pending"
              ).toLowerCase();

              const isUpdating =
                updatingRequestId === request.request_id;

              return (
                <div
                  key={request.request_id}
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
                    <strong>Receiver name:</strong>{" "}
                    {request.receiver_name || "Not specified"}
                  </p>

                  <p>
                    <strong>Phone:</strong>{" "}
                    {request.phone || "Not specified"}
                  </p>

                  <p>
                    <strong>Requested quantity:</strong>{" "}
                    {request.requested_quantity ?? "Not specified"}
                  </p>

                  {request.message && (
                    <p>
                      <strong>Message:</strong> {request.message}
                    </p>
                  )}

                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        ...styles.status,
                        ...getStatusStyle(status),
                      }}
                    >
                      {formatStatus(status)}
                    </span>
                  </p>

                  {status === "pending" && (
                    <div style={styles.buttonContainer}>
                      <button
                        style={styles.acceptButton}
                        onClick={() =>
                          updateRequestStatus(
                            request.request_id,
                            "accepted"
                          )
                        }
                        disabled={updatingRequestId !== null}
                      >
                        {isUpdating ? "Updating..." : "Accept Request"}
                      </button>

                      <button
                        style={styles.rejectButton}
                        onClick={() =>
                          updateRequestStatus(
                            request.request_id,
                            "rejected"
                          )
                        }
                        disabled={updatingRequestId !== null}
                      >
                        {isUpdating ? "Updating..." : "Reject Request"}
                      </button>
                    </div>
                  )}

                  {(status === "accepted" || status === "approved") && (
                    <button
                      style={styles.chatButton}
                      onClick={() =>
                        navigate(`/chat/${request.request_id}`)
                      }
                    >
                      Chat with Receiver
                    </button>
                  )}
                </div>
              );
            })}
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
    backgroundColor: "#237a4b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "25px",
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

  buttonContainer: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  acceptButton: {
    flex: "1",
    minWidth: "120px",
    backgroundColor: "#237a4b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  rejectButton: {
    flex: "1",
    minWidth: "120px",
    backgroundColor: "#b42323",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  chatButton: {
    width: "100%",
    backgroundColor: "#1d6f42",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "15px",
  },

  message: {
    color: "#555",
    fontSize: "16px",
  },

  error: {
    color: "#b00020",
    fontSize: "16px",
  },

  emptyBox: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    color: "#666",
  },
};
