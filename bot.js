import dotenv from 'dotenv';
import { Bot } from 'grammy';
import { cleanEnv, str, num } from 'envalid';
import fs from 'fs';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

const env = cleanEnv(process.env, {
    TELEGRAM_TOKEN: str(),
    OPENAI_API_KEY: str(),
    TELEGRAM_GROUP_ID: num(),
    MODEL_ID: str(),
    MODEL_TEMPERATURE: num(),
    MODEL_TOP_P: num(),
    MODEL_MAX_TOKENS: num(),
    MODEL_FREQUENCY_PENALTY: num(),
    MODEL_PRESENCE_PENALTY: num()
});

const TELEGRAM_TOKEN = env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const GROUP_ID = env.TELEGRAM_GROUP_ID;

const PROMPT = fs.readFileSync('prompt.txt', 'utf-8').split('\n').map(line => line.trim()).join(' ');

const modelSettings = {
    modelID: env.MODEL_ID,
    temperature: env.MODEL_TEMPERATURE,
    top_p: env.MODEL_TOP_P,
    max_tokens: env.MODEL_MAX_TOKENS,
    frequency_penalty: env.MODEL_FREQUENCY_PENALTY,
    presence_penalty: env.MODEL_PRESENCE_PENALTY
};

const model = new ChatOpenAI({
    apiKey: OPENAI_API_KEY,
    modelName: modelSettings.modelID,
    temperature: modelSettings.temperature,
    maxTokens: modelSettings.max_tokens,
    top_p: modelSettings.top_p,
    frequency_penalty: modelSettings.frequency_penalty,
    presence_penalty: modelSettings.presence_penalty
});

const promptTemplate = ChatPromptTemplate.fromMessages([
    { role: "system", content: PROMPT },
    { role: "user", content: "{input}" }
]);

const relevancePromptTemplate = ChatPromptTemplate.fromMessages([
    { role: "system", content: "Ты эксперт в управлении персоналом (HR) и кадровых процессах. " +
        "Ты анализируешь вопросы пользователей и определяешь, можно ли ответить на них в контексте HR. " +
        "Если вопрос напрямую связан с HR, верни 'релевантно'. " +
        "Если вопрос общего характера, попробуй найти связь с HR и верни 'частично релевантно'. " +
        "Если вопрос совершенно не связан с HR, верни 'нерелевантно'." },
    { role: "user", content: "{input}" }
]);

async function checkRelevance(question) {
    try {
        const relevanceResponse = await relevancePromptTemplate.invoke({ input: question });
        console.log("[DEBUG] Ответ relevancePromptTemplate.invoke:", relevanceResponse);

        // Извлекаем текст или задаём значение по умолчанию
        const relevanceText = relevanceResponse?.text?.trim().toLowerCase() || "нерелевантно";
        console.log(`[INFO] Результат проверки релевантности: ${relevanceText}`);

        return relevanceText; // Возвращаем значение "общее", "частично релевантно", "релевантно" или "нерелевантно"
    } catch (error) {
        console.error(`[ERROR] Ошибка проверки релевантности: ${error.message}`);
        return "нерелевантно"; // По умолчанию считаем нерелевантным
    }
}

async function generateResponse(question) {
    try {
        const response = await promptTemplate.invoke({ input: question });
        console.log(`[INFO] Ответ модели: ${response}`);
        return response.trim();
    } catch (error) {
        console.error(`[ERROR] Ошибка генерации ответа: ${error.message}`);
        return "Произошла ошибка при обработке вашего запроса.";
    }
}

const bot = new Bot(TELEGRAM_TOKEN);

bot.command('start', (ctx) => {
    if (ctx.chat.id !== GROUP_ID) return;
    ctx.reply('Привет! Я отвечаю только участникам этой группы.');
});

bot.on('message:text', async (ctx) => {
    if (ctx.chat.id !== GROUP_ID) return;

    const userMessage = ctx.message.text;
    console.log(`[INFO] Новый вопрос от пользователя: ${userMessage}`);

    try {
        const relevance = await checkRelevance(userMessage);

        if (relevance === "общее") {
            ctx.reply("Привет! Как я могу помочь вам сегодня?");
            return;
        }

        if (relevance === "частично релевантно") {
            ctx.reply("Этот вопрос частично связан с HR. Вот что я могу сказать:");
            return;
        }

        if (relevance === "нерелевантно") {
            ctx.reply("Ваш вопрос не связан с темой HR. Я могу помочь только с вопросами, касающимися управления персоналом.");
            return;
        }

        // Генерация ответа
        const gptResponse = await generateResponse(userMessage);
        ctx.reply(gptResponse);
    } catch (error) {
        console.error(`[ERROR] Ошибка обработки сообщения: ${error.message}`);
        ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Запуск бота
bot.start();
console.log('Бот запущен!');