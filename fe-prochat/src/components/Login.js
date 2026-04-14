import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, resetAuthState } from "../store/authSlice";
import { Lock, Mail, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      // Error message is handled in the UI
    }

    if (isSuccess || user) {
      navigate("/");
    }

    dispatch(resetAuthState());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-container w-full max-w-md p-10 animate-fade-in relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-200 text-transparent bg-clip-text mb-2">
            Pro-Chat
          </h1>
          <p className="text-slate-400">Login to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Mail size={16} /> Email Address
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Lock size={16} /> Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {isError && <p className="text-red-500 text-sm text-center">{message}</p>}

          <button type="submit" className="btn-primary mt-4" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin-slow" size={20} /> : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account? <Link to="/register" className="text-primary hover:text-primary-hover">Register</Link>
        </p>
      </div>
      
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
    </div>
  );
};

export default Login;
