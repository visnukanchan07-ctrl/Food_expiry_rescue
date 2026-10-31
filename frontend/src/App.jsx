
import { Routes, Route } from "react-router-dom";

// Main pages
import Home from "./Home";
import DonateFood from "./DonateFood";
import FindFood from "./FindFood";
import EmergencyAlerts from "./EmergencyAlerts";
import Notifications from "./Notifications";
import VolunteerPickup from "./VolunteerPickup.jsx";
import Chat from "./Chat.jsx";

// Pages inside src/pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyRequests from "./pages/MyRequests";
import DonorRequests from "./pages/DonorRequests";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/donate" element={<DonateFood />} />
      <Route path="/find-food" element={<FindFood />} />
      <Route path="/emergency-alerts" element={<EmergencyAlerts />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/my-requests" element={<MyRequests />} />
      <Route path="/donor-requests" element={<DonorRequests />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/volunteer-pickups" element={<VolunteerPickup />} />
      <Route path="/chat/:requestId" element={<Chat />} />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;
