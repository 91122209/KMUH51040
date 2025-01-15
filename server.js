const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets 配置
const SHEET_ID = '1LmnU04NVL8aOVBYhnqXC266DgmCokzqrF7QCZtbqpE8';
const SHEET_NAMES = ['113年收案表', '114年收案表', '結案'];
const RANGE = 'F:I';

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function getSheetData() {
    let allData = [];
    for (const sheetName of SHEET_NAMES) {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!${RANGE}`,
        });
        if (response.data.values) {
            allData = allData.concat(
                response.data.values.map(row => [row[0], row[2], row[3]])
            ); // 排除 G 欄，保留 F、H、I
        }
    }
    return allData;
}

// 定義 /check-case 路由
app.post('/check-case', async (req, res) => {
    const { name, idOrCaseNumber } = req.body;

    try {
        const data = await getSheetData();
        const found = data.some(row => {
            const sheetName = row[0]?.trim() || '';
            const sheetCaseNumber = row[1]?.trim() || '';
            const sheetIdNumber = row[2]?.trim() || '';

            return (
                (name && sheetName.toLowerCase() === name.trim().toLowerCase()) ||
                (idOrCaseNumber &&
                    (sheetCaseNumber === idOrCaseNumber.trim() ||
                        sheetIdNumber === idOrCaseNumber.trim()))
            );
        });

        if (found) {
            res.json({ status: 'found', message: '** 個案已收案 **' });
        } else {
            res.json({ status: 'not_found', message: '未收案，可打給失智共照個管師，51040' });
        }
    } catch (error) {
        console.error('錯誤：', error);
        res.status(500).json({ status: 'error', message: '伺服器錯誤', error });
    }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器正在執行於 http://localhost:${PORT}`);
});
