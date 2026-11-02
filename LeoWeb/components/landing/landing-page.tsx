"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Dumbbell,
  Layers3,
  Monitor,
  RotateCcw,
  Send,
  TrendingUp,
} from "lucide-react"
import { type Locale, type Messages } from "@/lib/i18n"
import { HeaderPreferences } from "./header-preferences"

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <Image
        className="brand-mascot"
        src="/brand/leo-web.png"
        alt=""
        width={873}
        height={724}
        sizes={small ? "42px" : "(max-width: 480px) 42px, 54px"}
        loading={small ? "lazy" : "eager"}
      />
      <span>
        Leo<span className="brand-light">Lifter</span>
        <span className="brand-period">.</span>
      </span>
    </span>
  )
}

function WorkoutPreview({ copy: d }: { copy: Messages }) {
  const [day, setDay] = useState(0)
  const [done, setDone] = useState<number[]>([])
  const days = [d.dayOne, d.dayTwo, d.dayThree]
  const workouts = [d.fullBody, d.upperBody, d.lowerBody]
  const exercises = [
    [d.ex1, d.ex2, d.ex3],
    [d.ex4, d.ex5, d.ex6],
    [d.ex7, d.ex8, d.ex9],
  ][day]
  return (
    <div className="preview-wrap" id="preview">
      <div className="preview-orbit orbit-one" aria-hidden="true" />
      <div className="preview-orbit orbit-two" aria-hidden="true" />
      <div className="workout-window">
        <div className="window-bar">
          <span className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>LeoLifter / {d.preview}</span>
          <Layers3 size={14} aria-hidden="true" />
        </div>
        <div className="workout-body">
          <div className="preview-label">
            <span className="live-dot" />
            {d.sample}
          </div>
          <div className="program-heading">
            <div>
              <span className="tiny-eyebrow">{d.week}</span>
              <h2>
                {d.foundation}
                <span>.</span>
              </h2>
              <p>{d.programNote}</p>
            </div>
            <div className="program-icon">
              <Dumbbell size={25} strokeWidth={1.6} />
            </div>
          </div>
          <div className="day-picker" role="group" aria-label={d.preview}>
            {days.map((name, index) => (
              <button
                key={name}
                aria-pressed={day === index}
                onClick={() => {
                  setDay(index)
                  setDone([])
                }}
              >
                <span className="day-number">0{index + 1}</span>
                <span>{name}</span>
                {day === index && <span className="day-dot" />}
              </button>
            ))}
          </div>
          <div className="session-heading">
            <h3>{workouts[day]}</h3>
            <span>
              <Dumbbell size={13} aria-hidden="true" /> 3
            </span>
          </div>
          <div className="exercise-list">
            {exercises.map((exercise, index) => (
              <button
                key={exercise}
                className={`exercise-row ${done.includes(index) ? "is-complete" : ""}`}
                role="checkbox"
                aria-checked={done.includes(index)}
                onClick={() =>
                  setDone(
                    done.includes(index)
                      ? done.filter((item) => item !== index)
                      : [...done, index]
                  )
                }
              >
                <span className="exercise-icon" aria-hidden="true">
                  <Dumbbell size={19} strokeWidth={1.5} />
                </span>
                <span className="exercise-text">
                  <strong>{exercise}</strong>
                  <span>
                    3 {d.sets} <span className="multiplication">×</span>{" "}
                    {index === 0 ? "8" : "10"} {d.reps}
                  </span>
                </span>
                <span className="exercise-check" aria-hidden="true">
                  {done.includes(index) && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>
          <div className="progress-heading">
            <span>{d.complete}</span>
            <span aria-live="polite">{done.length} / 3</span>
            <button onClick={() => setDone([])} aria-label={d.reset}>
              <RotateCcw size={13} />
            </button>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={d.complete}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={done.length}
          >
            <span style={{ width: `${(done.length / 3) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="preview-caption">
        <span className="caption-line" />
        {d.previewNote}
      </div>
      <div className="floating-note" aria-hidden="true">
        <span>↗</span>
        <svg viewBox="0 0 110 40">
          <path d="M3 33 18 28 30 30 44 19 57 23 70 12 82 17 107 3" />
        </svg>
      </div>
    </div>
  )
}

export function LandingPage({
  locale,
  copy: d,
}: {
  locale: Locale
  copy: Messages
}) {
  const features = [
    { Icon: Dumbbell, title: d.featureOne, body: d.featureOneBody },
    { Icon: Layers3, title: d.featureTwo, body: d.featureTwoBody },
    { Icon: TrendingUp, title: d.featureThree, body: d.featureThreeBody },
  ]
  return (
    <div className="landing" id="top">
      <a className="skip-link" href="#main">
        {d.skip}
      </a>
      <header className="site-header shell">
        <Link href={`/${locale}`} aria-label="LeoLifter">
          <Brand />
        </Link>
        <nav aria-label={d.navIdea}>
          <a href="#idea">{d.navIdea}</a>
          <a href="#preview">{d.navPreview}</a>
          <a href="#roadmap">{d.navRoadmap}</a>
        </nav>
        <div className="landing-account-actions">
          <Link
            className="landing-signin-link"
            href={`/${locale}/login`}
            prefetch={false}
          >
            {d.login.signIn}
          </Link>
          <Link
            className="landing-profile-link"
            href={`/${locale}/profile`}
            prefetch={false}
          >
            <span aria-hidden="true">↗</span>
            <span>{d.account.goToProfile}</span>
          </Link>
          <HeaderPreferences locale={locale} copy={d} />
        </div>
      </header>
      <main id="main">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="status-pill">
              <span className="live-dot" />
              {d.status}
              <span className="status-separator" />
              <span>01 / LeoLifter</span>
            </div>
            <p className="hero-eyebrow">{d.eyebrow}</p>
            <h1 id="hero-title">
              {d.heroOne}
              <br />
              <span>{d.heroTwo}</span>
            </h1>
            <p className="hero-intro">{d.intro}</p>
            <div className="hero-actions">
              <a className="cta-primary" href="#idea">
                {d.explore}
                <ArrowUpRight size={18} />
              </a>
              <a className="text-link" href="#roadmap">
                {d.roadmapLink}
                <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-note">
              <span className="platform-icons" aria-hidden="true">
                <Monitor size={14} />
                <span>+</span>
                <Send size={13} />
              </span>
              <span>{d.heroNote}</span>
            </div>
          </div>
          <WorkoutPreview copy={d} />
        </section>
        <section
          className="features shell section-space"
          id="idea"
          aria-labelledby="idea-title"
        >
          <div className="section-intro">
            <div>
              <p className="eyebrow">{d.featuresEyebrow}</p>
              <h2 id="idea-title">{d.featuresTitle}</h2>
            </div>
            <p>{d.featuresIntro}</p>
          </div>
          <div className="feature-grid">
            {features.map(({ Icon, title, body }, index) => (
              <article className="feature" key={title}>
                <div className="feature-top">
                  <span className="feature-icon">
                    <Icon size={22} strokeWidth={1.5} />
                  </span>
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          className="platform-section shell section-space"
          aria-labelledby="platform-title"
        >
          <div className="platform-card">
            <div className="platform-copy">
              <p className="eyebrow">{d.platformEyebrow}</p>
              <h2 id="platform-title">{d.platformTitle}</h2>
              <p>{d.platformBody}</p>
              <div className="platform-options">
                <div>
                  <Monitor size={20} />
                  <div>
                    <h3>{d.browser}</h3>
                    <p>{d.browserBody}</p>
                  </div>
                </div>
                <div>
                  <Send size={20} />
                  <div>
                    <h3>
                      {d.telegram}
                      <span className="planned-pill">{d.planned}</span>
                    </h3>
                    <p>{d.telegramBody}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="platform-art" aria-hidden="true">
              <div className="art-ring ring-one" />
              <div className="art-ring ring-two" />
              <div className="art-ring ring-three" />
              <div className="art-cross cross-one">+</div>
              <div className="art-cross cross-two">+</div>
              <div className="telegram-tile">
                <Send size={64} strokeWidth={1.1} />
              </div>
              <div className="browser-tile">
                <span className="mini-browser-bar">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="mini-browser-brand">
                  L<span>✳</span>
                </span>
                <span className="mini-browser-lines">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="mini-browser-check">
                  <Check size={12} />
                </span>
              </div>
              <span className="art-dot dot-one" />
              <span className="art-dot dot-two" />
              <span className="art-dot dot-three" />
            </div>
          </div>
        </section>
        <section
          className="roadmap shell section-space"
          id="roadmap"
          aria-labelledby="roadmap-title"
        >
          <div className="section-intro">
            <div>
              <p className="eyebrow">{d.roadmapEyebrow}</p>
              <h2 id="roadmap-title">{d.roadmapTitle}</h2>
            </div>
            <p>{d.roadmapIntro}</p>
          </div>
          <div className="roadmap-grid">
            {[
              { phase: d.now, title: d.stepOne, body: d.stepOneBody },
              { phase: d.next, title: d.stepTwo, body: d.stepTwoBody },
              { phase: d.later, title: d.stepThree, body: d.stepThreeBody },
            ].map((step, index) => (
              <article
                className={`roadmap-step ${index === 0 ? "current" : ""}`}
                key={step.title}
              >
                <div className="step-line">
                  <span className="step-circle">
                    {index === 0 ? <Check size={15} /> : `0${index + 1}`}
                  </span>
                  <span className="step-phase">{step.phase}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer shell">
        <Link href={`/${locale}`} aria-label="LeoLifter">
          <Brand small />
        </Link>
        <span>{d.footerLine}</span>
        <a href="#top">
          {d.backTop}
          <ArrowUp size={14} />
        </a>
      </footer>
    </div>
  )
}
