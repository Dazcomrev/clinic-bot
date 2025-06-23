const TelegramApi = require("node-telegram-bot-api");
const options = require('./options');
const db = require('./db');
const token = "7808998078:AAGSMSECmilgtm_XtJAq7GzPaik6zTawgLA";

const bot = new TelegramApi(token, { polling: true });

const cron = require('node-cron');

const start = async () => {

    bot.setMyCommands([
        { command: '/start', description: 'Начало' },
        { command: '/do', description: 'Возможные действия' },
        { command: '/id', description: 'Ваш telegram id' }
    ])

    bot.on('message', msg => {
        const text = msg.text;
        const chatId = msg.chat.id;
        try {
            if (text === '/start') {
                return bot.sendMessage(chatId, 'Приветствую, вы можете выбрать действие написав команду /do и посмотреть свой telegram id /id.');
            }
            if (text === '/do') {
                return bot.sendMessage(chatId, 'Выберите действие:', options.options);
            }
            if (text === '/id') {
                return bot.sendMessage(chatId, `Ваш telegram id: ${msg.from.id}`);
            }
            return bot.sendMessage(chatId, 'Я не занаю такой команды, введите команды /start');
        } catch (e) {
            console.error(e);
            return bot.sendMessage(chatId, 'Беда, беда. Произошла какая то ошибочка!)');
        }
    });

    bot.on('callback_query', msg => {
        try {
            const data = msg.data;
            const chatId = msg.message.chat.id;
            const clientId = msg.from.id;
            const mesId = msg.message.message_id;

            if (data.includes('makeAppoint')) {
                const docId = data.split('_')[1];
                const time = data.split('_')[2];
                const date = data.split('_')[3];
                (async () => {
                    const message = await options.optionsMakeAppoint(docId, date, time, clientId);
                    //return bot.sendMessage(chatId, message);
                    return bot.editMessageText(message, {
                        chat_id: chatId,
                        message_id: mesId
                    });
                })();
            }

            if (data.includes('time')) {
                const docId = data.split('_')[1];
                const time = data.split('_')[2];
                const date = data.split('_')[3];
                /*
                    ВОЗМОЖНО СТОИТ ДОБАВИТЬ К КОМУ ВЫБИРАЕТСЯ ВРЕМЯ ПРИЕМА
                 */
                //return bot.sendMessage(chatId, `Вы хотите записаться на прием в ${time}?`, options.optionsChooseTime(docId, date, time));
                return bot.editMessageText(`Вы хотите записаться на прием в ${time}?`, {
                    chat_id: chatId,
                    message_id: mesId,
                    reply_markup: options.optionsChooseTime(docId, date, time).reply_markup
                });
            }

            if (data.includes('date')) {
                const docId = data.split('_')[1];
                const date = data.split('_')[2];
                (async () => {
                    const timesByDoctor = await db.getTimesByDateAndDoctor(docId, date);
                    if (timesByDoctor[0] != null) {
                        /*
                            ВОЗМОЖНО СТОИТ ДОБАВИТЬ К КОМУ ВЫБИРАЕТСЯ ВРЕМЯ ПРИЕМА
                        */
                        //return bot.sendMessage(chatId, 'Выберите время приема ' + date, options.optionsTimesDoctor(timesByDoctor, docId, date));
                        return bot.editMessageText('Выберите время приема ' + date, {
                            chat_id: chatId,
                            message_id: mesId,
                            reply_markup: options.optionsTimesDoctor(timesByDoctor, docId, date).reply_markup
                        });
                    } else {
                        //return bot.sendMessage(chatId, 'На эту дату запись невозможна!');
                        return bot.answerCallbackQuery(msg.id, { text: 'На эту дату запись невозможна!', show_alert: true });
                    }
                })();
            }

            if (data.includes('doctor')) {
                const docId = data.split('_')[1];
                const today = new Date();
                //return bot.sendMessage(chatId, 'Выберите дату', options.getCalendarMarkup(docId, today, 30));
                (async () => {
                    const { reply_markup } = await options.getCalendarMarkup(docId, today, 30);
                    const fio = await db.getDoctorFIO(docId);
                    return bot.editMessageText(`Выберите дату записи к ${fio['Фамилия']} ${fio['Имя']} ${fio['Отчество']}`, {
                        chat_id: chatId,
                        message_id: mesId,
                        reply_markup: reply_markup
                    });
                })();
            }

            if (data.includes('appoint')) {
                const appoint = data.split('_')[1];
                (async () => {
                    const doctorsByAppoint = await db.getDoctorsByAppoint(appoint);
                    //return bot.sendMessage(chatId, 'Выберите врача со специальностью ' + appoint, options.optionsDoctors(doctorsByAppoint));
                    return bot.editMessageText('Выберите врача со специальностью ' + appoint, {
                        chat_id: chatId,
                        message_id: mesId,
                        reply_markup: options.optionsDoctors(doctorsByAppoint).reply_markup
                    });
                })();
            }

            if (data.includes('deleteAppoint')) {
                const appointId = data.split('_')[1];
                (async () => {
                    const message = await options.optionsDeleteAppoint(appointId);
                    //return bot.sendMessage(chatId, message);
                    return bot.editMessageText(message, {
                        chat_id: chatId,
                        message_id: mesId
                    });
                })();
            }

            if (data === 'Записать') {
                //return bot.sendMessage(chatId, 'Выберите специальность врача', options.optionsDoAppointment);
                return bot.editMessageText('Выберите специальность врача', {
                    chat_id: chatId,
                    message_id: mesId,
                    reply_markup: options.optionsDoAppointment.reply_markup
                });
            }
            if (data === 'Мои записи') {
                (async () => {
                    const appointsByClientName = await db.getClientAppoints(clientId);
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

                        //return bot.sendMessage(chatId, 'У вас есть следующие записи (если хотите отменить запись, то нажмите на эту запись):\n' + text, options.optionsMyAppointments(appointsId));
                        return bot.editMessageText('У вас есть следующие записи (если хотите отменить запись, то нажмите на эту запись):\n' + text, {
                            chat_id: chatId,
                            message_id: mesId,
                            reply_markup: options.optionsMyAppointments(appointsId).reply_markup
                        });
                    } else {
                        //return bot.sendMessage(chatId, 'У вас нет записей.');
                        return bot.editMessageText('У вас нет записей.', {
                            chat_id: chatId,
                            message_id: mesId
                        });
                    }
                })();

            }

            if (data === 'do') {
                //return bot.sendMessage(chatId, 'Выберите действие:', options.options);
                return bot.editMessageText('Выберите действие:', {
                    chat_id: chatId,
                    message_id: mesId,
                    reply_markup: options.options.reply_markup
                });
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