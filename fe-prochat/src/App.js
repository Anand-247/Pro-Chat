import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import { initNotifications } from "./services/notification";

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useSelector((state) => state.auth);
  
  if (isLoading) return null; // Or a loading spinner
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const { user } = useSelector((state) => state.auth);

  React.useEffect(() => {
    if (user) {
      initNotifications(user);
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
