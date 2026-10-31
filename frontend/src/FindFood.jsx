
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8001";

export default function FindFood() {
  const navigate = useNavigate();

  const [foodItems, setFoodItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFood, setSelectedFood] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [message, setMessage] = useState("");

  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState("");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    fetchFood();
  }, []);

  // Load food with expiry risk scores
  async function fetchFood() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/food/recommendations`
      );

      if (!response.ok) {
        throw new Error("Could not load food items. Please try again.");
      }

      const data = await response.json();

      if (!Array.isArray(data.recommendations)) {
        throw new Error("Unexpected response from the server.");
      }

      setFoodItems(data.recommendations);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  // Open food request form
  function openRequestForm(food) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setRequestError("Please login as a receiver before requesting food.");
      navigate("/login");
      return;
    }

    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);

        if (user.role !== "receiver") {
          setRequestError("Only receiver accounts can request food.");
          return;
        }
      } catch {
        setRequestError("Please login again.");
        return;
      }
    }

    setSelectedFood(food);
    setReceiverName("");
    setPhone("");
    setRequestedQuantity("");
    setMessage("");
    setRequestSuccess("");
    setRequestError("");
  }

  // Close request form
  function closeRequestForm() {
    if (requestLoading) return;

    setSelectedFood(null);
    setRequestSuccess("");
    setRequestError("");
  }

  // Submit food request
  async function submitRequest(event) {
    event.preventDefault();

    if (!selectedFood) return;

    const token = localStorage.getItem("access_token");

    if (!token) {
      setRequestError("Your login session has expired. Please login again.");
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    if (
      !receiverName.trim() ||
      !phone.trim() ||
      !requestedQuantity.trim()
    ) {
      setRequestError("Please complete all required fields.");
      return;
    }

    try {
      setRequestLoading(true);
      setRequestError("");
      setRequestSuccess("");

      const response = await fetch(
        `${API_URL}/food/${selectedFood.id}/requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiver_name: receiverName.trim(),
            phone: phone.trim(),
            quantity: requestedQuantity.trim(),
            message: message.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");

          throw new Error(
            "Your login session has expired. Please login again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Your account is not authorized to request food."
          );
        }

        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not submit your food request."
        );
      }

      setRequestSuccess(
        "Your food request has been submitted successfully!"
      );

      setReceiverName("");
      setPhone("");
      setRequestedQuantity("");
      setMessage("");
    } catch (err) {
      setRequestError(
        err.message ||
          "Something went wrong while submitting your request."
      );
    } finally {
      setRequestLoading(false);
    }
  }

  // Search food by name or location
  const filteredFood = foodItems.filter((food) => {
    const searchText = search.toLowerCase();

    return (
      food.food_name?.toLowerCase().includes(searchText) ||
      food.location?.toLowerCase().includes(searchText) ||
      food.description?.toLowerCase().includes(searchText)
    );
  });

  // Format expiry date
  function formatExpiry(expiryTime) {
    if (!expiryTime) return "Not specified";

    const date = new Date(expiryTime);

    if (Number.isNaN(date.getTime())) {
      return "Invalid expiry date";
    }

    return date.toLocaleString();
  }

  // Get risk badge class
  function getRiskClass(level) {
    const validLevels = [
      "low",
      "medium",
      "high",
      "critical",
      "expired",
    ];

    return validLevels.includes(level) ? level : "unknown";
  }

  return (
    <div className="find-food-page">
      <style>{`
        .find-food-page {
          min-height: 100vh;
          background: #f4f8f4;
          padding: 40px 20px;
          font-family: Arial, sans-serif;
          color: #183b2b;
        }

        .find-food-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .find-food-hero {
          background: #174c35;
          color: white;
          padding: 40px;
          border-radius: 20px;
          margin-bottom: 30px;
        }

        .find-food-hero h1 {
          margin: 0 0 12px;
          font-size: 36px;
        }

        .find-food-hero p {
          margin: 0;
          font-size: 17px;
          line-height: 1.6;
        }

        .find-food-search {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          margin-bottom: 25px;
          border: 1px solid #cbd8ce;
          border-radius: 10px;
          font-size: 16px;
          outline: none;
        }

        .find-food-search:focus {
          border-color: #237a4b;
          box-shadow: 0 0 0 3px rgba(35, 122, 75, 0.12);
        }

        .find-food-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 22px;
        }

        .food-card {
          background: white;
          border: 1px solid #e0e9e1;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 5px 16px rgba(20, 60, 35, 0.06);
        }

        .food-card h2 {
          margin: 0 0 12px;
          font-size: 22px;
          color: #174c35;
        }

        .food-card p {
          margin: 9px 0;
          line-height: 1.5;
          color: #42574a;
          overflow-wrap: anywhere;
        }

        .food-badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          background: #e0f4e5;
          color: #176333;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 12px;
        }

        .food-badge.low {
          background: #e0f4e5;
          color: #176333;
        }

        .food-badge.medium {
          background: #fff1cf;
          color: #8a5700;
        }

        .food-badge.high {
          background: #ffe1c2;
          color: #a34b00;
        }

        .food-badge.critical,
        .food-badge.expired {
          background: #ffe0e0;
          color: #a32222;
        }

        .food-badge.unknown {
          background: #e9eee9;
          color: #42574a;
        }

        .risk-details {
          padding: 10px;
          background: #f5f8f5;
          border-radius: 8px;
          margin: 12px 0;
        }

        .request-food-button {
          width: 100%;
          border: none;
          border-radius: 9px;
          background: #237a4b;
          color: white;
          padding: 13px;
          margin-top: 15px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
        }

        .request-food-button:hover {
          background: #185e38;
        }

        .food-message {
          background: white;
          padding: 18px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .request-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 1000;
        }

        .request-modal {
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          padding: 26px;
          box-sizing: border-box;
        }

        .request-modal h2 {
          margin-top: 0;
          color: #174c35;
        }

        .request-modal label {
          display: block;
          margin-top: 14px;
          margin-bottom: 6px;
          font-weight: bold;
          color: #294c38;
        }

        .request-modal input,
        .request-modal textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 11px;
          border: 1px solid #cbd8ce;
          border-radius: 8px;
          font-size: 15px;
        }

        .request-modal textarea {
          min-height: 90px;
          resize: vertical;
        }

        .request-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .request-modal-actions button {
          flex: 1;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 15px;
          cursor: pointer;
        }

        .submit-request-button {
          background: #237a4b;
          color: white;
        }

        .cancel-request-button {
          background: #e9eee9;
          color: #294c38;
        }

        .request-modal-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .request-success {
          background: #e0f4e5;
          color: #176333;
          padding: 12px;
          border-radius: 8px;
          margin-top: 15px;
        }

        .request-error {
          background: #ffe5e5;
          color: #a32222;
          padding: 12px;
          border-radius: 8px;
          margin-top: 15px;
        }

        @media (max-width: 600px) {
          .find-food-hero {
            padding: 25px;
          }

          .find-food-hero h1 {
            font-size: 28px;
          }

          .request-modal {
            padding: 20px;
          }
        }
      `}</style>

      <div className="find-food-container">
        <div className="find-food-hero">
          <h1>Find Available Food</h1>
          <p>
            Discover food donated by people in your community.
            Request what you need and help reduce food waste.
          </p>
        </div>

        <input
          className="find-food-search"
          type="text"
          placeholder="Search food name or location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loading && (
          <div className="food-message">
            Loading available food...
          </div>
        )}

        {error && (
          <div className="food-message" style={{ color: "red" }}>
            {error}
            <button
              onClick={fetchFood}
              style={{ marginLeft: 12, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredFood.length === 0 && (
          <div className="food-message">
            {search
              ? "No food matches your search."
              : "No available food found."}
          </div>
        )}

        {!loading && !error && (
          <div className="find-food-grid">
            {filteredFood.map((food) => (
              <div className="food-card" key={food.id}>
                <span className={`food-badge ${getRiskClass(food.risk_level)}`}>
                  {food.risk_level
                    ? `${food.risk_level.toUpperCase()} RISK`
                    : "RISK UNKNOWN"}
                </span>

                <h2>{food.food_name}</h2>

                <div className="risk-details">
                  <p>
                    <strong>Expiry Risk Score:</strong>{" "}
                    {food.risk_score !== null &&
                    food.risk_score !== undefined
                      ? `${food.risk_score}/100`
                      : "Not available"}
                  </p>

                  <p>
                    <strong>Time Remaining:</strong>{" "}
                    {food.hours_remaining !== null &&
                    food.hours_remaining !== undefined
                      ? `${food.hours_remaining} hours`
                      : "Not specified"}
                  </p>

                  <p>
                    <strong>Priority:</strong>{" "}
                    {food.recommendation_reason ||
                      "No recommendation available"}
                  </p>
                </div>

                <p>
                  <strong>Quantity:</strong> {food.quantity}
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {food.location || "Not specified"}
                </p>

                <p>
                  <strong>Description:</strong>{" "}
                  {food.description || "No description provided"}
                </p>

                <p>
                  <strong>Expires:</strong>{" "}
                  {formatExpiry(food.expiry_time)}
                </p>

                <button
                  className="request-food-button"
                  onClick={() => openRequestForm(food)}
                >
                  Request Food
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFood && (
        <div
          className="request-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRequestForm();
            }
          }}
        >
          <div className="request-modal">
            <h2>Request {selectedFood.food_name}</h2>

            <p>
              Fill in your details to send a request for this food.
            </p>

            <form onSubmit={submitRequest}>
              <label htmlFor="receiverName">Your name</label>
              <input
                id="receiverName"
                type="text"
                value={receiverName}
                onChange={(event) =>
                  setReceiverName(event.target.value)
                }
                minLength={2}
                maxLength={100}
                required
              />

              <label htmlFor="receiverPhone">Phone number</label>
              <input
                id="receiverPhone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                minLength={10}
                maxLength={20}
                required
              />

              <label htmlFor="requestedQuantity">
                Quantity you need
              </label>
              <input
                id="requestedQuantity"
                type="text"
                value={requestedQuantity}
                onChange={(event) =>
                  setRequestedQuantity(event.target.value)
                }
                maxLength={100}
                placeholder="Example: 2 packets"
                required
              />

              <label htmlFor="requestMessage">
                Message (optional)
              </label>
              <textarea
                id="requestMessage"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={500}
                placeholder="Add any extra details..."
              />

              {requestSuccess && (
                <div className="request-success">
                  {requestSuccess}
                </div>
              )}

              {requestError && (
                <div className="request-error">
                  {requestError}
                </div>
              )}

              <div className="request-modal-actions">
                <button
                  className="cancel-request-button"
                  type="button"
                  onClick={closeRequestForm}
                  disabled={requestLoading}
                >
                  Close
                </button>

                <button
                  className="submit-request-button"
                  type="submit"
                  disabled={requestLoading}
                >
                  {requestLoading
                    ? "Submitting..."
                    : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
