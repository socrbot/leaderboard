// src/components/LandingPage.js
import React from 'react';
import './LandingPage.css';

/**
 * Landing page shown to unauthenticated users.
 * Graphic: SVG golf course illustration (open-source / self-contained, no external dependencies).
 */
const GolfCourseSVG = () => (
  <svg
    viewBox="0 0 400 260"
    className="landing-svg"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Sky */}
    <rect width="400" height="260" fill="#0d2b0d" rx="16" />

    {/* Distant hills */}
    <ellipse cx="80" cy="200" rx="120" ry="60" fill="#143d14" />
    <ellipse cx="320" cy="210" rx="130" ry="55" fill="#163916" />

    {/* Fairway */}
    <ellipse cx="200" cy="230" rx="160" ry="50" fill="#1a5c1a" />
    <ellipse cx="200" cy="240" rx="140" ry="38" fill="#1e6b1e" />

    {/* Green */}
    <ellipse cx="200" cy="210" rx="60" ry="22" fill="#22a822" opacity="0.9" />

    {/* Hole cup shadow */}
    <ellipse cx="200" cy="212" rx="5" ry="2" fill="#0a1a0a" />

    {/* Flag pole */}
    <line x1="200" y1="212" x2="200" y2="155" stroke="#e0e0e0" strokeWidth="1.5" />

    {/* Flag */}
    <polygon points="200,155 225,163 200,171" fill="#f87171" />

    {/* Stars */}
    {[
      [40, 30], [80, 20], [130, 40], [180, 18], [240, 28], [300, 15], [360, 35],
      [350, 60], [60, 55], [160, 50], [280, 50]
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="1.2" fill="rgba(255,255,255,0.55)" />
    ))}

    {/* Moon */}
    <circle cx="340" cy="40" r="18" fill="#f0e68c" opacity="0.35" />
    <circle cx="350" cy="36" r="15" fill="#0d2b0d" />

    {/* Sand bunker */}
    <ellipse cx="255" cy="218" rx="20" ry="8" fill="#c8b86a" opacity="0.75" />

    {/* Golf ball */}
    <circle cx="185" cy="209" r="4" fill="#ffffff" />
    <circle cx="185" cy="209" r="4" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
  </svg>
);

const LandingPage = ({ onSignIn, signingIn }) => {
  return (
    <div className="landing-root">
      <div className="landing-card">
        {/* Header brand — matches app header */}
        <div className="landing-brand">
          <span className="landing-golf-icon">⛳</span>
          <div>
            <h1 className="landing-title">Alumni Golf Tournament</h1>
            <p className="landing-subtitle">West Virginia</p>
          </div>
        </div>

        {/* Illustration */}
        <GolfCourseSVG />

        {/* Tagline */}
        <p className="landing-tagline">
          Track your league, your draft picks, and<br />
          every round in real time.
        </p>

        {/* Login button */}
        <button
          className="landing-login-btn"
          onClick={onSignIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <span className="landing-spinner" aria-label="Signing in…" />
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>

        <p className="landing-note">
          Members only &mdash; sign in with your invited Google account.
        </p>
      </div>
    </div>
  );
};

/* Inline Google "G" logo — no external image needed */
const GoogleIcon = () => (
  <svg className="landing-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default LandingPage;
