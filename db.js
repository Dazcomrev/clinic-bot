import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ClinicBot',
    password: '123456',
    port: 5432,
});

async function getDoctorSpeciality(docId) {
    try {
        const res = await pool.query('SELECT Специальность.Название_специальности \
            FROM Врач INNER JOIN Специальность ON Врач.id_специальности = Специальность.id \
            WHERE Врач.id = $1', [docId]);
        return res.rows[0]['Название_специальности'].toLowerCase();
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function getDoctorFIO(docId) {
    try {
        const res = await pool.query('SELECT Фамилия, Имя, Отчество \
            FROM Врач INNER JOIN Специальность ON Врач.id_специальности = Специальность.id \
            WHERE Врач.id = $1', [docId]);
        return res.rows[0];
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function getDoctorsByAppoint(appoint) {
    try {
        const res = await pool.query('SELECT Врач.id, Фамилия, Имя, Отчество \
            FROM Врач INNER JOIN Специальность ON Врач.id_специальности = Специальность.id \
            WHERE LOWER(Специальность.Название_специальности) = LOWER($1)', [appoint]);
        return res.rows;
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function getTimesByDateAndDoctor(docId, date) {
    try {
        const res = await pool.query("SELECT to_char(Расписание_врача.Время, 'HH24:MI') AS hour_minute \
            FROM (Врач INNER JOIN Расписание_врача ON Врач.id = Расписание_врача.id_врача) INNER JOIN Записи ON Расписание_врача.id = Записи.id_расписания\
            WHERE Врач.id = $1 AND Статус = FALSE AND Дата = $2\
            ORDER BY hour_minute", [docId, date]);
        return res.rows;
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function getClientAppoints(clientId) {
    try {
        const res = await pool.query("SELECT Записи.id, Врач.Фамилия, Врач.Имя, Врач.Отчество, Специальность.Название_специальности,\
            to_char(Записи.Дата, 'YYYY-MM-DD') AS Дата, to_char(Расписание_врача.Время, 'HH24:MI') AS Время \
            FROM ((Врач INNER JOIN Расписание_врача ON Врач.id = Расписание_врача.id_врача) \
            INNER JOIN Записи ON Расписание_врача.id = Записи.id_расписания) INNER JOIN Специальность ON Врач.id_специальности = Специальность.id\
            WHERE Записи.Имя_пользователя = $1", [clientId]);
        return res.rows;
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function makeAppoint(docId, date, time, clientId) {
    try {
        const status = await pool.query("SELECT Записи.Статус\
            FROM ((Врач INNER JOIN Расписание_врача ON Врач.id = Расписание_врача.id_врача) \
            INNER JOIN Записи ON Расписание_врача.id = Записи.id_расписания) INNER JOIN Специальность ON Врач.id_специальности = Специальность.id\
            WHERE Врач.id = $1 AND Записи.Дата = $2 AND Расписание_врача.Время = $3::time;", [docId, date, time]);

        if (status.rows[0]['Статус'] == true) {
            return [false, status.rows];
        }

        const res0 = await pool.query("SELECT Врач.Фамилия, Врач.Имя, Врач.Отчество, Специальность.Название_специальности,\
            to_char(Записи.Дата, 'YYYY-MM-DD') AS Дата, to_char(Расписание_врача.Время, 'HH24:MI') AS Время \
            FROM ((Врач INNER JOIN Расписание_врача ON Врач.id = Расписание_врача.id_врача) \
            INNER JOIN Записи ON Расписание_врача.id = Записи.id_расписания) INNER JOIN Специальность ON Врач.id_специальности = Специальность.id\
            WHERE Врач.id = $1 AND Записи.Дата = $2 AND Записи.Статус = FALSE AND Расписание_врача.Время = $3::time;", [docId, date, time]);

        const res = await pool.query("UPDATE Записи SET Статус = true, Имя_пользователя = $1 \
            FROM Врач, Расписание_врача\
            WHERE Врач.id = Расписание_врача.id_врача AND Расписание_врача.id = Записи.id_расписания AND\
            Врач.id = $2 AND Записи.Дата = $3 AND Записи.Статус = FALSE AND Расписание_врача.Время = $4::time;", [clientId, docId, date, time]);
        return [true, res0.rows];
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function deleteAppoint(appointId) {
    try {
        const res0 = await pool.query("SELECT Врач.Фамилия, Врач.Имя, Врач.Отчество, Специальность.Название_специальности,\
            to_char(Записи.Дата, 'YYYY-MM-DD') AS Дата, to_char(Расписание_врача.Время, 'HH24:MI') AS Время \
            FROM ((Врач INNER JOIN Расписание_врача ON Врач.id = Расписание_врача.id_врача) \
            INNER JOIN Записи ON Расписание_врача.id = Записи.id_расписания) INNER JOIN Специальность ON Врач.id_специальности = Специальность.id\
            WHERE Записи.id = $1", [appointId]);
        const res = await pool.query("UPDATE Записи SET Статус = false, Имя_пользователя = NULL \
            WHERE Записи.id = $1;", [appointId]);
        return [true, res0.rows];
    } catch (err) {
        console.error('Ошибка при запросе к БД:', err);
        throw err;
    }
}

async function updateSchedule() {

    try {
        await pool.query('BEGIN');

        const { rows: [stats] } = await pool.query(`
      SELECT 
        GREATEST(0, CURRENT_DATE - MIN("Дата")) AS days_to_process,
        MAX("Дата") AS last_date
      FROM "Записи"
    `);

        if (!stats.last_date) {
            await pool.query("SET lc_time = 'ru_RU.UTF-8';");
            //await pool.query('CREATE UNIQUE INDEX unique_schedule_date ON "Записи" ("id_расписания", "Дата");');
            await pool.query("INSERT INTO Записи (id_расписания, Дата, Статус, Имя_пользователя)\
                SELECT rv.id, d:: date, FALSE, NULL\
                FROM public.Расписание_врача rv CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', INTERVAL '1 day') d\
                WHERE trim(to_char(d, 'TMDay')) = rv.День_недели\
                ORDER BY rv.id, d\
                ON CONFLICT (id_расписания, Дата) DO NOTHING;");
            await pool.query('COMMIT');
            return 'Инициализирована первая запись';
        }

        let deletedCount = 0;
        if (stats.days_to_process > 0) {
            const deleteRes = await pool.query(`
        DELETE FROM "Записи"
        WHERE "Дата" IN (
          SELECT DISTINCT "Дата" 
          FROM "Записи"
          ORDER BY "Дата" ASC
          LIMIT $1
        )
      `, [stats.days_to_process]);
            deletedCount = deleteRes.rowCount;
        }

        let insertedCount = 0;
        if (stats.days_to_process > 0) {
            const insertRes = await pool.query(`
        WITH dates AS (
          SELECT generate_series(
            $1::date + 1, 
            $1::date + $2::integer, 
            INTERVAL '1 day'
          ) AS new_date
        )
        INSERT INTO "Записи" ("id_расписания", "Дата", "Статус", "Имя_пользователя")
        SELECT
            rv."id",
            d.new_date,
            FALSE,
            NULL
        FROM
            "Расписание_врача" rv
        CROSS JOIN dates d
        WHERE
            trim(to_char(d.new_date, 'TMDay')) = rv."День_недели"
        ON CONFLICT ("id_расписания", "Дата") DO NOTHING;
      `, [stats.last_date, stats.days_to_process]);
            insertedCount = insertRes.rowCount;
        }

        await pool.query('COMMIT');
        return `Удалено дней: ${deletedCount}, Добавлено дней: ${stats.days_to_process}`;

    } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
    }
}

export {
    getDoctorSpeciality,
    getDoctorFIO,
    getDoctorsByAppoint,
    getTimesByDateAndDoctor,
    getClientAppoints,
    makeAppoint,
    deleteAppoint,
    updateSchedule
};