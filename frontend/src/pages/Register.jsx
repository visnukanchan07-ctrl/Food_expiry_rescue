
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Leaf,
  User,
  Mail,
  Lock,
  Phone,
  ArrowLeft,
} from "lucide-react";

import "../App.css";

const API_URL = "http://127.0.0.1:8001";

function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const form = event.currentTarget;

    const fullName = form.elements.fullname.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const phone = form.elements.phone.value.trim();
    const role = form.elements.role.value;
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    const userData = {
      full_name: fullName,
      email: email,
      phone: phone,
      role: role,
      password: password,
    };

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let message = data.detail || "Registration failed.";

        if (Array.isArray(message)) {
          message = message.map((item) => item.msg).join(", ");
        }

        throw new Error(message);
      }

      setSuccess("Account created successfully! Redirecting to login...");

      form.reset();

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.message ||
        "Could not connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-left">

        <Link to="/" className="auth-back">
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="auth-brand">
          <div className="logo-icon">
            <Leaf size={26} />
          </div>

          <span>
            Food <span className="green">Expiry Rescue</span>
          </span>
        </div>

        <div className="auth-content">

          <span className="section-tag">
            JOIN OUR COMMUNITY
          </span>

          <h1>
            Be a part of
            <br />
            <span className="green">something meaningful.</span>
          </h1>

          <p>
            Join our food rescue community and help
            connect surplus food with people who need it.
          </p>

          <div className="auth-image">
            <img
              src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85"
              alt="Healthy fresh food"
            />
          </div>

        </div>

        <p className="auth-footer">
          © 2026 Food Expiry Rescue
        </p>

      </div>

      <div className="auth-right">

        <div className="auth-form-container">

          <h2>Create an account</h2>

          <p className="auth-subtitle">
            Sign up and start rescuing food.
          </p>

          <form onSubmit={handleRegister}>

            <label htmlFor="fullname">
              Full Name
            </label>

            <div className="auth-input">
              <User size={19} />

              <input
                type="text"
                id="fullname"
                name="fullname"
                placeholder="Enter your full name"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <label htmlFor="register-email">
              Email Address
            </label>

            <div className="auth-input">
              <Mail size={19} />

              <input
                type="email"
                id="register-email"
                name="email"
                placeholder="Enter your email"
                required
              />
            </div>

            <label htmlFor="phone">
              Phone Number
            </label>

            <div className="auth-input">
              <Phone size={19} />

              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                minLength={10}
                maxLength={20}
                required
              />
            </div>

            <label htmlFor="role">
              Select Your Role
            </label>

            <select
              id="role"
              name="role"
              className="auth-select"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose your role
              </option>

              <option value="donor">
                Donor
              </option>

              <option value="receiver">
                Receiver
              </option>

              <option value="volunteer">
                Volunteer
              </option>
            </select>

            <label htmlFor="register-password">
              Password
            </label>

            <div className="auth-input">
              <Lock size={19} />

              <input
                type="password"
                id="register-password"
                name="password"
                placeholder="Create a password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>

            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <div className="auth-input">
              <Lock size={19} />

              <input
                type="password"
                id="confirm-password"
                name="confirmPassword"
                placeholder="Confirm your password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>

            {error && (
              <p style={styles.error}>
                {error}
              </p>
            )}

            {success && (
              <p style={styles.success}>
                {success}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

          </form>

          <div className="auth-switch">
            Already have an account?

            <Link to="/login">
              Login
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}

const styles = {
  error: {
    color: "#b42323",
    backgroundColor: "#fdecec",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "14px",
    marginTop: "12px",
  },
  success: {
    color: "#176b3a",
    backgroundColor: "#e4f5e9",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "14px",
    marginTop: "12px",
  },
};

export default Register;
