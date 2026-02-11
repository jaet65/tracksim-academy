import { useState, useEffect } from 'react';
import { auth } from '../firebase-config';

export const useExamProgress = (exam, examId, isFinished) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const storageKey = `exam_progress_${auth.currentUser?.uid}_${examId}`;

  // Restaurar progreso
  useEffect(() => {
    if (exam) {
      const savedProgressJSON = localStorage.getItem(storageKey);
      if (savedProgressJSON) {
        const savedProgress = JSON.parse(savedProgressJSON);
        setAnswers(savedProgress.answers || {});
        setCurrentQuestionIndex(savedProgress.currentQuestionIndex || 0);
      }
    }
  }, [exam, storageKey]);

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