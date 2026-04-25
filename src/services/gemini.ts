import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Job, JobStatus, AIResponse, JobCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const classifyJob = async (text: string): Promise<{ category: JobCategory; checklist: string[] }> => {
  const prompt = `Проанализируй текст заявки на работы в ЖКХ и определи категорию и чек-лист необходимых фото-доказательств.
  Текст: "${text}"
  
  Верни JSON: { "category": "название из списка", "checklist": ["пункт 1", "пункт 2"] }
  Список категорий: Сантехника, Электрика, Уборка/клининг, Общестрой, Двери/замки, Лифты, Отопление, Вентиляция, Фасад/кровля, Двор/территория, Другое.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["category", "checklist"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return {
      category: data.category as JobCategory,
      checklist: data.checklist || [],
    };
  } catch (error) {
    console.error("Classification error:", error);
    return { category: JobCategory.OTHER, checklist: ["Общий план до", "Общий план после"] };
  }
};

export const analyzeSourcePhoto = async (base64Data: string): Promise<Partial<Job>> => {
  const prompt = `Проанализируй изображение заявки/скриншота/скана на работы в ЖКХ.
  Извлеки следующие данные:
  1. Номер заявки (если есть)
  2. Адрес объекта
  3. Краткое описание проблемы
  4. Категория работ (выбери из: Сантехника, Электрика, Уборка/клининг, Общестрой, Двери/замки, Лифты, Отопление, Вентиляция, Фасад/кровля, Двор/территория, Другое)
  
  Верни строго JSON: { "externalId": "...", "address": "...", "description": "...", "category": "..." }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: base64Data.split(",")[1] || base64Data } },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            externalId: { type: Type.STRING },
            address: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["address", "description", "category"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return {
      externalId: data.externalId || `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      address: data.address,
      description: data.description,
      category: data.category as JobCategory,
    };
  } catch (error) {
    console.error("Source photo analysis error:", error);
    throw error;
  }
};

export const analyzeJobMedia = async (job: Job): Promise<AIResponse> => {
  const beforeParts = job.photosBefore.map((data) => ({
    inlineData: { mimeType: "image/png", data: data.split(",")[1] || data },
  }));
  const afterParts = job.photosAfter.map((data) => ({
    inlineData: { mimeType: "image/png", data: data.split(",")[1] || data },
  }));

  const prompt = `Ты — эксперт по техническому надзору в ЖКХ. Проверь выполнение работ по заявке.
  Заявка: ${job.description}
  Категория: ${job.category}
  Адрес: ${job.address}
  Исполнитель: ${job.performer}
  
  Задание:
  1. Проверь комплектность (минимум 1 фото ДО и 1 фото ПОСЛЕ).
  2. Сравни фото ДО и ПОСЛЕ. Опиши изменения.
  3. Сформируй акт выполненных работ и отчет.
  4. Если фото некачественные или не относятся к делу — укажи это.
  5. Верни строго JSON по заданному формату.
  
  ВАЖНО: В поле visual_aids ты должен сгенерировать описание для side_by_side сравнения. 
  Так как ты не можешь рисовать, в image_base64_png просто верни пустую строку, я обработаю это на фронтенде, НО опиши что именно нужно выделить в caption_ru.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          ...beforeParts,
          ...afterParts,
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            job_id: { type: Type.STRING },
            status: { type: Type.STRING },
            category_ru: { type: Type.STRING },
            confidence: { type: Type.STRING },
            missing_evidence_ru: { type: Type.ARRAY, items: { type: Type.STRING } },
            checklist_ru: { type: Type.ARRAY, items: { type: Type.STRING } },
            before_after_changes_ru: { type: Type.ARRAY, items: { type: Type.STRING } },
            work_summary_ru: { type: Type.STRING },
            materials_ru: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  qty: { type: Type.STRING },
                  unit: { type: Type.STRING },
                },
              },
            },
            act_ru: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                job_details: { type: Type.ARRAY, items: { type: Type.STRING } },
                works_done: { type: Type.ARRAY, items: { type: Type.STRING } },
                dates: { type: Type.ARRAY, items: { type: Type.STRING } },
                performers: { type: Type.ARRAY, items: { type: Type.STRING } },
                sign_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
            report_ru: {
              type: Type.OBJECT,
              properties: {
                executive_summary: { type: Type.ARRAY, items: { type: Type.STRING } },
                photo_captions: { type: Type.ARRAY, items: { type: Type.STRING } },
                quality_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
            visual_aids: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  caption_ru: { type: Type.STRING },
                  image_base64_png: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      ...result,
      job_id: job.id,
    };
  } catch (error) {
    console.error("AI Analysis error:", error);
    throw error;
  }
};
