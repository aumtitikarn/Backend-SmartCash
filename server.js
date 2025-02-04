const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const { GridFSBucket } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Product = require('./models/product');
const User = require('./models/user');
const Order = require('./models/Order');

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

//เพิ่มข้อมูลตะกร้าสินค้า
app.post('/orders', async (req, res) => {
  try {
    console.log('Received data:', req.body); // Log incoming data
    
    const { items, totalAmount } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid items data'
      });
    }

    // Transform the items to match the schema
    const transformedItems = items.map(item => ({
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      barcode: item.barcode
    }));

    console.log('Transformed items:', transformedItems); // Log transformed data

    const order = new Order({
      items: transformedItems,
      totalAmount
    });

    console.log('Order before save:', order); // Log order object

    const savedOrder = await order.save();
    
    console.log('Saved order:', savedOrder); // Log saved order

    // Clear cart items from AsyncStorage after successful save
    res.status(201).json({
      success: true,
      data: savedOrder
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถบันทึกคำสั่งซื้อได้',
      details: error.message
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

app.patch('/products/updatebarcode/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { productItemId } = req.body;

    const product = await Product.findOneAndUpdate(
      { 
        _id: productId,
        'listProduct._id': productItemId 
      },
      {
        $set: {
          'listProduct.$.barcode': productItemId // ใช้ _id ของ listProduct เป็น barcode
        }
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสินค้าที่ต้องการอัพเดต'
      });
    }

    res.json({
      success: true,
      message: 'อัพเดตบาร์โค้ดเรียบร้อยแล้ว',
      data: product
    });

  } catch (error) {
    console.error('Error updating barcode:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดตบาร์โค้ด'
    });
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
    const { productName, category, price, quantity } = req.body;

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
      image: imageId,
      quantity: Number(quantity),
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

app.get('/products/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    
    // ค้นหาสินค้าใน listProduct ของทุกล็อต
    const products = await Product.find({
      "listProduct._id": barcode
    });
    
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสินค้า'
      });
    }

    // หาสินค้าที่ตรงกับ barcode
    const product = products[0];
    const item = product.listProduct.find(item => item._id.toString() === barcode);

    res.status(200).json({
      success: true,
      data: {
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        barcode: item._id
      }
    });

  } catch (error) {
    console.error('Error finding product:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาสินค้า'
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