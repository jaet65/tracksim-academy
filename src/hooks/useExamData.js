import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

const shuffleArrayWithMap = (array) => {
  const shuffledArray = [...array];
  const originalIndexMap = Array.from({ length: array.length }, (_, i) => i);

  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    [originalIndexMap[i], originalIndexMap[j]] = [originalIndexMap[j], originalIndexMap[i]];
  }
  return { shuffledArray, originalIndexMap };
};

export const useExamData = (id) => {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const docRef = doc(db, "exams", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const examData = docSnap.data();
          const processedQuestions = examData.questions.map(q => {
            const { shuffledArray, originalIndexMap } = shuffleArrayWithMap(q.options);
            return { ...q, shuffledOptions: shuffledArray, originalIndexMap };
          });
          setExam({ ...examData, questions: processedQuestions });
        } else {
          console.error("Examen no encontrado");
        }
      } catch (error) {
        console.error("Error obteniendo examen:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [id]);

  return { exam, loading };
};