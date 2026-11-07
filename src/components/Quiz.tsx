import { useState } from "react";
import type { Quiz as QuizType } from "../data/curriculum";

interface Props {
  quiz: QuizType;
  /** Called when the visitor picks the right answer on their first attempt. */
  onAce?: () => void;
}

export function Quiz({ quiz, onAce }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const aced = answered && picked === quiz.answer;

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    if (i === quiz.answer) onAce?.();
  };

  return (
    <div className={"quiz" + (answered ? " answered" : "")}>
      <p className="q">{quiz.q}</p>
      {quiz.options.map((opt, i) => {
        let cls = "opt";
        if (answered && i === quiz.answer) cls += " correct";
        if (answered && i === picked && picked !== quiz.answer) cls += " wrong";
        return (
          <button key={i} className={cls} disabled={answered} onClick={() => pick(i)}>
            {opt}
          </button>
        );
      })}
      <div className={"explain" + (answered ? " show" : "")}>
        {aced && <b className="quiz-ace">🎯 First try! </b>}
        {quiz.explain}
      </div>
    </div>
  );
}
