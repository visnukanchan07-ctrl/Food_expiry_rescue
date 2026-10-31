
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8001";

function EmergencyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/food/emergency-alerts`
      );

      if (!response.ok) {
        throw new Error("Unable to load emergency alerts.");
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const formatRemainingTime = (hours) => {
    if (hours === null || hours === undefined) {
      return "Expiry time unknown";
    }

    if (hours <= 0) {
      return "Expired";
    }

    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes remaining`;
    }

    return `${hours} hours remaining`;
  };

  const formatExpiry = (expiryTime) => {
    if (!expiryTime) return "Not specified";

    return new Date(expiryTime).toLocaleString();
  };

  const getRiskClass = (level) => {
    if (level === "critical") return "critical";
    return "high";
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/" style={styles.backLink}>
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <ShieldAlert size={32} />
          </div>

          <div>
            <h1 style={styles.title}>Emergency Food Alerts</h1>
            <p style={styles.subtitle}>
              Rescue food donations that need urgent attention
              before their expiry time.
            </p>
          </div>
        </div>

        <div style={styles.summary}>
          <div>
            <div style={styles.summaryLabel}>Active emergency alerts</div>
            <div style={styles.summaryNumber}>{alerts.length}</div>
          </div>

          <button
            onClick={fetchAlerts}
            disabled={loading}
            style={styles.refreshButton}
          >
            <RefreshCw size={17} />
            {loading ? "Refreshing..." : "Refresh Alerts"}
          </button>
        </div>

        {loading && (
          <p style={styles.info}>Loading emergency alerts...</p>
        )}

        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={fetchAlerts} style={styles.retryButton}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div style={styles.empty}>
            <Package size={42} />
            <h2>No Emergency Alerts</h2>
            <p>
              Great news! There are currently no high-risk or
              critical food donations requiring emergency rescue.
            </p>
            <Link to="/find-food" style={styles.findLink}>
              Browse Available Food
            </Link>
          </div>
        )}

        {!loading && !error && alerts.length > 0 && (
          <div style={styles.alertList}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={styles.alertCard}
              >
                <div style={styles.cardTop}>
                  <div>
                    <span
                      style={{
                        ...styles.riskBadge,
                        ...(getRiskClass(alert.risk_level) === "critical"
                          ? styles.criticalBadge
                          : styles.highBadge),
                      }}
                    >
                      <AlertTriangle size={14} />
                      {alert.risk_level.toUpperCase()} RISK
                    </span>

                    <h2 style={styles.foodName}>
                      {alert.food_name}
                    </h2>
                  </div>

                  <div style={styles.score}>
                    <span style={styles.scoreNumber}>
                      {alert.risk_score ?? "—"}
                    </span>
                    <span style={styles.scoreLabel}>Risk score</span>
                  </div>
                </div>

                <p style={styles.message}>
                  <AlertTriangle size={16} />
                  {alert.alert_message}
                </p>

                <div style={styles.details}>
                  <div style={styles.detail}>
                    <Package size={17} />
                    <span>Quantity: {alert.quantity}</span>
                  </div>

                  <div style={styles.detail}>
                    <MapPin size={17} />
                    <span>{alert.location}</span>
                  </div>

                  <div style={styles.detail}>
                    <Clock size={17} />
                    <span>
                      {formatRemainingTime(alert.hours_remaining)}
                    </span>
                  </div>

                  <div style={styles.detail}>
                    <Clock size={17} />
                    <span>
                      Expires: {formatExpiry(alert.expiry_time)}
                    </span>
                  </div>
                </div>

                <Link to="/find-food" style={styles.actionLink}>
                  View Available Food
                </Link>
              </div>
            ))}
          </div>
        )}

        <p style={styles.footer}>
          These alerts are generated using expiry-time risk estimates.
          They are urgency indicators, not food-safety certifications.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f7f3",
    padding: "35px 18px",
    fontFamily: "Arial, sans-serif",
    color: "#24352a",
  },
  container: {
    maxWidth: "950px",
    margin: "0 auto",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#267344",
    textDecoration: "none",
    fontWeight: "600",
    marginBottom: "28px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "28px",
  },
  headerIcon: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "16px",
    borderRadius: "14px",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "30px",
    color: "#1d3827",
  },
  subtitle: {
    margin: 0,
    color: "#647568",
    lineHeight: 1.5,
  },
  summary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    background: "#ffffff",
    padding: "22px",
    borderRadius: "14px",
    marginBottom: "25px",
    boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
  },
  summaryLabel: {
    color: "#647568",
    fontSize: "14px",
  },
  summaryNumber: {
    fontSize: "34px",
    fontWeight: "bold",
    color: "#dc2626",
    marginTop: "5px",
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#237342",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "600",
  },
  info: {
    textAlign: "center",
    padding: "30px",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "18px",
    borderRadius: "10px",
  },
  retryButton: {
    display: "block",
    marginTop: "12px",
    padding: "9px 15px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  empty: {
    textAlign: "center",
    background: "white",
    borderRadius: "14px",
    padding: "45px 20px",
    color: "#647568",
  },
  findLink: {
    display: "inline-block",
    marginTop: "15px",
    background: "#237342",
    color: "white",
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: "8px",
  },
  alertList: {
    display: "grid",
    gap: "20px",
  },
  alertCard: {
    background: "white",
    borderRadius: "14px",
    padding: "23px",
    boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
    borderLeft: "5px solid #dc2626",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    alignItems: "flex-start",
  },
  riskBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  criticalBadge: {
    background: "#fee2e2",
    color: "#b91c1c",
  },
  highBadge: {
    background: "#ffedd5",
    color: "#c2410c",
  },
  foodName: {
    fontSize: "23px",
    margin: "12px 0",
    color: "#24352a",
  },
  score: {
    textAlign: "center",
    background: "#fff1f2",
    padding: "10px 14px",
    borderRadius: "10px",
    minWidth: "75px",
  },
  scoreNumber: {
    display: "block",
    fontSize: "25px",
    fontWeight: "bold",
    color: "#dc2626",
  },
  scoreLabel: {
    fontSize: "11px",
    color: "#647568",
  },
  message: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#b91c1c",
    background: "#fff1f2",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
  },
  details: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "15px",
    margin: "20px 0",
  },
  detail: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    color: "#526257",
    fontSize: "14px",
    overflowWrap: "anywhere",
  },
  actionLink: {
    display: "inline-block",
    background: "#237342",
    color: "white",
    textDecoration: "none",
    padding: "11px 16px",
    borderRadius: "8px",
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "#7b897e",
    fontSize: "12px",
    marginTop: "30px",
    lineHeight: 1.5,
  },
};

export default EmergencyAlerts;
