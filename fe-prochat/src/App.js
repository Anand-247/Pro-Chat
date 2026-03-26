import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import { store } from "./store";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useSelector((state) => state.auth);
  
  if (isLoading) return null; // Or a loading spinner
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <Provider store={store}>
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
    </Provider>
  );
}

export default App;
