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
    console.log('Received data:', req.body);

    const { items, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Invalid items data:', items);
      return res.status(400).json({
        success: false,
        error: 'Invalid items data'
      });
    }

    // Transform items and validate all required fields
    const transformedItems = items.map((item, index) => {
      // Check all required fields
      const requiredFields = ['name', 'quantity', 'price', 'category', 'barcode', 'image'];
      const missingFields = requiredFields.filter(field => !item[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')} in item ${index + 1}`);
      }

      if (item.quantity < 1) {
        throw new Error(`Invalid quantity for item ${index + 1}: ${item.name}`);
      }

      return {
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.category,
        barcode: item.barcode,
        image: item.image
      };
    });

    console.log('Transformed items:', transformedItems);

    // Create and save order
    const order = new Order({
      items: transformedItems,
      totalAmount
    });

    console.log('Order before save:', order);

    const savedOrder = await order.save();
    console.log('Order saved successfully:', savedOrder._id);

    res.status(201).json({
      success: true,
      data: savedOrder
    });

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    if (error.message.includes('Missing required fields')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

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

//ดึงข้อมูล order ทั้งหมด
app.get('/dashboard/:monthYear', async (req, res) => {
  try {
    const { monthYear } = req.params;
    const [month, year] = monthYear.split('-').map(Number);
    
    // Create date range for the selected month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // Fetch orders for the selected month
    const orders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Fetch all products to get costs
    const products = await Product.find();

    // Calculate total sales and gather product statistics
    let totalSales = 0;
    let totalCost = 0;
    const productStats = {};

    // Process orders
    orders.forEach(order => {
      totalSales += order.totalAmount;
      
      // Process each item in the order
      order.items.forEach(item => {
        if (!productStats[item.productName]) {
          productStats[item.productName] = {
            name: item.productName,
            category: item.category,
            totalSales: 0,
            quantitySold: 0,
            revenue: 0
          };
        }
        
        productStats[item.productName].quantitySold += item.quantity;
        productStats[item.productName].revenue += item.price * item.quantity;
        productStats[item.productName].totalSales += 1;
      });
    });

    // Calculate total cost from products
    products.forEach(product => {
      totalCost += product.cost || 0;
    });

    // Convert productStats object to array and sort by revenue
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Get top 5 products

    // Calculate total profit
    const totalProfit = totalSales - totalCost;

    res.json({
      success: true,
      data: {
        totalSales,
        totalCost,
        totalProfit,
        topProducts,
        orderCount: orders.length,
        monthlyStats: {
          month,
          year,
          totalSales,
          totalProfit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard'
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

// ดึงข้อมูล user profile
app.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้งาน' 
      });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        ShopName: user.ShopName,
        ShopCode: user.ShopCode,
        employees: user.employees
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' 
    });
  }
});

// อัพเดตข้อมูล user profile
app.put('/users/:userId', async (req, res) => {
  try {
    const { ShopName, ShopCode, employees, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้งาน' 
      });
    }

    // ถ้ามีการส่งรหัสผ่านมาเปลี่ยน
    if (currentPassword && newPassword) {
      // ตรวจสอบรหัสผ่านปัจจุบัน
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' 
        });
      }

      // เข้ารหัสรหัสผ่านใหม่
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // อัพเดตข้อมูลอื่นๆ
    if (ShopCode !== undefined) user.ShopCode = ShopCode;
    if (ShopName !== undefined) user.ShopName = ShopName;
    if (employees !== undefined) user.employees = employees;

    await user.save();

    res.json({
      success: true,
      message: 'อัพเดตข้อมูลสำเร็จ',
      data: {
        email: user.email,
        productId: user.productId,
        productName: user.productName,
        employees: user.employees
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล' 
    });
  }
});

// แก้ไขข้อมูลล็อต
app.put('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { lotDate, cost } = req.body;

    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบล็อตสินค้า'
      });
    }

    // อัพเดตข้อมูล
    product.lotDate = lotDate;
    product.cost = Number(cost);
    
    await product.save();

    res.json({
      success: true,
      message: 'อัพเดตล็อตสินค้าสำเร็จ',
      data: product
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล'
    });
  }
});

// ลบล็อตสินค้า
app.delete('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบล็อตสินค้า'
      });
    }

    // ลบล็อตสินค้า
    await Product.findByIdAndDelete(productId);

    res.json({
      success: true,
      message: 'ลบล็อตสินค้าสำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อมูล'
    });
  }
});

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));