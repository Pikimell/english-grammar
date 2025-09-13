// tasksGenerator.js

// ---- HTTP wrapper -----------------------------------------------------------
export const getAnswer = async (body) => {
  // const BASE_URL = "https://vq1wtq2d2l.execute-api.us-east-2.amazonaws.com/dev";
  const BASE_URL = "http://localhost:3000/dev";
  const url = BASE_URL + "/openai";

  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json());

  return response; // your endpoint returns a JSON string -> we'll JSON.parse later
};

// ---- Public API -------------------------------------------------------------
/**
 * Генерує один блок завдання під конкретний typeQuestion (mcq/gap/...)
 * @param {string} topic - наприклад: "Present Simple"
 * @param {string} typeQuestion - один з: mcq, gap, transform, match, error, order, short, writing
 * @param {object} opts - { language: 'uk', items: 10, seedId: 'ps' } тощо
 * @returns {Promise<object>} JSON блоку завдання
 */
export const generateTask = async (topic, typeQuestion, opts = {}) => {
  const promptBody = buildBody(topic, typeQuestion, opts);
  const raw = await getAnswer(promptBody);

  // API зазвичай повертає строку JSON -> парсимо.
  // Якщо вже об'єкт — просто повернемо як є.
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch (e) {
    // На випадок якщо модель вивела щось зайве — спроба витягнути JSON через regex
    const jsonMatch =
      typeof raw === "string" ? raw.match(/\{[\s\S]*\}$/) : null;
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Не вдалося розпарсити JSON відповіді моделі");
  }
};

/**
 * Генерує HTML-розмітку теоретичного матеріалу (таблиці з правилами та прикладами)
 * @param {string} topic - назва теми (наприклад: "Present Simple")
 * @param {object} opts - { language: 'uk' | 'en' }
 * @returns {Promise<string>} HTML-фрагмент з <table> блоками
 */
export const generateTheory = async (topic, opts = {}) => {
  const body = buildTheoryBody(topic, opts);
  const raw = await getAnswer(body);
  // Очікуємо чистий HTML-фрагмент (рядок). Якщо об'єкт — дістанемо content
  if (typeof raw === "string") return raw;
  if (raw && typeof raw.content === "string") return raw.content;
  // Спроба видобути HTML між першими <table ...> ... (на випадок зайвого тексту)
  const m = String(raw || "").match(/<table[\s\S]*<\/table>/i);
  if (m) return m[0];
  throw new Error("Відповідь не містить HTML");
};

// ---- Prompt builder ---------------------------------------------------------
function buildBody(topic, typeQuestion, opts = {}) {
  const token = localStorage.getItem("gptToken");
  if (!token || token?.length < 10) {
    console.warn("⚠️ gptToken відсутній у localStorage");
    const token = prompt("Enter Your GPT Token");
    localStorage.setItem("gptToken", token);
  }

  const model = "gpt-4o-mini";
  const normalizedType = String(typeQuestion || "")
    .trim()
    .toLowerCase();

  const { system, user } = makeMessages(topic, normalizedType, opts);

  return {
    token,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  };
}

function buildTheoryBody(topic, opts = {}) {
  let token = localStorage.getItem("gptToken");
  if (!token || token?.length < 10) {
    console.warn("⚠️ gptToken відсутній у localStorage");
    token = prompt("Enter Your GPT Token");
    if (token) localStorage.setItem("gptToken", token);
  }
  const model = "gpt-4o-mini";
  const lang = (opts.language || "uk").toLowerCase();

  const system = `You are an ESL (English as a Second Language) content generator.  
Create a **detailed study guide in HTML tables** for the following grammar/vocabulary topic:

TOPIC: ${topic}
LEVEL: A1-C2
LANGUAGE OF EXPLANATION: English
ACCENT_COLOR: #00837f

REQUIREMENTS:
1. Output only valid HTML <table> structures (border="1" cellpadding="1" cellspacing="1" style="width:100%").  
2. Use clear headers inside tables with <span style="color: #00837f"><strong>…</strong></span>.  
3. Highlight key grammar points in <strong>bold</strong>.  
4. Use examples in simple everyday vocabulary, 1–2 per point.  
5. You may generate ANY number of tables depending on how much detail the topic requires.  
6. Tables should cover different aspects such as:
   - Forms (affirmative, negative, questions)  
   - Usage (rules, functions, signal words, time markers)  
   - Common mistakes (“Use it right!”)  
   - Exceptions/irregularities/special cases  
   - Practical examples or mini-dialogues  
   - Vocabulary lists (if relevant to the topic)  
   - Comparison with similar grammar points (if relevant)  
7. Make the content structured like a mini-textbook chapter:  
   - Start with a table that introduces the main concept and its basic forms.  
   - Add extra tables for usage, examples, pitfalls, exceptions, etc.  
   - End with a summary/revision table.  
8. Keep everything inside tables, do NOT output free text outside tables.  

GOAL:
Produce a **ready-to-use study guide** in HTML tables, so that learners can read it as a digital textbook.  
Be as detailed as possible, but keep the language simple and level-appropriate.  `;

  const user = `Generate the full HTML tables for topic: ${topic}.`;

  return {
    token,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
    max_tokens: 16384,
  };
}

