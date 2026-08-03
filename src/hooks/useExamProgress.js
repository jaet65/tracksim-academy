import { useState, useEffect } from 'react';
import { auth } from '../firebase-config';

export const useExamProgress = (exam, examId, isFinished) => {
  const storageKey = `exam_progress_${auth.currentUser?.uid}_${examId}`;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const savedProgressJSON = localStorage.getItem(storageKey);
    if (savedProgressJSON) {
      const savedProgress = JSON.parse(savedProgressJSON);
      return savedProgress.currentQuestionIndex || 0;
    }
    return 0;
  });

  const [answers, setAnswers] = useState(() => {
    const savedProgressJSON = localStorage.getItem(storageKey);
    if (savedProgressJSON) {
      const savedProgress = JSON.parse(savedProgressJSON);
      return savedProgress.answers || {};
    }
    return {};
  });

  // Guardar progreso
  useEffect(() => {
    if (exam && !isFinished) {
      const progress = { currentQuestionIndex, answers };
      localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [currentQuestionIndex, answers, exam, isFinished, storageKey]);

  const handleSelectOption = (optionIndex) => {
    const question = exam.questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: question.originalIndexMap[optionIndex]
    }));
  };

  const clearProgress = () => localStorage.removeItem(storageKey);

  return { currentQuestionIndex, setCurrentQuestionIndex, answers, handleSelectOption, clearProgress };
};