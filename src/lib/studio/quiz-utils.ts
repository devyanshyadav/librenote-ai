export interface QuizAnswer {
  deckIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
}

export function getQuizAccuracy(answers: QuizAnswer[], totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  return Math.round((correctCount / totalQuestions) * 100);
}

export function getQuizAverageTime(answers: QuizAnswer[]) {
  if (answers.length === 0) {
    return 0;
  }

  const totalTime = answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
  return Math.round(totalTime / answers.length);
}

export function getQuizRank(accuracy: number) {
  if (accuracy === 100) {
    return { title: "Grandmaster 🏆", color: "text-amber-500" };
  }
  if (accuracy >= 80) {
    return { title: "Scholar 🎓", color: "text-sky-500" };
  }
  if (accuracy >= 50) {
    return { title: "Apprentice 📖", color: "text-emerald-500" };
  }
  return { title: "Initiate 🎯", color: "text-muted-foreground" };
}
