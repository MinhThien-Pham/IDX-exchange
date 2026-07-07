const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

function isValidNumber(value) {
    return value !== undefined && value !== '' && !Number.isNaN(Number(value));
}

function isValidInteger(value) {
    return value !== undefined && value !== '' && Number.isInteger(Number(value));
}

router.get('/', async (req, res) => {
    try {
        const {
            city,
            zipcode,
            minPrice,
            maxPrice,
            beds,
            baths,
        } = req.query;

        const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
        const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'limit must be an integer between 1 and 100',
            });
        }

        if (!Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({
                error: 'offset must be a non-negative integer',
            });
        }

        if (minPrice !== undefined && !isValidNumber(minPrice)) {
            return res.status(400).json({
                error: 'minPrice must be a number',
            });
        }

        if (maxPrice !== undefined && !isValidNumber(maxPrice)) {
            return res.status(400).json({
                error: 'maxPrice must be a number',
            });
        }

        if (beds !== undefined && !isValidInteger(beds)) {
            return res.status(400).json({
                error: 'beds must be an integer',
            });
        }

        if (baths !== undefined && !isValidNumber(baths)) {
            return res.status(400).json({
                error: 'baths must be a number',
            });
        }

        const conditions = [];
        const values = [];

        if (city) {
            conditions.push('LOWER(TRIM(L_City)) = LOWER(TRIM(?))');
            values.push(city);
        }

        if (zipcode) {
            conditions.push('L_Zip = ?');
            values.push(zipcode);
        }

        if (minPrice !== undefined) {
            conditions.push('L_SystemPrice >= ?');
            values.push(Number(minPrice));
        }

        if (maxPrice !== undefined) {
            conditions.push('L_SystemPrice <= ?');
            values.push(Number(maxPrice));
        }

        if (beds !== undefined) {
            conditions.push('L_Keyword2 >= ?');
            values.push(Number(beds));
        }

        if (baths !== undefined) {
            conditions.push('LM_Dec_3 >= ?');
            values.push(Number(baths));
        }

        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `
      SELECT COUNT(*) AS total
      FROM rets_property
      ${whereClause}
    `;

        const [countResult] = await pool.query(countQuery, values);
        const total = countResult[0].total;

        const dataQuery = `
      SELECT *
      FROM rets_property
      ${whereClause}
      LIMIT ? OFFSET ?
    `;

        const [results] = await pool.query(dataQuery, [...values, limit, offset]);

        res.json({
            total,
            limit,
            offset,
            results,
        });
    } catch (error) {
        console.error('Database error:', error);

        res.status(500).json({
            error: 'Failed to fetch properties',
            message: error.message,
        });
    }
});

module.exports = router;