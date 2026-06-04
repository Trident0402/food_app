(function () {
  function mapsUrl(name, lat, lng) {
    const query = `${name} ${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function restaurant(order, name, lat, lng, categoryNames, tagNames, aiSuggestedTagNames) {
    return {
      name,
      address: "新莊高中(新莊文藝中心) 美食 Google Maps 清單地點",
      googleMapsUrl: mapsUrl(name, lat, lng),
      categoryNames,
      tagNames,
      aiSuggestedTagNames,
      aiSuggestionNote: "取自使用者提供的 Google Maps 清單：https://maps.app.goo.gl/tQw8kB4tXhChFiSWA。類別與標籤由店名初步判斷，仍建議人工確認。",
      distanceRank: order,
      distanceText: `Google Maps 清單順序 ${order}/10`,
      latitude: lat,
      longitude: lng,
      priceText: "需人工確認",
      rating: null,
      reviewCount: null,
      openingHoursText: "需人工確認",
      note: `Google Maps 清單第 ${order} 筆。初始資料，請以 Google Maps 與店家公告為準。`,
      dataVerified: false,
      source: "google-maps-list-tQw8kB4tXhChFiSWA"
    };
  }

  window.FOOD_PICKER_INITIAL_IMPORTS = [
    {
      targetArea: {
        name: "新莊高中附近",
        centerName: "新莊高中(新莊文藝中心)",
        radiusText: "Google Maps 清單 10 筆地點",
        purpose: "午餐、晚餐、放學後不知道吃什麼"
      },
      restaurants: [
        restaurant(1, "好運雞湯_湯序燉品(點湯品有送小菜)-新莊雞湯/新鮮雞腿慢燉/無化學添加", 25.0489605, 121.4454692, ["湯品", "台式"], ["午餐", "晚餐", "一人友善"], ["雞湯", "燉品", "低負擔"]),
        restaurant(2, "MiNi吧! 即享個人鍋物", 25.0487477, 121.4456633, ["火鍋"], ["午餐", "晚餐", "一人友善"], ["個人鍋", "快速解決"]),
        restaurant(3, "摩斯漢堡 新莊中平店", 25.0495332, 121.4449551, ["速食", "美式"], ["早餐", "午餐", "晚餐", "外帶"], ["漢堡", "快速解決"]),
        restaurant(4, "12mini快煮小火鍋 新莊中平店", 25.0488337, 121.4449503, ["火鍋"], ["午餐", "晚餐", "一人友善"], ["小火鍋", "快速解決"]),
        restaurant(5, "伙食餐館 - 新莊店", 25.0481617, 121.4449503, ["飯食", "台式"], ["午餐", "晚餐"], ["簡餐", "一人友善"]),
        restaurant(6, "八方雲集-新莊中平店", 25.0480359, 121.4449849, ["小吃", "麵食"], ["午餐", "晚餐", "外帶"], ["鍋貼", "水餃", "快速解決"]),
        restaurant(7, "三碗麵 傻瓜麵", 25.0468715, 121.4443975, ["麵食", "台式"], ["午餐", "晚餐", "一人友善"], ["乾麵", "小吃"]),
        restaurant(8, "新村館韓式中華料理", 25.048083, 121.444988, ["韓式", "中式"], ["午餐", "晚餐", "聚餐"], ["韓式中華", "麵食"]),
        restaurant(9, "鄭家常餐廳", 25.0492943, 121.4447395, ["台式", "中式"], ["午餐", "晚餐", "家庭"], ["家常菜", "合菜"]),
        restaurant(10, "爭鮮PLUS-中平店", 25.0485336, 121.4449471, ["日式", "壽司"], ["午餐", "晚餐", "一人友善"], ["迴轉壽司", "快速解決"])
      ]
    }
  ];
})();
