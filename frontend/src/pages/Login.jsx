
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Mail, Lock, ArrowLeft } from "lucide-react";
import "../App.css";

const API_URL = "http://127.0.0.1:8001";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);

      const userResponse = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Could not retrieve account details");
      }

      const user = await userResponse.json();

      localStorage.setItem("user", JSON.stringify(user));

      // Redirect according to the user's registered role
      const role = String(user.role || "").toLowerCase();

      if (role === "donor") {
        navigate("/donor-requests");
      } else if (role === "receiver") {
        navigate("/find-food");
      } else if (role === "volunteer") {
        navigate("/volunteer-pickups");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link to="/" className="auth-back">
          <ArrowLeft size={18} /> Back to Home
        </Link>

        <div className="auth-brand">
          <span className="logo-icon">
            <Leaf size={25} />
          </span>
          Food <span className="green">Expiry Rescue</span>
        </div>

        <div className="auth-content">
          <span className="section-tag">WELCOME BACK</span>
          <h1>
            Together, we can
            <br />
            <span className="green">rescue more food.</span>
          </h1>

          <p>
            Sign in to find surplus food, donate meals, and make a
            difference in your community.
          </p>

          <div className="auth-image">
            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?w=900"
              alt="Healthy fresh food"
            />
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h2>Login to your account</h2>

          <p className="auth-subtitle">
            Enter your details to continue.
          </p>

          <form onSubmit={handleLogin}>
            <label>Email Address</label>

            <div className="auth-input">
              <Mail size={19} />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label>Password</label>

            <div className="auth-input">
              <Lock size={19} />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="error-message">{error}</p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="auth-switch">
              Don't have an account?{" "}
              <Link to="/register">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
