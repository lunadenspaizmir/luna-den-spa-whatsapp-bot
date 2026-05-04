export type MessageKey =
  | "MAIN_MENU"
  | "PRICE"
  | "LOCATION"
  | "WORKING_HOURS"
  | "MASSAGE_TYPES"
  | "APPOINTMENT_CONFIRMATION"
  | "SUPPORT_CONFIRMATION"
  | "SUPPORT_REQUEST"
  | "APPOINTMENT_REQUEST";

const divider = "━━━━━━━━━━━━━━";

const keywordAll = `🔎 Hızlı Erişim

• fiyat / ücret
• masaj / tür
• saat / mesai
• konum / adres
• destek / yetkili
• randevu / dönüş`;

const keywordWithoutPrice = `🔎 Hızlı Erişim

• masaj / tür
• saat / mesai
• konum / adres
• destek / yetkili
• randevu / dönüş`;

const keywordWithoutLocation = `🔎 Hızlı Erişim

• fiyat / ücret
• masaj / tür
• saat / mesai
• destek / yetkili
• randevu / dönüş`;

const keywordWithoutHours = `🔎 Hızlı Erişim

• fiyat / ücret
• masaj / tür
• konum / adres
• destek / yetkili
• randevu / dönüş`;

const keywordWithoutMassage = `🔎 Hızlı Erişim

• fiyat / ücret
• saat / mesai
• konum / adres
• destek / yetkili
• randevu / dönüş`;

const keywordWithoutAppointment = `🔎 Hızlı Erişim

• fiyat / ücret
• masaj / tür
• saat / mesai
• konum / adres
• destek / yetkili`;

const keywordWithoutSupport = `🔎 Hızlı Erişim

• fiyat / ücret
• masaj / tür
• saat / mesai
• konum / adres
• randevu / dönüş`;

const mainMenuOptions = `📋 Menü

1️⃣ Güncel hizmet fiyatları
2️⃣ Masaj türleri
3️⃣ Çalışma saatleri
4️⃣ Konum bilgisi
5️⃣ Yetkili ile iletişime geçmek istiyorum
6️⃣ Randevu talebi oluşturmak istiyorum`;

const menuWithoutPrice = `↩️ Diğer İşlemler

2️⃣ Masaj türleri
3️⃣ Çalışma saatleri
4️⃣ Konum bilgisi
5️⃣ Yetkili ile iletişime geçmek istiyorum
6️⃣ Randevu talebi oluşturmak istiyorum`;

const menuWithoutLocation = `↩️ Diğer İşlemler

1️⃣ Güncel hizmet fiyatları
2️⃣ Masaj türleri
3️⃣ Çalışma saatleri
5️⃣ Yetkili ile iletişime geçmek istiyorum
6️⃣ Randevu talebi oluşturmak istiyorum`;

const menuWithoutHours = `↩️ Diğer İşlemler

1️⃣ Güncel hizmet fiyatları
2️⃣ Masaj türleri
4️⃣ Konum bilgisi
5️⃣ Yetkili ile iletişime geçmek istiyorum
6️⃣ Randevu talebi oluşturmak istiyorum`;

const menuWithoutMassage = `↩️ Diğer İşlemler

1️⃣ Güncel hizmet fiyatları
3️⃣ Çalışma saatleri
4️⃣ Konum bilgisi
5️⃣ Yetkili ile iletişime geçmek istiyorum
6️⃣ Randevu talebi oluşturmak istiyorum`;

const menuWithoutAppointment = `↩️ Diğer İşlemler

1️⃣ Güncel hizmet fiyatları
2️⃣ Masaj türleri
3️⃣ Çalışma saatleri
4️⃣ Konum bilgisi
5️⃣ Yetkili ile iletişime geçmek istiyorum`;

const menuWithoutSupport = `↩️ Diğer İşlemler

1️⃣ Güncel hizmet fiyatları
2️⃣ Masaj türleri
3️⃣ Çalışma saatleri
4️⃣ Konum bilgisi
6️⃣ Randevu talebi oluşturmak istiyorum`;

