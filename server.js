const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Google Sheets 配置
const SHEET_ID = '1LmnU04NVL8aOVBYhnqXC266DgmCokzqrF7QCZtbqpE8'; // 替換為您的試算表 ID
const SHEET_NAMES = ['113年收案表', '114年收案表', '結案'];
const RANGE = 'F:I'; // 確認範圍為 F 到 I 列

// Google Sheets 客戶端
async function getSheetData() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            type: "service_account",
            project_id: process.env.PROJECT_ID,
            private_key_id: process.env.PRIVATE_KEY_ID,
            private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.CLIENT_EMAIL,
            client_id: process.env.CLIENT_ID,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    let allData = [];
    for (const sheetName of SHEET_NAMES) {
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: `${sheetName}!${RANGE}`,
            });

            if (response.data.values) {
                // 過濾掉 G 列，只保留 F、H 和 I
                const filteredData = response.data.values.map(row => [row[0], row[2], row[3]]);
                allData = allData.concat(filteredData);
            }
        } catch (error) {
            console.error(`讀取工作表 ${sheetName} 出錯：`, error);
        }
    }
    return allData;
}

// 查詢 API
app.post('/check-case', async (req, res) => {
    const { name, idOrCaseNumber } = req.body;

    try {
        const data = await getSheetData();

        const found = data.some(row => {
            const sheetName = row[0]?.trim();
            const sheetCaseNumber = row[1]?.trim();
            const sheetIdNumber = row[2]?.trim();

            return (
                (name && sheetName?.toLowerCase() === name?.trim().toLowerCase()) ||
                (idOrCaseNumber &&
                    (sheetCaseNumber === idOrCaseNumber.trim() || sheetIdNumber === idOrCaseNumber.trim()))
            );
        });

        if (found) {
            res.json({ status: 'found', message: '** 個案已收案 **' });
        } else {
            res.json({ status: 'not_found', message: '未收案，可打給失智共照個管師，51040' });
        }
    } catch (error) {
        console.error('伺服器錯誤：', error);
        res.status(500).json({ status: 'error', message: '伺服器錯誤' });
    }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`伺服器正在執行於 http://localhost:${PORT}`));