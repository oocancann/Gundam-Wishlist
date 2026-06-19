# Gunpla Compare

เว็บเปรียบเทียบสเปกกันพลา (PG / RG / Mega Size) แบบ custom filter — เลือกตัวที่อยากเทียบ ดูราคาเยน/บาท ความสูง วัสดุ และจุดเด่นแบบตารางเดียวจบ คล้ายหน้า compare ของ Apple Store

🔗 **Live demo**: เปิดผ่าน GitHub Pages หลัง deploy (ดูขั้นตอนด้านล่าง)

---

## โครงสร้างไฟล์

```
gunpla-compare/
├── index.html              # หน้าเว็บหลัก
├── css/style.css           # สไตล์ทั้งหมด (theme: blueprint/spec-sheet)
├── js/app.js                # logic: filter, search, sort, compare table
├── data/gundam-data.json   # ★ ข้อมูลกันพลาทั้งหมด แก้ตรงนี้ที่เดียว
└── README.md
```

## วิธีรันดูบนเครื่องตัวเอง (ก่อน deploy)

ต้องรันผ่าน local server (เปิดไฟล์ตรงๆ จะโหลด JSON ไม่ได้ เพราะ browser บล็อก fetch จาก `file://`)

```bash
cd gunpla-compare
python3 -m http.server 8000
# แล้วเปิด http://localhost:8000
```

หรือถ้ามี Node:
```bash
npx serve .
```

## วิธี deploy ขึ้น GitHub Pages

1. สร้าง repo ใหม่บน GitHub (หรือใช้ repo เดิม) แล้ว push โฟลเดอร์นี้ทั้งหมดขึ้นไป:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Gunpla Compare"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. ไปที่ repo บน GitHub → **Settings** → **Pages**
3. ที่ **Source** เลือก `Deploy from a branch` → branch `main` → folder `/ (root)` → **Save**
4. รอ 1-2 นาที เว็บจะขึ้นที่ `https://<your-username>.github.io/<repo-name>/`

## วิธีเพิ่ม/แก้ไขข้อมูลกันพลา

เปิดไฟล์ `data/gundam-data.json` แล้วเพิ่ม object ใหม่ในอาเรย์ `models` ตามแพทเทิร์นนี้:

```json
{
  "id": "pg-ตัวอย่าง-unique-id",
  "name": "ชื่อรุ่น",
  "series": "ชื่อซีรีส์ต้นทาง",
  "grade": "PG",
  "scale": "1/60",
  "heightMm": 300,
  "material": "ABS, PS, PC",
  "priceYen": 27500,
  "releaseYear": 2024,
  "image": "URL รูปภาพ (หรือเว้นว่างไว้ใช้ placeholder)",
  "highlights": [
    "จุดเด่นข้อ 1",
    "จุดเด่นข้อ 2"
  ],
  "goodFor": "คำอธิบายว่าเหมาะกับใคร/อะไรดี"
}
```

**หมายเหตุ**:
- `grade` รองรับ 3 ค่า: `"PG"`, `"RG"`, `"MEGA SIZE"` (พิมพ์ใหญ่ตามนี้ เพื่อให้สีป้ายตรงกับ CSS) — ถ้าจะเพิ่มเกรดใหม่ (เช่น HG, MG) ต้องเพิ่ม CSS class คู่สี และปุ่ม filter ใน `index.html` เพิ่มด้วย
- `id` ต้องไม่ซ้ำกัน แนะนำใช้รูปแบบ `เกรด-ชื่อย่อ` เช่น `pg-deathscythe`
- ราคาบาทคำนวณอัตโนมัติจาก `priceYen × meta.exchangeRate` ไม่ต้องคำนวณเอง

### การอัปเดตอัตราแลกเปลี่ยน

แก้ที่ `data/gundam-data.json` ส่วน `meta`:
```json
"meta": {
  "exchangeRate": 0.2045,
  "lastUpdated": "2026-06-19"
}
```

### การใส่รูปภาพจริง

ตอนนี้เว็บใช้ SVG placeholder (ไอคอนหัวมอบิลสูทแบบ blueprint) แทนรูปจริง เพราะ:
- ลิงก์รูปจาก bandai-hobby.net ส่วนใหญ่เปลี่ยน URL บ่อยและบล็อก hotlink
- เพื่อความเสถียรและไม่ละเมิดลิขสิทธิ์ภาพ

วิธีใส่รูปจริงของคุณเอง:
1. เซฟรูปสินค้าใส่โฟลเดอร์ `img/` เช่น `img/pg-rx78-2.jpg`
2. แก้ field `"image"` ในแต่ละ model ให้เป็น path เช่น `"image": "img/pg-rx78-2.jpg"`
3. แก้ใน `js/app.js` ฟังก์ชัน `placeholderSVG()` ให้เช็คว่าถ้า `m.image` เป็น path จริง ให้ใช้ `<img src="${m.image}">` แทน SVG (ปัจจุบันโค้ดยังไม่ได้ wire ส่วนนี้ไว้ ต้องเพิ่มเอง หรือแจ้งให้ช่วยทำต่อได้)

## ฟีเจอร์

- 🔍 ค้นหาชื่อรุ่น/ซีรีส์
- 🏷️ กรองตามเกรด (PG / RG / MEGA SIZE / ทั้งหมด)
- ↕️ เรียงตามชื่อ, ราคา, ความสูง, ปีออก
- ✅ เลือกได้สูงสุด 4 ตัวต่อครั้ง (เพื่อให้ตารางเทียบยังอ่านง่าย)
- 📊 ตารางเปรียบเทียบแบบ side-by-side พร้อมราคาเยน+บาท

## ข้อจำกัดของข้อมูลชุดนี้

- ครอบคลุม PG 15 ตัว, RG 12 ตัว, MEGA SIZE 5 ตัว (รุ่นยอดนิยม/หาซื้อง่าย) — ยังไม่ครบทุกรุ่นที่เคยออกขาย
- ราคาเป็น MSRP ทางการของบันได (ราคาหน้าตู้ญี่ปุ่น รวมภาษี) ไม่ใช่ราคาขายจริงในไทยซึ่งมักมีค่าส่ง/นำเข้า/กำไรร้านบวกเพิ่ม
- อัตราแลกเปลี่ยนคงที่ ไม่ใช่ realtime — ควรเช็คอัตราจริงก่อนตัดสินใจซื้อจริง
