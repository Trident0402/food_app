# AI 找尋地點與匯入資料文件

## 1. 文件目的

這份文件用來協助後續新增餐廳資料。

流程不是讓 Web App 自動爬 Google Maps，而是：

1. 使用者決定一個目標地點。
2. 使用者手動從 Google Maps、評論、店家頁面或其他公開資訊整理候選餐廳。
3. 線下 AI 協助整理成一致格式。
4. 使用者確認資料。
5. 將整理後的 JSON 或 CSV 匯入 Web App。

## 2. 目標地點定義

每次整理資料前，先定義一個目標地點。

範例：

- 台北車站附近
- 公司附近
- 家附近
- 捷運中山站附近
- 某間學校附近

需要記錄：

- 目標名稱
- 中心點描述
- 搜尋半徑或步行時間
- 使用情境
- 整理日期
- 資料是否已人工確認

## 3. 建議資料夾結構

```text
food_maps/
  target-place-name/
    map profile.md
    import list.json
    import list.csv
    ai tag suggestions.md
    source notes.md
```

### 3.1 map profile.md

記錄此美食地圖的基本設定。

建議內容：

```md
# 台北車站附近美食地圖

- 目標地點：台北車站
- 搜尋範圍：步行 10-15 分鐘
- 使用情境：平日午餐、晚餐、臨時不知道吃什麼
- 整理日期：2026-06-03
- 資料狀態：AI 初步整理，待人工確認
```

### 3.2 import list.json

給 Web App 匯入的主要資料。

### 3.3 import list.csv

方便人類與 AI 編輯的表格版本。

### 3.4 ai tag suggestions.md

記錄 AI 為什麼建議某些標籤。

### 3.5 source notes.md

記錄資料來源與待確認項目。

## 4. 匯入 JSON 格式

```json
{
  "targetArea": {
    "name": "台北車站附近",
    "centerName": "台北車站",
    "radiusText": "步行 10-15 分鐘",
    "purpose": "平日午餐與晚餐"
  },
  "restaurants": [
    {
      "name": "範例牛肉麵",
      "address": "台北市中正區範例路 1 號",
      "googleMapsUrl": "https://maps.google.com/?q=example",
      "categoryNames": ["麵食", "台式"],
      "tagNames": ["午餐", "200 以內", "快速"],
      "aiSuggestedTagNames": ["麵食", "台式", "午餐"],
      "aiSuggestionNote": "店名與評論摘要皆指向牛肉麵，適合作為午餐。",
      "priceText": "約 100-200",
      "rating": 4.2,
      "reviewCount": 328,
      "openingHoursText": "需人工確認",
      "note": "AI 初步整理，待確認。",
      "dataVerified": false,
      "source": "manual-google-maps-offline-ai"
    }
  ]
}
```

## 5. 匯入 CSV 欄位

建議欄位：

```text
name,address,googleMapsUrl,categoryNames,tagNames,aiSuggestedTagNames,aiSuggestionNote,priceText,rating,reviewCount,openingHoursText,note,dataVerified,source
```

多個類別或標籤可用 `|` 分隔。

範例：

```text
範例牛肉麵,台北市中正區範例路 1 號,https://maps.google.com/?q=example,麵食|台式,午餐|200 以內|快速,麵食|台式|午餐,店名與評論摘要皆指向牛肉麵,約 100-200,4.2,328,需人工確認,AI 初步整理,false,manual-google-maps-offline-ai
```

## 6. AI 建議標籤清單

### 6.1 食物類型

- 台式
- 日式
- 韓式
- 義式
- 美式
- 泰式
- 港式
- 越式
- 早餐
- 咖啡
- 甜點
- 飲料
- 火鍋
- 燒肉
- 麵食
- 飯食
- 便當
- 小吃
- 素食

### 6.2 用餐情境

- 早餐
- 午餐
- 晚餐
- 宵夜
- 聚餐
- 一人友善
- 約會
- 家庭
- 外帶
- 內用
- 可久坐
- 快速解決

### 6.3 條件限制

- 100 以內
- 200 以內
- 300 以內
- 有冷氣
- 可訂位
- 不用排隊
- 交通方便
- 離目標近
- 座位多
- 插座
- Wi-Fi

### 6.4 口味偏好

- 清爽
- 重口味
- 高蛋白
- 低負擔
- 少油
- 辣
- 湯品
- 份量大
- 甜點強
- 咖啡強

### 6.5 風險與注意事項

- 可能排隊
- 座位少
- 價格偏高
- 評價兩極
- 營業時間不穩定
- 需要預約
- 只收現金
- 資料可能過期

### 6.6 資料狀態

- AI 建議
- 使用者已確認
- 需要複查
- 資料可能過期
- 待補地址
- 待補營業時間

## 7. 給線下 AI 的整理 Prompt 範本

```text
你是我的私人美食地圖資料整理助手。

目標地點：
{填入目標地點}

搜尋範圍：
{填入步行時間或半徑}

使用情境：
{例如平日午餐、晚餐、週末聚餐}

請根據我貼上的 Google Maps 店家資訊、評論摘要或人工筆記，整理成 Web App 可匯入的 JSON。

請遵守：
1. 不要捏造地址、評分、營業時間。
2. 不確定的欄位填「需人工確認」或 null。
3. 請為每間店建議 categoryNames、tagNames、aiSuggestedTagNames。
4. 請在 aiSuggestionNote 說明為什麼給這些標籤。
5. dataVerified 一律先填 false。
6. 黑名單與願望清單不要自動判斷，交給使用者決定。
```

## 8. 人工確認清單

匯入 App 前，使用者應確認：

- 餐廳名稱是否正確。
- 地址是否正確。
- Google Maps 連結是否正確。
- 類別是否合理。
- 標籤是否過度推測。
- 價位是否可靠。
- 營業時間是否需要更新。
- 是否有重複店家。

## 9. 注意事項

- 不要把 AI 建議視為已驗證事實。
- Google Maps 資訊可能會變動。
- 評分與評論數可能過期。
- 營業時間最容易變動，應標記為需要複查。
- Web App 第一版只負責匯入與篩選，不負責自動搜尋地點。
