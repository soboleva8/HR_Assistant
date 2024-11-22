const fs = require('fs');

// Укажите имена входного и выходного файлов
const inputFile = 'Пособие_электронная_версия_дополненная.txt';
const outputFile = 'chat_output.jsonl';

// Функция для определения заголовков разделов
const isHeader = (line) => {
    return /^ВВЕДЕНИЕ|^РАЗДЕЛ \d+|^Приложение/i.test(line.trim());
};

// Функция для удаления лишних пробелов и пустых строк
const cleanLine = (line) => {
    return line.trim();
};

async function convertTxtToChatJsonl() {
    const data = fs.readFileSync(inputFile, 'utf-8');
    const lines = data.split('\n');

    const output = [];
    let currentHeader = null;
    let currentContent = [];

    for (let line of lines) {
        const cleanedLine = cleanLine(line);

        if (!cleanedLine) continue; // Пропускаем пустые строки

        if (isHeader(cleanedLine)) {
            // Сохраняем текущий раздел, если он есть
            if (currentHeader && currentContent.length > 0) {
                output.push({
                    messages: [
                        { role: "system", content: "Вы профессиональный ассистент по управлению персоналом." },
                        { role: "user", content: `Расскажите про раздел "${currentHeader}".` },
                        { role: "assistant", content: currentContent.join(' ') }
                    ]
                });
            }

            // Устанавливаем новый заголовок и очищаем контент
            currentHeader = cleanedLine;
            currentContent = [];
        } else {
            // Добавляем строки к текущему разделу
            currentContent.push(cleanedLine);
        }
    }

    // Сохраняем последний раздел
    if (currentHeader && currentContent.length > 0) {
        output.push({
            messages: [
                { role: "system", content: "Вы профессиональный ассистент по управлению персоналом." },
                { role: "user", content: `Расскажите про раздел "${currentHeader}".` },
                { role: "assistant", content: currentContent.join(' ') }
            ]
        });
    }

    // Записываем JSONL в файл
    const writeStream = fs.createWriteStream(outputFile, 'utf-8');
    output.forEach((entry) => {
        writeStream.write(JSON.stringify(entry) + '\n');
    });
    writeStream.end();

    console.log(`Файл успешно преобразован в ${outputFile}`);
}

// Запускаем конвертацию
convertTxtToChatJsonl().catch((err) => console.error(`Ошибка: ${err.message}`));