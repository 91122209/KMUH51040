const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 获取环境变量
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAMES = process.env.SHEET_NAMES.split(","); // 工作表名称用逗号分隔
const RANGE = process.env.RANGE || "F:I"; // 默认范围为 F:I
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// 配置 Google Sheets 客户端
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

// 读取 Google Sheets 数据
async function getSheetData() {
  let allData = [];
  for (const sheetName of SHEET_NAMES) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${RANGE}`,
      });
      if (response.data.values) {
        // 过滤掉 G 列数据，只保留 F、H 和 I
        const filteredData = response.data.values.map((row) => [
          row[0], // F 列
          row[2], // H 列
          row[3], // I 列
        ]);
        allData = allData.concat(filteredData);
      }
    } catch (error) {
      console.error(`读取工作表 ${sheetName} 时出错：`, error);
    }
  }
  return allData;
}

// 定义路由 /check-case
app.post("/check-case", async (req, res) => {
  const { name, idOrCaseNumber } = req.body;

  if (!name && !idOrCaseNumber) {
    return res.status(400).json({
      status: "error",
      message: "请提供姓名或病例号/身份证号。",
    });
  }

  try {
    const data = await getSheetData();
    const found = data.some((row) => {
      const sheetName = row[0]?.trim(); // F 列
      const sheetCaseNumber = row[1]?.trim(); // H 列
      const sheetIdNumber = row[2]?.trim(); // I 列
      return (
        (name && sheetName.toLowerCase() === name.trim().toLowerCase()) ||
        (idOrCaseNumber &&
          (sheetCaseNumber === idOrCaseNumber.trim() ||
            sheetIdNumber === idOrCaseNumber.trim()))
      );
    });

    if (found) {
      res.json({ status: "found", message: "已收案。" });
    } else {
      res.json({
        status: "not_found",
        message: "未收案，请联系失智共照个管师 (51040)。",
      });
    }
  } catch (error) {
    console.error("查询失败：", error);
    res.status(500).json({ status: "error", message: "服务器错误。" });
  }
});

// 启动服务器
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