// ---- Templates: system + user by task type ---------------------------------

/**
 * Кожен тип завдання має:
 * - коротку інструкцію (що генеруємо, які поля)
 * - приклад (few-shot) у system
 * - суворі вимоги: лише JSON, українська, без крапок у відповідях де потрібно тощо
 */
function makeMessages(topic, type, opts) {
  const lang = opts.language || "uk"; // наразі використовуємо ua/uk
  const itemsCount = Number.isInteger(opts.items)
    ? opts.items
    : defaultItemsByType[type] || 10;
  const seedId = opts.seedId || shortSeed(topic);

  const commonRules = `
ТИ — генератор навчальних завдань з англійської мови.
МЕТА: Згенерувати ОДИН блок завдань типу "${type}" по темі "${topic}".
ПОВЕРТАЙ ЛИШЕ ВАЛІДНИЙ JSON. Узгоджуйся рівнем А1–A2.
Мова інтерфейсу — українська.
Кодування — UTF-8. Без пояснень, без префіксів, без \`\`\`.
Верифікуй внутрішню узгодженість (варіанти відповіді відповідають правилу/темі).
`;

  const templates = {
    mcq: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "mcq-${seedId}-1",
  "type": "mcq",
  "prompt": "<коротка інструкція українською>",
  "items": [
    {
      "q": "<питання зі зниклою формою>",
      "choices": ["<варіант0>", "<варіант1>", "<варіант2>"],
      "answer": ["<index_правильної_відповіді_рядком>"]
    },
    ...
  ]
}

ВИМОГИ:
- ${itemsCount} пунктів.
- Формат як у прикладі нижче.
- У choices рівно 3 варіанти, лише один правильний.
- Правильна відповідь — індекс як рядок: "0" | "1" | "2".
- Питання та варіанти короткі, природні, у темі "${topic}".
- ЖОДНОГО додаткового тексту поза JSON.

ПРИКЛАД (АНАЛОГІЧНИЙ; НЕ КОПІЮВАТИ ДОКЛАДНО ЗМІСТ):
{
  "id": "mcq-ps-1",
  "type": "mcq",
  "prompt": "Обери правильну форму (Present Simple)",
  "items": [
    { "q": "He usually ___ the bus to work.", "choices": ["take", "takes", "is taking"], "answer": ["1"] },
    { "q": "They ___ coffee in the morning.", "choices": ["have", "haves", "are having"], "answer": ["0"] }
  ]
}
      `.trim(),
      user: `
Тема: ${topic}
Згенеруй блок типу "mcq" строго за СХЕМОЮ ВИХОДУ.
Кількість пунктів: ${itemsCount}.
      `.trim(),
    },

    gap: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "gap-${seedId}-1",
  "type": "gap",
  "prompt": "<інструкція>",
  "items": [
    { "q": "<They ___ (work) on Sundays.>", "answer": ["<правильна форма>", "<альтернатива_якщо_є>"] },
    ...
  ]
}
ВИМОГИ:
- ${itemsCount} пунктів.
- В полі "answer" завжди масив зі щонайменше одним варіантом.
- Коротко, рівень А1–A2.
      `.trim(),
      user: oneLineUser(topic, "gap", itemsCount),
    },

    transform: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "transform-${seedId}-1",
  "type": "transform",
  "prompt": "Перетвори на заперечення (Present Simple, без крапки)",
  "items": [
    {
      "q": "She likes coffee.",
      "hint": "використай doesn't; без крапки",
      "answer": ["she doesn't like coffee", "she does not like coffee"]
    }
  ]
}
ВИМОГИ:
- ${itemsCount} пунктів.
- Усі відповіді — без фінальної крапки (якщо так вказано в prompt).
- Дай корисний "hint".
      `.trim(),
      user: oneLineUser(topic, "transform", itemsCount),
    },

    match: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "match-${seedId}-1",
  "type": "match",
  "prompt": "Зістав: дієслово → форма 3-ї особи (he/she/it)",
  "pairs": [
    { "left": "go", "right": "goes" },
    ...
  ]
}
ВИМОГИ:
- Кількість пар: ${Math.max(6, Math.min(12, itemsCount))}.
- Однозначні відповідності (без омонімії у межах набору).
      `.trim(),
      user: oneLineUser(topic, "match", itemsCount),
    },

    error: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "error-${seedId}-1",
  "type": "error",
  "prompt": "Знайди й виправ помилку (Present Simple, без крапки)",
  "items": [
    { "q": "She don't like tea.", "hint": "doesn't + V", "answer": ["she doesn't like tea", "she does not like tea"] }
  ]
}
ВИМОГИ:
- ${itemsCount} пунктів.
- У кожному "q" повинна бути типова помилка саме з теми "${topic}".
- "answer" — без фінальної крапки, якщо так зазначено в prompt.
      `.trim(),
      user: oneLineUser(topic, "error", itemsCount),
    },

    order: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "order-${seedId}-1",
  "type": "order",
  "prompt": "Постав слова в правильному порядку",
  "items": [
    { "q": "Впорядкуй речення", "tokens": ["she", "often", "reads", "books"], "answer": "she often reads books" }
  ]
}
ВИМОГИ:
- ${itemsCount} пунктів.
- "tokens" мають складати саме правильну відповідь.
- Відповідь без крапки, якщо не потрібно.
      `.trim(),
      user: oneLineUser(topic, "order", itemsCount),
    },

    short: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "short-${seedId}-1",
  "type": "short",
  "prompt": "Короткі відповіді: ${topic}",
  "items": [
    { "q": "Напиши 2–3 речення про свою щоденну рутину.", "keywords": ["i", "usually", "every"] }
  ]
}
ВИМОГИ:
- ${Math.min(
        6,
        Math.max(3, Math.floor(itemsCount / 2))
      )} пунктів (короткі письмові міні-завдання).
