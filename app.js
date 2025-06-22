const TelegramApi = require("node-telegram-bot-api");
const options = require('./options');
const db = require('./db');
const token = "7808998078:AAGSMSECmilgtm_XtJAq7GzPaik6zTawgLA";

const bot = new TelegramApi(token, { polling: true });

const cron = require('node-cron');

const start = async () => {

    bot.setMyCommands([
        { command: '/start', description: 'Начало' },
        { command: '/info', description: 'Информация о пользователе' },
        { command: '/do', description: 'Возможные действия' },
        { command: '/beda', description: '...' }
    ])

    bot.on('message', msg => {
        const text = msg.text;
        const chatId = msg.chat.id;
        try {
            if (text === '/start') {
                return bot.sendMessage(chatId, 'Добро. Вы моете. Также, увы, вы можете выбрать действие написав команду /do и вывести информацию о себе с помощью команды /info.');
            }
            if (text === '/info') {
                return bot.sendMessage(chatId, 'Ты ' + msg.from.first_name + '.');
            }
            if (text === '/do') {
                return bot.sendMessage(chatId, 'Выберите действие:', options.options);
            }
            if (text === '/beda') {
                return bot.sendMessage(chatId, 'Беда, беда');
            }
            return bot.sendMessage(chatId, text + '!');
        } catch (e) {
            return bot.sendMessage(chatId, 'Беда, беда. Произошла какая то ошибочка!)');
        }
    });

    bot.on('callback_query', msg => {
        try {
            const data = msg.data;
            const chatId = msg.message.chat.id;
            const clientName = msg.from.first_name;

            if (data.includes('makeAppoint')) {
                const docId = data.split('_')[1];
                const time = data.split('_')[2];
                const date = data.split('_')[3];
                (async () => {
                    const message = await options.optionsMakeAppoint(docId, date, time, clientName);
                    return bot.sendMessage(chatId, message);
                })();
            }

            if (data.includes('time')) {
                const docId = data.split('_')[1];
                const time = data.split('_')[2];
                const date = data.split('_')[3];
                return bot.sendMessage(chatId, `Вы хотите записаться на прием в ${time}?`, options.optionsChooseTime(docId, date, time));
            }

            if (data.includes('date')) {
                const docId = data.split('_')[1];
                const date = data.split('_')[2];
                (async () => {
                    const timesByDoctor = await db.getTimesByDateAndDoctor(docId, date);
                    if (timesByDoctor[0] != null) {
                        return bot.sendMessage(chatId, 'Выберите время приема ' + date, options.optionsTimesDoctor(timesByDoctor, docId, date));
                    } else {
                        return bot.sendMessage(chatId, 'На эту дату запись невозможна!');
                    }
                })();
            }

            if (data.includes('doctor')) {
                const docId = data.split('_')[1];

                const today = new Date();
                return bot.sendMessage(chatId, 'Выберите дату', options.getCalendarMarkup(docId, today, 30));
            }

            if (data.includes('appoint')) {
                const appoint = data.split('_')[1];
                (async () => {
                    const doctorsByAppoint = await db.getDoctorsByAppoint(appoint);
                    return bot.sendMessage(chatId, 'Выберите врача со специальностью ' + appoint, options.optionsDoctors(doctorsByAppoint));
                })();
            }

            if (data.includes('deleteAppoint')) {
                const appointId = data.split('_')[1];
                (async () => {
                    const message = await options.optionsDeleteAppoint(appointId);
                    return bot.sendMessage(chatId, message);
                })();
            }

            if (data === 'Записать') {
                return bot.sendMessage(chatId, 'Выберите специальность врача', options.optionsDoAppointment);
            }
            if (data === 'Мои записи') {
                (async () => {
                    const appointsByClientName = await db.getClientAppoints(clientName);
                    let countAppoint = appointsByClientName.length;
                    if (countAppoint > 0) {
                        let text = '';
                        let appointsId = [];

                        for (let i = 0; i < countAppoint; i += 1) {
                            appoint = appointsByClientName[i];
                            text += `${i + 1}. ${appoint['Название_специальности']} ${appoint['Фамилия']} ${appoint['Имя']} ${appoint['Отчество']}, ${appoint['Дата']}, ${appoint['Время']}`;
                            if (i < countAppoint - 1) {
                                text += ';\n';
                            } else {
                                text += '.';
                            }
                            appointsId.push({'number':i + 1, 'id':appoint['id']});
                        }

                        return bot.sendMessage(chatId, 'У вас есть следующие записи (если хотите отменить запись, то нажмите на эту запись):\n' + text, options.optionsMyAppointments(appointsId));
                    } else {
                        return bot.sendMessage(chatId, 'У вас нет записей.');
                    }
                })();

            }
        } catch (e) {
            console.log('Ошибка:', e);
            return bot.sendMessage(chatId, 'Произошла какая то ошибочка2!)');
        }
    })
}

cron.schedule('0 0 * * *', async () => {
    try {
        const result = await db.updateSchedule();
        console.log(`${new Date().toISOString()}: ${result}`);
    } catch (err) {
        console.error('Ошибка обновления:', err);
    }
});

(async () => {
    await db.updateSchedule().then(console.log).catch(console.error);
})();

start();