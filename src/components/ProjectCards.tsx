import type { Project } from "../data/curriculum";
import { HtmlList } from "./Html";

export function ProjectCards({ projects }: { projects: Project[] }) {
  return (
    <div className="project-grid">
      {projects.map((p, i) => (
        <div className="project-card" key={i}>
          <div className="project-level">{p.level}</div>
          <h4>{p.title}</h4>
          <p className="project-problem">{p.problem}</p>
          {p.stack && (
            <div className="project-stack">
              <b>Stack</b>{" "}
              {p.stack.map((s, j) => (
                <span className="stack-tag" key={j}>
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="project-feat">
            {p.features.map((f, j) => (
              <span className="feat-tag" key={j}>
                {f}
              </span>
            ))}
          </div>
          <div className="project-accept">
            <b>Deliverables:</b>
            <HtmlList items={p.acceptance} />
          </div>
        </div>
      ))}
    </div>
  );
}
