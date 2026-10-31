
import { Link } from "react-router-dom";

import {
  Heart,
  Utensils,
  MapPin,
  Clock,
  ArrowRight,
  Leaf,
  Users,
  Truck,
  ShieldCheck,
  Recycle,
  HandHeart,
  Search,
  Bell,
} from "lucide-react";

import "./App.css";

function Home() {
  return (
    <div className="website">

      {/* Navbar */}
      <nav className="navbar">

        <Link to="/" className="logo">
          <div className="logo-icon">
            <Leaf size={25} />
          </div>
          <span>
            Food<span className="green">Expiry Rescue</span>
          </span>
        </Link>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
        </div>

        <div className="nav-buttons">
          <Link to="/notifications" className="login-btn">
            <Bell size={16} /> Notifications
          </Link>

          <Link to="/emergency-alerts" className="login-btn">
            Emergency Alerts
          </Link>

          <Link to="/my-requests" className="login-btn">
            My Requests
          </Link>

          <Link to="/volunteer-pickups" className="login-btn">
            <Truck size={16} /> Volunteer Dashboard
          </Link>

          <Link to="/login" className="login-btn">
            Login
          </Link>

          <Link to="/register" className="signup-btn">
            Get Started
          </Link>
        </div>

      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">

        <div className="hero-content">

          <div className="hero-badge">
            <Leaf size={16} />
            <span>Fighting Food Waste Together</span>
          </div>

          <h1 className="hero-title">
            Good Food.
            <br />
            <span className="green">No Waste.</span>
            <br />
            More Hope.
          </h1>

          <p className="hero-description">
            Connect surplus food with people who need it.
            Rescue fresh food from going to waste and
            make a meaningful difference in your community.
          </p>

          <div className="hero-buttons">

            <Link to="/donate" className="primary-btn">
              Donate Food <ArrowRight size={18} />
            </Link>

            <Link to="/find-food" className="secondary-btn">
              <Search size={18} /> Find Food
            </Link>

          </div>

          <div className="hero-trust">
            <div className="trust-icon">
              <Heart size={18} />
            </div>

            <span>
              Every meal rescued makes a difference.
            </span>
          </div>

        </div>

        <div className="hero-image">

          <img
            src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85"
            alt="Fresh vegetables and healthy food"
          />

          <div className="floating-card food-card">

            <div className="floating-icon">
              <Utensils size={21} />
            </div>

            <div>
              <strong>Fresh food</strong>
              <p>Ready to rescue</p>
            </div>

          </div>

          <div className="floating-card impact-card">

            <div className="floating-icon">
              <Heart size={21} />
            </div>

            <div>
              <strong>Make an impact</strong>
              <p>One donation at a time</p>
            </div>

          </div>

        </div>

      </section>

      {/* Statistics */}
      <section className="stats">

        <div className="stat-item">
          <div className="stat-icon">
            <Utensils size={24} />
          </div>
          <div>
            <h2>10K+</h2>
            <p>Meals Rescued</p>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div>
            <h2>500+</h2>
            <p>Community Partners</p>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">
            <Truck size={24} />
          </div>
          <div>
            <h2>1K+</h2>
            <p>Food Donations</p>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon">
            <Recycle size={24} />
          </div>
          <div>
            <h2>5 Tons</h2>
            <p>Food Waste Prevented</p>
          </div>
        </div>

      </section>

      {/* About Section */}
      <section className="about-section" id="about">

        <div className="section-heading">
          <span className="section-tag">OUR MISSION</span>

          <h2>
            Turning surplus food into
            <span className="green"> something meaningful</span>
          </h2>

          <p>
            Food that could feed people is expiring unseen.
            We bring donors, receivers, and volunteers together
            to rescue surplus food before it goes to waste.
          </p>
        </div>

        <div className="mission-cards">

          <div className="mission-card">
            <div className="mission-icon">
              <HandHeart size={28} />
            </div>

            <h3>Donate Surplus Food</h3>

            <p>
              Restaurants, shops, and individuals can
              share their surplus food with nearby
              organizations.
            </p>
          </div>

          <div className="mission-card">
            <div className="mission-icon">
              <MapPin size={28} />
            </div>

            <h3>Find Food Nearby</h3>

            <p>
              Receivers can discover nearby food
              donations based on distance, quantity,
              and availability.
            </p>
          </div>

          <div className="mission-card">
            <div className="mission-icon">
              <ShieldCheck size={28} />
            </div>

            <h3>Rescue Food Safely</h3>

            <p>
              Track expiry times, pickup windows,
              and handover status to help ensure
              timely food rescue.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works */}
      <section className="how-section" id="how-it-works">

        <div className="section-heading">
          <span className="section-tag">HOW IT WORKS</span>

          <h2>
            A simple way to
            <span className="green"> rescue food</span>
          </h2>

          <p>
            Three simple steps to turn surplus food
            into a valuable resource.
          </p>
        </div>

        <div className="steps">

          <div className="step-card">
            <span className="step-number">01</span>

            <div className="step-icon">
              <Utensils size={27} />
            </div>

            <h3>List Surplus Food</h3>

            <p>
              Donors add food details, quantity,
              expiry time, and pickup location.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">02</span>

            <div className="step-icon">
              <Search size={27} />
            </div>

            <h3>Match & Request</h3>

            <p>
              Nearby receivers discover available
              food and request donations.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">03</span>

            <div className="step-icon">
              <Truck size={27} />
            </div>

            <h3>Pickup & Rescue</h3>

            <p>
              Volunteers and receivers coordinate
              pickup and complete the rescue.
            </p>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">

        <div className="section-heading">
          <span className="section-tag">OUR FEATURES</span>

          <h2>
            Smarter food rescue,
            <span className="green"> better impact</span>
          </h2>

          <p>
            Technology helps us rescue food faster
            and connect the right people.
          </p>
        </div>

        <div className="features-grid">

          <div className="feature-card">
            <Clock size={25} />
            <h3>Expiry Risk Score</h3>
            <p>
              Identify food that needs immediate
              pickup based on expiry urgency.
            </p>
          </div>

          <div className="feature-card">
            <MapPin size={25} />
            <h3>Food Rescue Map</h3>
            <p>
              Discover nearby surplus food and
              rescue opportunities.
            </p>
          </div>

          <div className="feature-card">
            <Heart size={25} />
            <h3>Emergency Alerts</h3>
            <p>
              Notify nearby receivers when
              food is approaching expiry.
            </p>
          </div>

          <div className="feature-card">
            <Bell size={25} />
            <h3>Food Alert Notifications</h3>
            <p>
              Get instant alerts about nearby surplus food,
              emergency donations, and food approaching
              expiry—even when you're away from the website.
            </p>
          </div>

          <div className="feature-card">
            <Users size={25} />
            <h3>Smart Matching</h3>
            <p>
              Match donations with receivers
              based on distance and capacity.
            </p>
          </div>

          <div className="feature-card">
            <Truck size={25} />
            <h3>Volunteer Pickup System</h3>

            <p>
              Volunteers can accept approved food pickup tasks,
              collect donations, and update delivery status
              to complete food rescue.
            </p>

            <Link to="/volunteer-pickups" className="login-btn">
              Open Volunteer Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </section>

      {/* Call To Action */}
      <section className="cta-section">

        <div>
          <span className="section-tag">BE PART OF THE CHANGE</span>

          <h2>
            Let's rescue food,
            <br />
            <span>together.</span>
          </h2>

          <p>
            Join our community and help make
            surplus food available to those
            who need it.
          </p>
        </div>

        <Link to="/register" className="cta-button">
          Get Started <ArrowRight size={18} />
        </Link>

      </section>

      {/* Footer */}
      <footer className="footer">

        <Link to="/" className="logo">
          <div className="logo-icon">
            <Leaf size={22} />
          </div>

          <span>
            Food<span className="green">Expiry Rescue</span>
          </span>
        </Link>

        <p>
          © 2026 Food-Expiry Rescue.
          Fighting food waste, one meal at a time.
        </p>

      </footer>

    </div>
  );
}

export default Home;
