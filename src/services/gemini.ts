import { Job, AIResponse, JobCategory } from "../types";

const BACKEND_URL = "https://jkh-acts-backend.vercel.app/api/analyze";

async function callOpenAIBackend(prompt: string, imageBase64?: string): Promise<string> {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      imageBase64: imageBase64
        ? imageBase64.split(",")[1] || imageBase64
        : undefined,
      mimeType: "image/png",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Backend error:", errorText);
    throw new Error("Ошибка backend анализа");
  }

  const data = await response.json();
  return data.text || "";
}

function parseJsonFromText(text: string): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("Не найден JSON в ответе AI:", text);
      throw error;
    }

    return JSON.parse(match[0]);
  }
}

export const classifyJob = async (
  text: string
): Promise<{ category: JobCategory; checklist: string[] }> => {
  const prompt = `
Проанализируй текст заявки на работы в ЖКХ и определи категорию и чек-лист необходимых фото-доказательств.

Текст: "${text}"

Верни строго JSON без markdown и без пояснений:
{
  "category": "название из списка",
  "checklist": ["пункт 1", "пункт 2"]
}

Список категорий:
Сантехника, Электрика, Уборка/клининг, Общестрой, Двери/замки, Лифты, Отопление, Вентиляция, Фасад/кровля, Двор/территория, Другое.
`;

  try {
    const resultText = await callOpenAIBackend(prompt);
    const data = parseJsonFromText(resultText);

    return {
      category: data.category as JobCategory,
      checklist: data.checklist || [],
    };
  } catch (error) {
    console.error("Classification error:", error);

    return {
      category: JobCategory.OTHER,
      checklist: ["Общий план до", "Общий план после"],
    };
  }
};

export const analyzeSourcePhoto = async (
  base64Data: string
): Promise<{
  externalId: string;
  address: string;
  description: string;
  category: JobCategory;
}> => {
  const prompt = `
Проанализируй изображение заявки, скриншота или скана на работы в ЖКХ.

Извлеки следующие данные:
1. Номер заявки, если есть.
2. Адрес объекта.
3. Краткое описание проблемы.
4. Категория работ.

Категорию выбери из списка:
Сантехника, Электрика, Уборка/клининг, Общестрой, Двери/замки, Лифты, Отопление, Вентиляция, Фасад/кровля, Двор/территория, Другое.

Верни строго JSON без markdown и без пояснений:
{
  "externalId": "...",
  "address": "...",
  "description": "...",
  "category": "..."
}
`;

  try {
    const resultText = await callOpenAIBackend(prompt, base64Data);
    const data = parseJsonFromText(resultText);

    return {
      externalId:
        data.externalId || `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      address: data.address || "",
      description: data.description || "",
      category: (data.category || JobCategory.OTHER) as JobCategory,
    };
  } catch (error) {
    console.error("Source photo analysis error:", error);
    throw error;
  }
};

export const analyzeJobMedia = async (job: Job): Promise<AIResponse> => {
  const prompt = `
Ты — эксперт по техническому надзору в ЖКХ.

Проверь выполнение работ по заявке.

Данные заявки:
- ID заявки: ${job.id}
- Описание: ${job.description}
- Категория: ${job.category}
- Адрес: ${job.address}
- Исполнитель: ${job.performer}

Задание:
1. Проверь комплектность: минимум 1 фото ДО и 1 фото ПОСЛЕ.
2. Сравни фото ДО и ПОСЛЕ.
3. Опиши изменения.
4. Сформируй акт выполненных работ.
5. Сформируй отчет.
6. Если фото некачественные или не относятся к делу — укажи это.

Верни строго JSON без markdown и без пояснений в таком формате:
{
  "job_id": "${job.id}",
  "status": "approved / needs_review / rejected",
  "category_ru": "категория на русском",
  "confidence": "high / medium / low",
  "missing_evidence_ru": ["что отсутствует"],
  "checklist_ru": ["проверка 1", "проверка 2"],
  "before_after_changes_ru": ["изменение 1", "изменение 2"],
  "work_summary_ru": "краткое резюме выполненных работ",
  "materials_ru": [
    {
      "name": "материал",
      "qty": "количество",
      "unit": "единица"
    }
  ],
  "act_ru": {
    "title": "Акт выполненных работ",
    "job_details": ["деталь 1", "деталь 2"],
    "works_done": ["работа 1", "работа 2"],
    "dates": ["дата"],
    "performers": ["исполнитель"],
    "sign_fields": ["подпись заказчика", "подпись исполнителя"]
  },
  "report_ru": {
    "executive_summary": ["вывод 1", "вывод 2"],
    "photo_captions": ["подпись к фото 1", "подпись к фото 2"],
    "quality_notes": ["замечание 1", "замечание 2"]
  },
  "visual_aids": [
    {
      "type": "side_by_side",
      "caption_ru": "что нужно визуально сравнить",
      "image_base64_png": ""
    }
  ]
}
`;

  try {
    const firstBeforePhoto = job.photosBefore?.[0];
    const firstAfterPhoto = job.photosAfter?.[0];

    const imageForAnalysis = firstAfterPhoto || firstBeforePhoto;

    const resultText = await callOpenAIBackend(prompt, imageForAnalysis);
    const result = parseJsonFromText(resultText);

    return {
      ...result,
      job_id: job.id,
    };
  } catch (error) {
    console.error("AI Analysis error:", error);
    throw error;
  }
};
