const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Google Sheets 設定
const SHEET_ID = '1LmnU04NVL8aOVBYhnqXC266DgmCokzqrF7QCZtbqpE8'; // 替換為您的試算表 ID
const SHEET_NAMES = ['113年收案表', '114年收案表', '結案']; // 替換為您的工作表名稱
const RANGE = 'F:I'; // 確認範圍為 F 到 I 欄

// 嵌入 Google 金鑰
const googleCredentials = {
  type: "service_account",
  project_id: "kmuh-dementia-case-data-sheet",
  private_key_id: "b1757fd9f8eb7544a433b8739d6625b2a0970929",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCJy//9juVhmsMb
GMsQGxF00FRk/cgKvYMEl9oARm3VhXXBSuXpdnCYA8R4nAvGkeoVrfvsDzRirV55
HukWALgrUhM2hk1WID7sPJVTSAxjeqCsT968f+Nl1qxlfwU42qGJimB/LpUFgCsc
MTvPZM2SW5ZK7oy6UJmwV1rjruMRD5MLEJ7fCOrpuc3BF7mBAOc3qDwIFc/tEych
uDFr5YGAOZU8aySG6r6G6FkqfzT/PQlYSWDGnHFVfsgsp+Nr/skQXx7BqPPqj7SF
kB72HBXyMmDBqjHOnpYRPE4rrYtQrv2BHiqBdQ8pfd3ZYrg/zeRt4SFTmvCjxm/y
RQDJUYLlAgMBAAECggEAKbJAIQK3aESDW1SyRYpbSuSrVO/yM0XLOn2Uqtak76J1
0mqOjYmYYndpYTGe4pROqAbAn1queFmLp8zxrQXEtN8eDzaueixBvgxLBytbDFMU
AXAdrx5nue4utnusIdsOXGcx8eovj72Lzfkb5xLSncH3BW+Px+URzGlyiEjoTsXc
9CVpA2xd3vzCJETTxpeFO+bQ8s96DniI2POkO2pbDy3WzZx8fsyaHUv9CY/O09Lw
/iOhwPU1qUBiS9BTYuHIU5Nv5YMrwHbcQS4HmV5lSIzyZIROhp2fj5HYExNU8fvq
xBG42uwONAP5jCLHOYusUT+yz3bR4imrLUG7tNx0FQKBgQDCtzen0+Lyi5C5Lps6
kxzkOCQh5P5iKjrw5JqjcQnn4TsbPOy24JLWR1bIAwzcfpMTg5fkuuRxIhwfjy+f
Or/RuBwL5SSYryAoxiK6794oeYz/DgZihpYCO5cpvu0w+YX1sl6pPx6v++PWqJ2q
+HB6WcVvWfAj46beh5QoseqlLwKBgQC1Kqz+n5Jw/6Ub8WTvqKsZCpdj5DgDU4+H
leKIK4sUe5lBtWenw0V5YuzeXn40QjZ3EAc9r/LVF2KPrBZ2727rtYUwGeLLugOn
ySg2u/NAyYS473BJ+7M/BPbtCHFMIutDhnNuw9eq45QlrioS3T2bsGyOk5Lzxl06
9zHEgCt8KwKBgDtILvCwyQrRRRmsP+SAf65YDWAoaO6YLuPCpfYW504qu6UaUnOH
Qg1tINW6YAMNolexm+AuqnhrSyasoHIZH+eI5zkT5aV6xA7F7DL/7qJiB3Rr37PF
iAxb+jTihTKA9bENQlbC+ePYi9CB+6bfBtepVzwEpOE4YUik/I27RVZPAoGAL5ob
AnxjOhWyCHmRD/e9nULPLIwWu6kFGZckgqsOTD99sWo85jPE2XRI0NT7TDfpn7cy
b97/a0ZNu3p4HKAlAQIdENp8YRNrSnbsfhU8gVVx7jXbx1S/cFuZlgaV3m9+aau2
QPBshpZtosj0fShsu6/LllroTe1dKdUx2nPi+SkCgYACquJWOknr3Nlyuf4BYgl0
s+o/9agZy9a8k3icH2n4PNTnVBMMWlesEiCVH1LYKCpTTrKzXnr+J/EiVdplWp8b
UW63vSG8TlKMKcqFk8bQg+wkMFixZGp/3GSMdUH95lVmVnXGkxOoyWYo1zafNh+4
etf/CAORNRbnAF2MqUV4uA==
-----END PRIVATE KEY-----`,
  client_email: "kmuh51040@kmuh-dementia-case-data-sheet.iam.gserviceaccount.com",
  client_id: "115121594555739604924",
};

// Google Sheets 客戶端
const auth = new google.auth.GoogleAuth({
  credentials: googleCredentials,
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
        // 過濾掉 G 列，只保留 F、H 和 I
        const filteredData = response.data.values.map(row => [row[0], row[2], row[3]]);
        allData = allData.concat(filteredData);
      }
    } catch (error) {
      console.error(`讀取工作表 ${sheetName} 時出錯：`, error);
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
      const sheetName = row[0]?.trim(); // F 欄
      const sheetCaseNumber = row[1]?.trim(); // H 欄
      const sheetIdNumber = row[2]?.trim(); // I 欄
      return (
        (name && sheetName.toLowerCase() === name.trim().toLowerCase()) ||
        (idOrCaseNumber && (sheetCaseNumber === idOrCaseNumber.trim() || sheetIdNumber === idOrCaseNumber.trim()))
      );
    });

    if (found) {
      res.json({ status: 'found', message: '*** 個案已收案 ***' });
    } else {
      res.json({ status: 'not_found', message: '未收案，可打給失智共照個管師，51040' });
    }
  } catch (error) {
    console.error('伺服器錯誤：', error);
    res.status(500).json({ status: 'error', message: '伺服器錯誤', error });
  }
});

// 啟動伺服器
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`伺服器正在執行於 http://localhost:${PORT}`);
});