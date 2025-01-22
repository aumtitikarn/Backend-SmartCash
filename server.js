const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// เชื่อมต่อ MongoDB Atlas
mongoose
  .connect('mongodb+srv://aumtitikarn003:16250734925Aum@digitechspace.woy4von.mongodb.net/SmartCash?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// สร้าง Schema และ Model สำหรับ User
const UsersSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // รหัสผ่านต้องถูกแฮชไว้
});

const User = mongoose.model('users', UsersSchema);

// API สำหรับตรวจสอบการเข้าสู่ระบบ
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    console.log('Received email:', email);  // ตรวจสอบค่าที่ได้รับมาจาก client
  
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'ไม่พบผู้ใช้งาน' });
    }
  
    console.log('User found:', user);  // ตรวจสอบว่าเจอผู้ใช้หรือไม่
  
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }
  
    res.status(200).json({
        message: 'เข้าสู่ระบบสำเร็จ',
        userId: user._id,
        email: user.email,
      });
  });
  
  

// เพิ่มเส้นทาง root
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// เปิดใช้งานเซิร์ฟเวอร์
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