export const messages: Record<MessageKey, string> = {
  MAIN_MENU: `🌿 Luna Den Spa’ya Hoş Geldiniz

Size yardımcı olmak için buradayım.

Lütfen yapmak istediğiniz işlemin numarasını ya da ilgili kısa kelimeyi yazmanız yeterlidir.

${divider}
${mainMenuOptions}

${divider}
🔎 Hızlı Erişim (Kısa Komutlar)

Aşağıdaki kelimeleri yazarak da işlem yapabilirsiniz:

• fiyat / ücret
• masaj / tür
• saat / mesai
• konum / adres
• destek / yetkili
• randevu / dönüş

${divider}

Geçerli bir seçim yapılmadığında, ana menü otomatik olarak tekrar gönderilecektir.`,

  PRICE: `🌿 Güncel Hizmet Fiyatları

✅ Klasik masaj: 2.000 TL
✅ Bali masajı: 3.000 TL
✅ Derin Doku: 2.300 TL
✅ Medikal masaj: 2.700 TL
✅ Kese köpük: 1.000 TL
✅ Sultan masajı: 3.700 TL
✅ Aromaterapi: 2.500 TL
✅ Thai masajı: 3.000 TL

Ayrıca nakit ödemelerde ve yıllık paketlerde ek avantajlar sağlıyoruz. 😊

${divider}
${menuWithoutPrice}

${divider}
${keywordWithoutPrice}`,

  LOCATION: `📍 Konum Bilgisi

🗺️ Harita Bağlantısı
Luna Den Spa’ya kolayca ulaşın:
https://maps.app.goo.gl/Gb3tcp5T1meByJs37

${divider}

🏢 Spa Konumu
Luna Den Spa, Ege Park AVM içerisinde, 2. katta hizmet vermektedir.
AVM ana girişinden içeri girdikten sonra yönlendirme tabelalarını takip ederek asansör ile 2. kata ulaşabilirsiniz.

${divider}

🚗 Özel Araç ile Ulaşım
Misafirlerimiz AVM otoparkını rahatlıkla kullanabilir.
Merkezi konumu sayesinde hızlı ve konforlu ulaşım imkânı sunar.

${divider}

🚇 Toplu Taşıma ile Ulaşım
Metro ile gelecek misafirlerimiz, Çağdaş Metro Durağı’nda indikten sonra kısa bir yürüyüş ile spa merkezimize ulaşabilir.

${divider}
${menuWithoutLocation}

${divider}
${keywordWithoutLocation}`,

  WORKING_HOURS: `🕒 Çalışma Saatleri

📅 Hafta içi
Pazartesi - Cuma
11:00–22:00

📅 Hafta sonu
Cumartesi - Pazar
11:00–21:00

${divider}
${menuWithoutHours}

${divider}
${keywordWithoutHours}`,

  MASSAGE_TYPES: `🌿 Masaj Türlerimiz

✅ İsveç (Klasik) Masajı
Kasları gevşetmeye ve kan dolaşımını desteklemeye yönelik, rahatlatıcı dokunuşlarla uygulanan, en yaygın tercih edilen masaj türlerinden biridir.

${divider}

✅ Bali Masajı
Uzak Doğu tekniklerinden ilham alan bu özel terapi; ritmik dokunuşlar ve basınç teknikleriyle beden ve zihin dengesini destekleyerek derin bir rahatlama sağlar.

${divider}

✅ Derin Doku Masajı
Kas ve bağ dokularının derin katmanlarına etki eden bu terapi; yoğun kas gerginliklerini azaltmaya ve kronik ağrıları hafifletmeye yardımcı olur.

${divider}

✅ Medikal Masaj
Uzman terapistler tarafından uygulanan, kas-iskelet sistemi kaynaklı rahatsızlıklara yönelik, hedef odaklı ve terapötik bir masaj uygulamasıdır.

${divider}

✅ Aromaterapi Masajı
Doğal ve özel bitkisel yağlar eşliğinde uygulanan bu bütünsel terapi; zihinsel ve fiziksel rahatlama sağlayarak duyularınızı canlandırır.

${divider}

✅ Thai Mix Masajı
Thai ve klasik masaj tekniklerinin birleşimiyle uygulanan bu dinamik terapi; esneme ve bası teknikleri sayesinde vücuda esneklik ve hafiflik kazandırır.

${divider}

✅ Sultan Masajı
İki terapistin senkronize şekilde çalıştığı bu özel deneyim; derin gevşeme, maksimum konfor ve benzersiz bir lüks spa deneyimi sunar.

${divider}
${menuWithoutMassage}

${divider}
${keywordWithoutMassage}`,

  APPOINTMENT_CONFIRMATION: `🌿 Randevu Talebi Onayı

Randevu talebi için geri dönüş almak istediğinizi belirttiniz.

Talebinizi yetkili kişiye iletmemizi onaylıyor musunuz?

✅ Onaylamak için: evet veya onay

İptal etmek veya farklı bir işlem yapmak için aşağıdaki numaralardan birini ya da kısa kelimeyi yazabilirsiniz.

${divider}
${menuWithoutAppointment}

${divider}
${keywordWithoutAppointment}`,

  SUPPORT_CONFIRMATION: `🌿 Yetkili İletişim Onayı

Destek için yetkiliyle görüşmek istediğinizi belirttiniz.

Talebinizi yetkili kişiye iletmemizi onaylıyor musunuz?

✅ Onaylamak için: evet veya onay

İptal etmek veya farklı bir işlem yapmak için aşağıdaki numaralardan birini ya da kısa kelimeyi yazabilirsiniz.

${divider}
${menuWithoutSupport}

${divider}
${keywordWithoutSupport}`,

  SUPPORT_REQUEST: `✅ Destek Talebiniz Alınmıştır 🌿

En kısa zamanda yetkili kişi tarafından size dönüş sağlanacaktır.

Dilerseniz bu sırada destek almak istediğiniz konuyu mesaj olarak iletebilirsiniz.

${divider}
${menuWithoutSupport}

${divider}
${keywordWithoutSupport}`,

  APPOINTMENT_REQUEST: `✅ Randevu Talebiniz Alınmıştır 🌿

En kısa zamanda yetkili kişi tarafından size dönüş sağlanacaktır.

Dilerseniz bu sırada tercih ettiğiniz hizmeti ve uygun olduğunuz gün/saat bilgisini mesaj olarak iletebilirsiniz.

${divider}
${menuWithoutAppointment}

${divider}
${keywordWithoutAppointment}`
};
