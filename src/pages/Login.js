import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect if user is already logged in and allowed
  useEffect(() => {
    if (user && user.isAllowed) {
      navigate('/');
    } else if (user && !user.isAllowed) {
      navigate('/access-denied');
    }
  }, [user, navigate]);

  const handleSignIn = async () => {
    if (isSigningIn) return; // Prevent multiple clicks

    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // The auth state change will handle navigation
    } catch (error) {
      console.error("Error signing in:", error);
      setIsSigningIn(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Hello Doc</h1>
        <p>Sign in to access the application</p>
        <button
          className="google-sign-in-button"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? "Signing in..." : (
            <>
              <img
                src="/google-logo.svg"
                alt="Google"
                className="google-icon"
              />
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Login;