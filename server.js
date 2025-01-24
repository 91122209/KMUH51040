const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// 从环境变量中读取配置
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAMES = process.env.SHEET_NAMES.split(','); // 分割成数组
const RANGE = process.env.RANGE;

// 配置 Google Service Account 凭据
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 获取数据，并排除 G 列
async function getSheetData() {
  let allData = [];
  for (const sheetName of SHEET_NAMES) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${RANGE}`,
      });

      if (response.data.values) {
        // 排除 G 列 (假设范围是 F:I, 那么 G 是 row[1])
        const filteredData = response.data.values.map((row) => [row[0], row[2], row[3]]); // 只保留 F (0), H (2), I (3)
        allData = allData.concat(filteredData);
      }
    } catch (error) {
      console.error(`读取工作表 ${sheetName} 时出错：`, error);
    }
  }
  return allData;
}

// 定义 POST 路由 /check-case
app.post('/check-case', async (req, res) => {
  const { name, idOrCaseNumber } = req.body;
  try {
    const data = await getSheetData();
    const found = data.some((row) => {
      const sheetName = row[0]?.trim() || ''; // F 列
      const sheetCaseNumber = row[1]?.trim() || ''; // H 列
      const sheetIdNumber = row[2]?.trim() || ''; // I 列

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
        : '未收案，可打给失智共照個管師；
        51040、54039',
    });
  } catch (error) {
    console.error('查询失败：', error);
    res.status(500).json({ status: 'error', message: '服务器错误', error });
  }
});

// 启动服务器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`服务器正在运行在 http://localhost:${PORT}`);
});
