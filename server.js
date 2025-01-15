const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config(); // 加载 .env 文件

const app = express();

app.use(cors());
app.use(express.json());

// 从环境变量获取配置
const PORT = process.env.PORT || 4000;
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAMES = process.env.SHEET_NAMES.split(','); // 分割成数组
const RANGE = process.env.RANGE;

// Google Sheets API 凭据
const GOOGLE_CREDENTIALS = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // 替换 \n 为换行符
};

// 初始化 Google Sheets API 客户端
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

// 获取试算表数据并过滤掉 G 列
async function getSheetData() {
  let allData = [];
  for (const sheetName of SHEET_NAMES) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${RANGE}`,
      });

      if (response.data.values) {
        // 过滤 G 列，只保留 F, H, I 列
        const filteredData = response.data.values.map(row => [row[0], row[2], row[3]]);
        allData = allData.concat(filteredData);
      }
    } catch (error) {
      console.error(`读取工作表 ${sheetName} 时出错：`, error.message);
    }
  }
  return allData;
}

// 查找是否收案的接口
app.post('/check-case', async (req, res) => {
  const { name, idOrCaseNumber } = req.body;

  if (!name && !idOrCaseNumber) {
    return res.status(400).json({
      status: 'error',
      message: '请输入姓名或病例号/身份证号码！',
    });
  }

  try {
    const data = await getSheetData();
    const found = data.some(row => {
      const sheetName = row[0]?.trim() || '';
      const sheetCaseNumber = row[1]?.trim() || '';
      const sheetIdNumber = row[2]?.trim() || '';

      return (
        (name && sheetName.toLowerCase() === name.trim().toLowerCase()) ||
        (idOrCaseNumber &&
          (sheetCaseNumber === idOrCaseNumber.trim() || sheetIdNumber === idOrCaseNumber.trim()))
      );
    });

    if (found) {
      res.json({ status: 'found', message: '*** 个案已收案 ***' });
    } else {
      res.json({ status: 'not_found', message: '未收案，可打给失智共照个管师，51040' });
    }
  } catch (error) {
    console.error('查找出错：', error);
    res.status(500).json({ status: 'error', message: '服务器错误', error });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器正在运行：http://localhost:${PORT}`);
});
