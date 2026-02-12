// --- Generador de Guía de Estudio con estilo de IA ---
export const generateStudyGuide = (questions, examTitle) => {
    if (!questions || questions.length === 0) {
      return null;
    }
  
    // Usamos una lista de stop words mucho más completa para mejorar la calidad de los temas.
    const stopWords = new Set([
      'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra', 'cual', 'cuando', 'cuáles',
      'de', 'del', 'desde', 'donde', 'durante', 'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre',
      'era', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estas', 'este', 'esto', 'estos',
      'la', 'las', 'le', 'les', 'lo', 'los', 'mi', 'mis', 'mucho', 'muchos', 'muy', 'más', 'me', 'mi',
      'no', 'nos', 'nuestra', 'nuestras', 'nuestro', 'nuestros', 'o', 'os', 'otra', 'otras',
      'otro', 'otros', 'para', 'pero', 'por', 'porque', 'que', 'quien', 'quienes', 'qué', 'puede',
      'se', 'sea', 'sean', 'ser', 'si', 'sin', 'sino', 'sobre', 'su', 'sus', 'suya', 'suyas', 'suyo',
      'suyos', 'sí', 'también', 'te', 'ti', 'tiene', 'tienen', 'todo', 'todos', 'tu', 'tus', 'un',
      'una', 'uno', 'unos', 'usted', 'ustedes', 'y', 'ya', 'yo', 'son', 'del', 'qué', 'cuál', 'es', 'son', 'segun'
    ]);
    const wordCounts = {};
    const verbPattern = /\b(identificar|calcular|definir|explicar|seleccionar|aplicar|analizar|evaluar|describir|comparar)\b/gi;
    const actionVerbs = new Set();
  
    questions.forEach(q => {
      const text = q.text || '';
      const words = text.toLowerCase().replace(/[^a-záéíóúñü\s]/g, '').split(/\s+/);
      const matches = q.text.match(verbPattern);
      if (matches) matches.forEach(verb => actionVerbs.add(verb.toLowerCase()));
      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });
  
    const sortedKeywords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
    
    const numKeywords = Math.min(15, 5 + Math.floor(questions.length / 20));
    const mainTopicsCount = Math.max(3, Math.floor(numKeywords * 0.4));
    
    const mainTopics = sortedKeywords.slice(0, mainTopicsCount);
    const secondaryTopics = sortedKeywords.slice(mainTopicsCount, numKeywords);
  
    const exampleQuestions = questions.length > 1 
      ? [questions[Math.floor(questions.length / 3)], questions[Math.floor(questions.length * 2 / 3)]].filter(Boolean)
      : [questions[0]].filter(Boolean);
  
    // --- Construcción de la narrativa ---
    const formatList = (items) => {
      if (items.length === 0) return '';
      if (items.length === 1) return items[0];
      const last = items.pop();
      return `${items.join(', ')} y ${last}`;
    };
  
    let introduction = `Esta guía ha sido generada para ofrecerte una visión detallada de la evaluación "${examTitle}". El objetivo es que puedas enfocar tu preparación en las áreas de mayor relevancia.`;
  
    let coreConcepts = '';
    if (mainTopics.length > 0) {
      coreConcepts = `El núcleo de la evaluación girará en torno a tu comprensión de ${formatList(mainTopics)}. Es fundamental que domines estos conceptos, ya que constituyen la base sobre la cual se construirán la mayoría de las preguntas.`;
    }
  
    let complementaryTopics = '';
    if (secondaryTopics.length > 0) {
      complementaryTopics = `Además, se explorarán temas complementarios como ${formatList(secondaryTopics)}. Estos puntos ampliarán el alcance de la evaluación y se conectarán con los temas centrales, por lo que es importante que también los repases.`;
    }
  
    let skillsFocus = '';
    if (actionVerbs.size > 0) {
      skillsFocus = `Más allá de la memorización, se pondrá a prueba tu capacidad para ${formatList(Array.from(actionVerbs))}. Esto significa que deberás ser capaz de aplicar tu conocimiento para resolver problemas prácticos y analizar situaciones específicas.`;
    }
  
    let studyTips = `Para una preparación efectiva, te sugerimos crear resúmenes o mapas conceptuales que conecten los temas principales con los secundarios. Practica con ejercicios donde debas aplicar las habilidades mencionadas. ¡Mucho éxito!`;
  
    return {
      title: `Guía de Estudio para: ${examTitle}`,
      introduction,
      coreConcepts,
      complementaryTopics,
      skillsFocus,
      exampleQuestions: exampleQuestions.map(q => q.text),
      studyTips,
    };
  };