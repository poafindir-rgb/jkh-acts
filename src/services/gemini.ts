import { Job, AIResponse, JobCategory } from "../types";

const BACKEND_URL = "https://jkh-acts-backend.vercel.app/api/analyze";

type BackendImage = {
  label: string;
  imageBase64: string;
  mimeType?: string;
};

function normalizeBase64(data: string): string {
  if (!data) return "";
  return data.includes(",") ? data.split(",")[1] : data;
}

async function callOpenAIBackend(
  prompt: string,
  images: BackendImage[] = []
): Promise<string> {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      images: images.map((img) => ({
        label: img.label,
        imageBase64: normalizeBase64(img.imageBase64),
        mimeType: img.mimeType || "image/png",
      })),
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
  const cleanText = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    const match = cleanText.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("Не найден JSON в ответе AI:", cleanText);
      throw error;
    }

    return JSON.parse(match[0]);
  }
}

export const classifyJob = async (
  text: string
): Promise<{ category: JobCategory; checklist: string[] }> => {
  const prompt = `
Ты — AI-помощник для управляющей компании.

Проанализируй текст заявки на работы в ЖКХ и определи категорию работ и чек-лист необходимых фото-доказательств.

Текст заявки:
"${text}"

Категорию выбери строго из списка:
Сантехника, Электрика, Уборка/клининг, Общестрой, Двери/замки, Лифты, Отопление, Вентиляция, Фасад/кровля, Двор/территория, Другое.

Верни строго JSON без markdown и без пояснений:
{
  "category": "название категории",
  "checklist": ["пункт 1", "пункт 2"]
}
`;

  try {
    const resultText = await callOpenAIBackend(prompt);
    const data = parseJsonFromText(resultText);

    return {
      category: (data.category || JobCategory.OTHER) as JobCategory,
      checklist: Array.isArray(data.checklist)
        ? data.checklist
        : ["Фото ДО", "Фото ПОСЛЕ"],
    };
  } catch (error) {
    console.error("Classification error:", error);

    return {
      category: JobCategory.OTHER,
      checklist: ["Фото ДО", "Фото ПОСЛЕ"],
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
Ты анализируешь изображение заявки, скриншота, документа или фото объекта ЖКХ.

Извлеки данные:
1. Номер заявки, если он есть.
2. Адрес объекта, если он есть.
3. Краткое описание проблемы.
4. Категорию работ.

Категорию выбери строго из списка:
Сантехника, Электрика, Уборка/клининг, Общестрой, Двери/замки, Лифты, Отопление, Вентиляция, Фасад/кровля, Двор/территория, Другое.

Если каких-то данных нет на изображении, верни пустую строку.

Верни строго JSON без markdown и без пояснений:
{
  "externalId": "",
  "address": "",
  "description": "",
  "category": "Другое"
}
`;

  try {
    const resultText = await callOpenAIBackend(prompt, [
      {
        label: "Исходное фото заявки / скриншот",
        imageBase64: base64Data,
        mimeType: "image/png",
      },
    ]);

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
  const photosBefore = job.photosBefore || [];
  const photosAfter = job.photosAfter || [];

  const images: BackendImage[] = [
    ...photosBefore.map((img, index) => ({
      label: `Фото ДО ${index + 1}`,
      imageBase64: img,
      mimeType: "image/png",
    })),
    ...photosAfter.map((img, index) => ({
      label: `Фото ПОСЛЕ ${index + 1}`,
      imageBase64: img,
      mimeType: "image/png",
    })),
  ];

  const prompt = `
Ты — эксперт технического надзора в ЖКХ.

Твоя задача — проверить выполнение работ по заявке на основании фото ДО и фото ПОСЛЕ.

Данные заявки:
- ID заявки: ${job.id}
- Номер заявки: ${job.externalId || job.id}
- Адрес: ${job.address || "не указан"}
- Категория: ${job.category || "Другое"}
- Описание: ${job.description || "не указано"}
- Исполнитель: ${job.performer || "не указан"}

Переданные изображения:
- Сначала идут все изображения с label "Фото ДО".
- Затем идут все изображения с label "Фото ПОСЛЕ".

Количество фото ДО: ${photosBefore.length}
Количество фото ПОСЛЕ: ${photosAfter.length}

ВАЖНЫЕ ПРАВИЛА:
1. Если количество фото ДО больше 0, запрещено писать, что "фото ДО отсутствует".
2. Если количество фото ПОСЛЕ больше 0, запрещено писать, что "фото ПОСЛЕ отсутствует".
3. Если фото ДО и фото ПОСЛЕ сделаны в разных местах, с разных участков или невозможно уверенно подтвердить, что это один и тот же участок, верни status: "needs_review".
4. Не утверждай автоматически, что работы выполнены, если ракурс, геометрия помещения, окно, лестница, стены, перила или другие ключевые признаки не совпадают.
5. Если место совпадает и видны улучшения, укажи конкретные изменения.
6. Если доказательств недостаточно, укажи, каких фото не хватает.
7. Не придумывай материалы, даты или работы, которых не видно и нет в описании.
8. Ответ должен быть строго JSON без markdown и без пояснений.

Верни строго такой JSON:
{
  "job_id": "${job.id}",
  "status": "approved / needs_review / rejected",
  "category_ru": "категория на русском",
  "confidence": "high / medium / low",
  "missing_evidence_ru": [],
  "checklist_ru": [],
  "before_after_changes_ru": [],
  "work_summary_ru": "",
  "materials_ru": [
    {
      "name": "",
      "qty": "",
      "unit": ""
    }
  ],
  "act_ru": {
    "title": "Акт выполненных работ",
    "job_details": [],
    "works_done": [],
    "dates": [],
    "performers": [],
    "sign_fields": ["Подпись заказчика", "Подпись исполнителя"]
  },
  "report_ru": {
    "executive_summary": [],
    "photo_captions": [],
    "quality_notes": []
  },
  "visual_aids": [
    {
      "type": "side_by_side",
      "caption_ru": "",
      "image_base64_png": ""
    }
  ]
}

Логика статусов:
- approved — фото ДО и ПОСЛЕ относятся к одному месту, работа видимо выполнена, доказательств достаточно.
- needs_review — фото есть, но есть сомнения: разные ракурсы, неочевидно совпадение места, мало доказательств, качество фото слабое.
- rejected — работа явно не выполнена или фото не относятся к заявке.

Если фото ДО и фото ПОСЛЕ визуально похожи на разные места, верни:
status: "needs_review"
confidence: "low"
и в missing_evidence_ru укажи:
"Необходимо дополнительное фото ДО/ПОСЛЕ с одинакового ракурса для подтверждения выполнения работ".
`;

  try {
    if (images.length === 0) {
      throw new Error("Нет фото для анализа");
    }

    const resultText = await callOpenAIBackend(prompt, images);
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
