const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// 讀取環境變數
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAMES = process.env.SHEET_NAMES.split(','); // 轉為陣列
const RANGE = process.env.RANGE;

// 設定 Google Service Account 憑證
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// **讀取 Google Sheets 並排除 H (索引 7)**
async function getSheetData() {
  let allData = [];
  for (const sheetName of SHEET_NAMES) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${RANGE}`,
      });

      if (response.data.values) {
        // **保留 G (索引 6), I (索引 8), J (索引 9)，排除 H (索引 7)**
        const filteredData = response.data.values.map((row) => [
          row[6] || '', // G 欄
          row[8] || '', // I 欄
          row[9] || ''  // J 欄
        ]);
        allData = allData.concat(filteredData);
      }
    } catch (error) {
      console.error(`讀取工作表 ${sheetName} 時出錯：`, error);
    }
  }
  return allData;
}

// **定義 POST 路由 /check-case**
app.post('/check-case', async (req, res) => {
  const { name, idOrCaseNumber } = req.body;
  try {
    const data = await getSheetData();
    const found = data.some((row) => {
      const sheetG = row[0]?.trim() || ''; // G 欄
      const sheetI = row[1]?.trim() || ''; // I 欄
      const sheetJ = row[2]?.trim() || ''; // J 欄

      return (
        (name && sheetJ.toLowerCase() === name.trim().toLowerCase()) ||
        (idOrCaseNumber &&
          (sheetG === idOrCaseNumber.trim() ||
            sheetI === idOrCaseNumber.trim()))
      );
    });

    res.json({
      status: found ? 'found' : 'not_found',
      message: found
        ? '*** 個案已收案 ***'
        : '未收案，可打給失智共照個管師；\n51040、54039',
    });
  } catch (error) {
    console.error('查詢失敗：', error);
    res.status(500).json({ status: 'error', message: '伺服器錯誤', error });
  }
});

// **啟動伺服器**
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`伺服器正在運行在 http://localhost:${PORT}`);
});
