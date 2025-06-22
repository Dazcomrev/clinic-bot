const db = require('./db');

module.exports = {
    options: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: 'Записаться', callback_data: 'Записать' }],
                [{ text: 'Мои записи', callback_data: 'Мои записи' }]
            ]
        })
    },
    optionsDoAppointment: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: 'Хирург', callback_data: 'appoint_хирург' }],
                [{ text: 'Кардиолог', callback_data: 'appoint_кардиолог' }],
                [{ text: 'Гинеколог', callback_data: 'appoint_гинеколог' }],
                [{ text: 'Терапевт', callback_data: 'appoint_терапевт' }],
                [{ text: 'Проктолог', callback_data: 'appoint_проктолог' }],
                [{ text: 'Педиатр', callback_data: 'appoint_педиатр' }],
                [{ text: 'Невролог', callback_data: 'appoint_невролог' }]
            ]
        })
    },

    optionsMyAppointments(appointsId) {
        let appoints = [];
        for (const appoint of appointsId) {
            appoints.push([{ text: `Удалить запись номер ${appoint['number']}`, callback_data: 'deleteAppoint_' + appoint['id'] }])
        }

        return {
            reply_markup: JSON.stringify({
                inline_keyboard: appoints
            })
        }
    },

    optionsDoctors(doctorsByAppoint) {
        let doctors = [];
        for (const doctor of doctorsByAppoint) {
            doctors.push([{ text: doctor['Фамилия'] + " " + doctor['Имя'] + " " + doctor['Отчество'], callback_data: 'doctor_' + doctor['id'] }])
        }

        return {
            reply_markup: JSON.stringify({
                inline_keyboard: doctors
            })
        };

    },

    optionsChooseTime(docId, date, time) {
        return {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{ text: 'Создать запись', callback_data: `makeAppoint_${docId}_${time}_${date}` }],
                ]
            })
        }
    },

    optionsMakeAppoint: async function (docId, date, time, clientName) {
        let [flag, info] = await db.makeAppoint(docId, date, time, clientName);
        info = info[0];
        if (flag == true) {
            return `Запись к ${info['Название_специальности']} ${info['Фамилия']} ${info['Имя']} ${info['Отчество']} успешно создана на ${info['Дата']} в ${info['Время']}.`;
        } else {
            return 'Запись не была создана.';
        }
    },

    optionsDeleteAppoint: async function (appointId) {
        let [flag, info] = await db.deleteAppoint(appointId);
        info = info[0];
        if (flag == true) {
            return `Запись к ${info['Название_специальности']} ${info['Фамилия']} ${info['Имя']} ${info['Отчество']} на ${info['Дата']} в ${info['Время']} успешно удалена.`;
        } else {
            return 'Произошла ошибка.';
        }
    },

    optionsTimesDoctor(timesByDoctor, docId, date) {
        let times = [];
        for (const time of timesByDoctor) {
            hm = time['hour_minute'];
            times.push([{ text: hm, callback_data: `time_${docId}_${hm}_${date}` }]);
        }

        return {
            reply_markup: JSON.stringify({
                inline_keyboard: times
            })
        };

    },

    getCalendarMarkup(docId, startDate, daysCount = 30) {
        const MS_IN_DAY = 24 * 60 * 60 * 1000;
        const buttons = [];
        const daysInRow = 5;
        for (let i = 0; i < daysCount / daysInRow; i++) {
            buttons.push([]);
            for (let j = 0; j < daysInRow; j++) {
                const date = new Date(startDate.getTime() + (daysInRow * i + j) * MS_IN_DAY);
                const day = date.getDate();
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const buttonText = `${day}.${month}`;
                buttons[i].push({ text: buttonText, callback_data: `date_${docId}_${dateStr}` });
            }
        }
        return {
            reply_markup: JSON.stringify({
                inline_keyboard: buttons
            })
        };
    }
};