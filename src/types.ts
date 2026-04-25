import { GoogleGenAI, Type } from "@google/genai";

export enum JobStatus {
  DRAFT = "draft",
  NEEDS_MORE_EVIDENCE = "needs_more_evidence",
  READY_FOR_REVIEW = "ready_for_review",
  ACCEPTED = "accepted",
  REWORK = "rework",
}

export enum JobCategory {
  PLUMBING = "Сантехника",
  ELECTRICAL = "Электрика",
  CLEANING = "Уборка/клининг",
  CONSTRUCTION = "Общестрой",
  DOORS = "Двери/замки",
  ELEVATORS = "Лифты",
  HEATING = "Отопление",
  VENTILATION = "Вентиляция",
  FACADE = "Фасад/кровля",
  YARD = "Двор/территория",
  OTHER = "Другое",
}

export interface Material {
  name: string;
  qty: string;
  unit: string;
}

export interface AIResponse {
  job_id: string;
  status: JobStatus;
  category_ru: string;
  confidence: "low" | "medium" | "high";
  missing_evidence_ru: string[];
  checklist_ru: string[];
  before_after_changes_ru: string[];
  work_summary_ru: string;
  materials_ru: Material[];
  act_ru: {
    title: string;
    job_details: string[];
    works_done: string[];
    dates: string[];
    performers: string[];
    sign_fields: string[];
  };
  report_ru: {
    executive_summary: string[];
    photo_captions: string[];
    quality_notes: string[];
  };
  visual_aids: {
    type: "annotated_before" | "annotated_after" | "side_by_side";
    caption_ru: string;
    image_base64_png: string;
  }[];
}

export interface Job {
  id: string;
  externalId: string;
  address: string;
  category: JobCategory;
  description: string;
  dateCreated: string;
  dateCompleted?: string;
  performer: string;
  status: JobStatus;
  photosBefore: string[]; // base64
  photosAfter: string[]; // base64
  sourcePhoto?: string; // base64 (scan or screenshot of request)
  materials: Material[];
  comment?: string;
  aiAnalysis?: AIResponse;
}
