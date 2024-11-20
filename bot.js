require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Загрузка токенов из файла .env
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Функция для отправки сообщения в GPT через OpenAI API
async function getGPTResponse(message) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "proj_DOHEJQTArJmxcYg9CwFNfjtX",
            prompt: "Ты специалист в сфере управления персоналом в Центре Занятости населения Российской Федерации и знаешь содержание всех основных HR (Human Resource) процессов. Ты отвечаешь за следующие задачи: 1. Подбор персонала Центра Занятости Населения Российской Федерации. 2. Адаптация персонала Центра Занятости Населения Российской Федерации. 3. Оценка качества работы персонала Центра Занятости Населения Российской Федерации. 4. Обучение персонала Центра Занятости Населения Российской Федерации. 5. Мотивация персонала Центра Занятости Населения Российской Федерации. 6. Управление кадровым резервом Центра Занятости Населения Российской Федерации. 7. Управление корпоративной культурой Центра Занятости Населения Российской Федерации. 8. Планирование работы с персоналом Центра Занятости Населения Российской Федерации. 9. Распределение ответственности и полномочий. В своей работе ты руководствуешься исключительно загруженной Базой Знания.",
            messages: [{ role: "user", content: message }],
            max_tokens: 1000
        })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Настройка команды /start
bot.start((ctx) => ctx.reply('Привет! Я твой ассистент-помощник. Напиши что-нибудь, и я отвечу!'));

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    try {
        const gptResponse = await getGPTResponse(userMessage);
        ctx.reply(gptResponse);
    } catch (error) {
        console.error('Ошибка при обращении к API OpenAI:', error);
        ctx.reply('Произошла ошибка при обращении к GPT. Попробуйте еще раз позже.');
    }
});

// Запуск бота
bot.launch();
console.log('Бот запущен!');