- Ключові слова — підказка, а не жорстка вимога.
      `.trim(),
      user: oneLineUser(topic, "short", itemsCount),
    },

    writing: {
      system: `
${commonRules}
СХЕМА ВИХОДУ:
{
  "id": "writing-${seedId}-1",
  "type": "writing",
  "prompt": "Міні-письмо по темі ${topic}",
  "description": "<1–2 речення з умовою>",
  "checklist": [
    "<критерій 1>",
    "<критерій 2>",
    "<критерій 3>"
  ]
}
ВИМОГИ:
- Чітка інструкція в "description".
- 4–6 пунктів у "checklist" з конкретними критеріями перевірки.
      `.trim(),
      user: oneLineUser(topic, "writing", itemsCount),
    },
  };

  const tpl = templates[type];
  if (!tpl) {
    // fallback на mcq, якщо передали невідомий тип
    return templates.mcq;
  }

  return tpl;
}

// ---- Helpers ----------------------------------------------------------------
const defaultItemsByType = {
  mcq: 10,
  gap: 10,
  transform: 10,
  match: 8,
  error: 10,
  order: 10,
  short: 3,
  writing: 1,
};

function oneLineUser(topic, type, itemsCount) {
  return `Тема: ${topic}\nЗгенеруй блок типу "${type}" з кількістю пунктів: ${itemsCount}. Поверни строго JSON за описаною схемою.`;
}

function shortSeed(s) {
  return (
    String(s || "task")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 6) || "task"
  );
}
