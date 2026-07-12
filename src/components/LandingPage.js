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
                <span>Sign In</span>
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

        <section className="landing-how-it-works" aria-labelledby="landing-how-it-works-title">
          <div className="landing-how-shell">
            <div className="landing-how-head">
              <p className="landing-how-eyebrow">How It Works</p>
              <h2 id="landing-how-it-works-title" className="landing-how-title">The Sunday Cup in four steps</h2>
            </div>

            <div className="landing-how-grid">
              <HowStep
                number="01"
                title="Join your league"
                text="Get an invite code from your commissioner and enter the same private season as the rest of your group."
              />
              <HowStep
                number="02"
                title="Draft one golfer per tier"
                text="Before each Major, golfers are ranked by sportsbook odds and split into four tiers. The room drafts in snake order until every team has four golfers."
              />
              <HowStep
                number="03"
                title="Score the best 3 of 4 live"
                text="Each round counts your best three golfer scores and drops the highest one. Missed cuts turn into penalty rounds, and the leaderboard shows who won each round and who leads the event overall."
              />
              <HowStep
                number="04"
                title="Chase the season cup"
                text="Every completed Major adds to your annual total. Lowest tournament scores and lowest season score win."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-left">
          <div className="landing-footer-brand">THE SUNDAY CUP</div>
          <p className="landing-footer-copy">Members only. Sign in to access your league.</p>
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

const HowStep = ({ number, title, text }) => (
  <article className="landing-how-card">
    <div className="landing-how-number">{number}</div>
    <h3 className="landing-how-card-title">{title}</h3>
    <p className="landing-how-card-text">{text}</p>
  </article>
);

export default LandingPage;
