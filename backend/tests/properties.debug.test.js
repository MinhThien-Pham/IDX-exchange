const mysql = require('mysql2/promise');
require('dotenv').config();

describe('Debug Challenge: combined minPrice and beds filters', () => {
    test('API total matches direct SQL count when minPrice and beds are used together', async () => {
        const minPrice = 300000;
        const beds = 3;
        const limit = 100;
        const offset = 0;
        const port = process.env.PORT || 5000;

        const response = await fetch(
            `http://localhost:${port}/api/properties?minPrice=${minPrice}&beds=${beds}&limit=${limit}&offset=${offset}`
        );

        expect(response.status).toBe(200);

        const body = await response.json();

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        const [countRows] = await connection.execute(
            `
      SELECT COUNT(*) AS expectedTotal
      FROM rets_property
      WHERE L_SystemPrice >= ?
        AND L_Keyword2 >= ?
      `,
            [minPrice, beds]
        );

        await connection.end();

        expect(body.total).toBe(countRows[0].expectedTotal);

        for (const property of body.results) {
            expect(Number(property.L_SystemPrice)).toBeGreaterThanOrEqual(minPrice);
            expect(Number(property.L_Keyword2)).toBeGreaterThanOrEqual(beds);
        }
    });
});