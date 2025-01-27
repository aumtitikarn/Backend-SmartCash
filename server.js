const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const { GridFSBucket } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Product = require('./models/product');
const User = require('./models/user');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection - ใช้การเชื่อมต่อแบบที่ทำงานได้
mongoose
  .connect('mongodb+srv://aumtitikarn003:16250734925Aum@digitechspace.woy4von.mongodb.net/SmartCash?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// GridFS setup
let gfs;
const initializeGridFS = async () => {
  try {
    const client = await MongoClient.connect('mongodb+srv://aumtitikarn003:16250734925Aum@digitechspace.woy4von.mongodb.net/SmartCash?retryWrites=true&w=majority');
    const db = client.db();
    gfs = new GridFSBucket(db, {
      bucketName: 'uploads'
    });
    console.log('GridFS initialized');
  } catch (err) {
    console.error('Error initializing GridFS:', err);
  }
};

// Initialize GridFS after MongoDB connection
initializeGridFS();

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// API endpoint สำหรับอัพโหลดรูปภาพ
app.post('/upload', upload.single('image'), (req, res) => {
  if (req.file) {
    res.json({ fileId: req.file.id });
  } else {
    res.status(400).json({ message: 'No file uploaded' });
  }
});

// Get image endpoint
app.get('/images/:id', async (req, res) => {
  try {
    const _id = new mongoose.Types.ObjectId(req.params.id);
    const files = await gfs.find({ _id }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรูปภาพ'
      });
    }
    res.set('Content-Type', files[0].contentType);
    const downloadStream = gfs.openDownloadStream(_id);
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error getting image:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรูปภาพ'
    });
  }
});

// Login endpoint (your working version)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Received email:', email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    console.log('User found:', user);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Product Routes
app.post('/products', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { lotDate, cost } = req.body;
    const product = new Product({
      lotDate,
      cost: Number(cost),
      listProduct: []
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ lotDate: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// เพิ่มสินค้าพร้อมรูปภาพ
app.post('/addproducts/:productId', upload.single('image'), async (req, res) => {
  let uploadStream;
  try {
    const { productId } = req.params;
    const { productName, category, price } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบล็อตสินค้า'
      });
    }

    let imageId = null;

    if (req.file) {
      const filename = `${Date.now()}-${req.file.originalname}`;
      uploadStream = gfs.openUploadStream(filename, {
        contentType: req.file.mimetype
      });
      imageId = uploadStream.id;

      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error', reject);
        uploadStream.end(req.file.buffer);
      });
    }

    const listProduct = {
      name: productName,
      category,
      price: Number(price),
      image: imageId
    };

    product.listProduct.push(listProduct);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'เพิ่มสินค้าสำเร็จ',
      data: product
    });

  } catch (error) {
    if (uploadStream && uploadStream.id) {
      try {
        await gfs.delete(uploadStream.id);
      } catch (deleteError) {
        console.error('Error deleting failed upload:', deleteError);
      }
    }
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการอัพโหลด'
    });
  }
});

// เพิ่ม endpoint สำหรับดึงข้อมูลสินค้าในล็อตที่ระบุ
app.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // ค้นหาล็อตสินค้าตาม ID
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบล็อตสินค้า'
      });
    }

    // ส่งข้อมูลล็อตและรายการสินค้ากลับไป
    res.status(200).json({
      success: true,
      data: {
        lotDate: product.lotDate,
        cost: product.cost,
        listProduct: product.listProduct
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});


// Root route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)'
      });
    }
    return res.status(400).json({
      success: false,
      message: `เกิดข้อผิดพลาดในการอัพโหลด: ${err.message}`
    });
  }
  res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
  });
});

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));