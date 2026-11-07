import { useEffect, useRef } from "react";
import type { Module } from "../data/curriculum";
import { xpFor } from "../data/gamification";
import { Html, HtmlList } from "./Html";
import { CodeBlock } from "./CodeBlock";
import { Quiz } from "./Quiz";
import { ProjectCards } from "./ProjectCards";

interface Props {
  module: Module;
  index: number;
  total: number;
  done: boolean;
  onToggleDone: () => void;
  onAceQuiz: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** The next lesson is still sealed — mark this one complete to open it. */
  nextLocked?: boolean;
  onMap?: () => void;
  /** Hands this lesson's lab to the OpenClaw agent runner. */
  onRunLab?: () => void;
}

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h3>
        <span className="num">{num}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Lesson({
  module: m,
  index,
  total,
  done,
  onToggleDone,
  onAceQuiz,
  onPrev,
  onNext,
  nextLocked,
  onMap,
  onRunLab,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to top whenever the lesson changes.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    window.scrollTo(0, 0);
  }, [m.id]);

  let n = 0;

  return (
    <main className="content" ref={topRef}>
      <div className="lesson-head">
        <span className="eyebrow">
          {m.icon} · {m.group}
        </span>
        <h2>{m.title}</h2>
        <p className="tagline">{m.tagline}</p>
        <div className="pill-row">
          <span className="pill level">{m.level}</span>
          <span className="pill">⏱ {m.mins} min</span>
          <span className="pill">
            Lesson {index + 1} of {total}
          </span>
          <span className="pill pill-xp">⭐ +{xpFor(m)} XP</span>
          {onMap && (
            <button className="pill pill-map" onClick={onMap} title="Back to the journey map">
              🗺️ Map
            </button>
          )}
        </div>
      </div>

      <Section num={++n} title="What it is">
        <div className="prose">
          <Html html={m.whatItIs} />
          <div className="callout tip">
            <b>Mental model — </b>
            <Html html={m.mentalModel} as="span" />
          </div>
        </div>
      </Section>

      <Section num={++n} title="When to use it">
        <div className="card">
          <HtmlList items={m.whenToUse} />
        </div>
      </Section>

      {m.anatomy && (
        <Section num={++n} title="Where it lives">
          <div className="grid-2">
            <div className="card">
              <b>Location</b>
              <Html className="prose" html={m.anatomy.location} />
            </div>
            <div className="card">
              <b>Format</b>
              <Html className="prose" html={m.anatomy.format} />
            </div>
          </div>
        </Section>
      )}

      <Section num={++n} title="Create it — step by step">
        <HtmlList items={m.steps} className="steps" />
        <CodeBlock sample={m.code} />
        <CodeBlock sample={m.code2} />
      </Section>

      {m.projects && (
        <Section num={++n} title="Pick a project">
          <ProjectCards projects={m.projects} />
        </Section>
      )}

      <Section num={++n} title="In the enterprise">
        <div className="card">
          <HtmlList items={m.enterprise} />
        </div>
      </Section>

      <div className="section">
        <div className="lab">
          <h3>🧪 Hands-on lab — {m.lab.goal}</h3>
          <ol>
            {m.lab.steps.map((s, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
            ))}
          </ol>
          {onRunLab && (
            <button className="btn agent-run-btn" onClick={onRunLab}>
              🤖 Run this lab with OpenClaw
            </button>
          )}
        </div>
      </div>

      {m.pitfalls && (
        <Section num={++n} title="Pitfalls to avoid">
          <div className="callout warn">
            <HtmlList items={m.pitfalls} />
          </div>
        </Section>
      )}

      <Section num={++n} title="Check yourself">
        {/* keyed so each lesson gets a fresh, unanswered quiz */}
        <Quiz key={m.id} quiz={m.quiz} onAce={onAceQuiz} />
      </Section>

      <div className="lesson-foot">
        <button
          className="btn secondary"
          onClick={onPrev}
          disabled={index === 0}
          style={index === 0 ? { opacity: 0.4 } : undefined}
        >
          ← Previous
        </button>
        <button className={"btn" + (done ? " done-state" : "")} onClick={onToggleDone}>
          {done ? "✓ Completed" : `Mark complete · +${xpFor(m)} XP`}
        </button>
        <button
          className="btn secondary"
          onClick={onNext}
          disabled={index === total - 1 || !!nextLocked}
          title={nextLocked ? "Mark this lesson complete to unlock the next shrine" : undefined}
          style={index === total - 1 || nextLocked ? { opacity: 0.4 } : undefined}
        >
          {nextLocked ? "🔒 Next" : "Next →"}
        </button>
      </div>
    </main>
  );
}
