
export interface ExamConfig {
  level: string; // 'Primary' | 'Middle School' | 'High School'
  gradeLevel: string;
  examType: string;
  topic: string;
  trendingTopic: string;
  matrixContent: string;
  specificationContent: string;
  structureContent: string; // New field for target exam structure
  referenceContent?: string; 
}

export interface QuestionPart {
  label: string; 
  content: string;
  points?: string;
}

export interface Question {
  id: string; 
  text: string;
  points: number;
  parts?: QuestionPart[];
  level?: string; 
}

export interface ExamSection {
  section: string; 
  text?: string;
  source?: string;
  questions: Question[];
}

export interface AnswerKey {
  questionId: string;
  answer: string;
  pointsDetail: string;
}

export interface ExamData {
  examTitle: string;
  duration: string;
  content: ExamSection[];
  answers: AnswerKey[];
  matrixMapping?: string[];
}

export enum AppView {
  INPUT = 'INPUT',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
}

export type ProgressCallback = (message: string) => void;
