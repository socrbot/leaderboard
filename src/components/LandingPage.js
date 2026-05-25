// src/components/LandingPage.js
import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onSignIn, signingIn }) => {
  return (
    <div className="landing-page">
      <main className="landing-main">
        <section className="landing-hero">
          <img
            className="landing-hero-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4xAretQ8E1xkfPFGJdial2YT2fyjh07X5gLCGwJrEZsBZOHeeOVVQ40tuVXl4Jm6S3OPJIbc0tBsQ7LNneA39-udcw7nBDp7tMHOSRjPm7CuRKgF6GlRgFiX_YhpcMsEsKevd3qHdh5T558VXQVKlWhtG1d6uIzmiONSP5dQLfS5qiYqzH0xFOeT-ZG_3_qacUljcdmWS6wSPNiNdfzMxDC32t38IOxkGORINUp9RGR6xe-ce12TSDwaXIJIveP6QqQ3wKxRq1ow"
            alt="The Sunday Cup"
          />
          <div className="landing-hero-gradient" />

          <div className="landing-hero-content">
            <h1 className="landing-hero-title">The Sunday Cup</h1>

            <button
              className="landing-google-btn"
              onClick={onSignIn}
              disabled={signingIn}
            >
              {signingIn ? (
                <span className="landing-spinner" aria-label="Signing in" />
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section className="landing-bento">
          <FeatureCard
            tone="primary"
            badge="LIVE"
            title="Rivalry On. Scores Live."
            text="Draft with friends and track every Major as the leaderboard shifts in real time."
          />
          <FeatureCard
            tone="secondary"
            badge="DRAFT"
            title="Every Major Moves the Race."
            text="Each event adds to your season total, and the lowest score takes the crown."
          />
          <FeatureCard
            tone="tertiary"
            badge="SEASON"
            title="Fast Setup. Fierce Competition."
            text="Start a league, invite your crew, draft in minutes, and let live scoring do the rest."
          />
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-left">
          <div className="landing-footer-brand">THE SUNDAY CUP</div>
          <p className="landing-footer-copy">Members only. Use your invited Google account.</p>
        </div>

        <nav className="landing-footer-links" aria-label="Landing footer links">
          <button type="button" className="landing-footer-link">Privacy</button>
          <button type="button" className="landing-footer-link">Terms</button>
          <button type="button" className="landing-footer-link">Support</button>
        </nav>
      </footer>
    </div>
  );
};

const FeatureCard = ({ tone, badge, title, text }) => (
  <article className={`landing-feature-card ${tone}`}>
    <div className="landing-feature-badge">{badge}</div>
    <h2 className="landing-feature-title">{title}</h2>
    <p className="landing-feature-text">{text}</p>
  </article>
);

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
