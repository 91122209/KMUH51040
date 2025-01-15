const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Google Sheets 配置
const SHEET_ID = process.env.SHEET_ID; // 環境變量中讀取 SHEET_ID
const SHEET_NAMES = process.env.SHEET_NAMES.split(','); // 環境變量中讀取 SHEET_NAMES
const RANGE = process.env.RANGE; // 環境變量中讀取範圍

// Google 認證配置
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS); // 從環境變量解析金鑰
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

// 讀取試算表數據
async function getSheetData() {
  let allData = [];
  for (const sheetName of SHEET_NAMES) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${RANGE}`,
      });
      if (response.data.values) {
        // 過濾數據，僅保留 F、H 和 I
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
    res.json({
      status: found ? 'found' : 'not_found',
      message: found
        ? '*** 個案已收案 ***'
        : '未收案，可打給失智共照個管師，51040',
    });
  } catch (error) {
    console.error('錯誤：', error);
    res.status(500).json({ status: 'error', message: '伺服器錯誤' });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
