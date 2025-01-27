// const express = require('express');
// const mongoose = require('mongoose');
// const multer = require('multer');
// const { MongoClient } = require('mongodb');
// const { GridFSBucket } = require('mongodb');
// const cors = require('cors');
// const Product = require('./models/product');
// const User = require('./models/user');

// const app = express();
// app.use(cors());
// app.use(express.json());
// // MongoDB Configuration
// const mongoURI = 'mongodb+srv://aumtitikarn003:16250734925Aum@digitechspace.woy4von.mongodb.net/SmartCash?retryWrites=true&w=majority';

// // GridFS setup
// let gfs;
// const connectDB = async () => {
//   try {
//     // Connect to MongoDB with Mongoose
//     await mongoose.connect(mongoURI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('Connected to MongoDB Atlas');

//     // Setup GridFS
//     const client = await MongoClient.connect(mongoURI);
//     const db = client.db();
//     gfs = new GridFSBucket(db, {
//       bucketName: 'uploads'
//     });
//     console.log('GridFS initialized');

//   } catch (err) {
//     console.error('Error connecting to MongoDB:', err);
//     process.exit(1);
//   }
// };

// connectDB();


// // Multer configuration
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only images are allowed'));
//     }
//   }
// });

// // API endpoint สำหรับอัพโหลดรูปภาพ
// app.post('/upload', upload.single('image'), (req, res) => {
//   if (req.file) {
//     res.json({ fileId: req.file.id });
//   } else {
//     res.status(400).json({ message: 'No file uploaded' });
//   }
// });

// // Get image endpoint
// app.get('/images/:id', async (req, res) => {
//   try {
//     const _id = new mongoose.Types.ObjectId(req.params.id);
    
//     // Check if file exists
//     const files = await gfs.find({ _id }).toArray();
//     if (!files || files.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'ไม่พบรูปภาพ'
//       });
//     }

//     // Set the content type
//     res.set('Content-Type', files[0].contentType);

//     // Create download stream
//     const downloadStream = gfs.openDownloadStream(_id);
//     downloadStream.pipe(res);

//   } catch (error) {
//     console.error('Error getting image:', error);
//     res.status(500).json({
//       success: false,
//       message: 'เกิดข้อผิดพลาดในการดึงรูปภาพ'
//     });
//   }
// });


// //เพิ่มคิวอาร์รี่สำหรับอัพเดตบาร์โค้ด
// app.patch('/products/updatebarcode/:productId', async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const { productItemId } = req.body;

//     const product = await Product.findOneAndUpdate(
//       { 
//         _id: productId,
//         'listProduct._id': productItemId 
//       },
//       {
//         $set: {
//           'listProduct.$.barcode': productItemId // ใช้ _id ของ listProduct เป็น barcode
//         }
//       },
//       { new: true }
//     );

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'ไม่พบสินค้าที่ต้องการอัพเดต'
//       });
//     }

//     res.json({
//       success: true,
//       message: 'อัพเดตบาร์โค้ดเรียบร้อยแล้ว',
//       data: product
//     });

//   } catch (error) {
//     console.error('Error updating barcode:', error);
//     res.status(500).json({
//       success: false,
//       message: 'เกิดข้อผิดพลาดในการอัพเดตบาร์โค้ด'
//     });
//   }
// });

// /// GET: ดึงข้อมูลล็อตสินค้าทั้งหมด
// app.get('/products', async (req, res) => {
//   try {
//     const products = await Product.find().sort({ lotDate: -1 }); // เรียงตามวันที่ล่าสุด
//     res.status(200).json(products);
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     res.status(500).json({ message: error.message });
//   }
// });

// // POST: เพิ่มล็อตสินค้าใหม่
// app.post('/products', async (req, res) => {
//   console.log('Request body:', req.body);
//   try {
//     const { lotDate, cost } = req.body;
//     const product = new Product({
//       lotDate,
//       cost: Number(cost),
//       listProduct: [] // เริ่มต้นด้วย array ว่าง
//     });
//     await product.save();
//     res.status(201).json(product);
//   } catch (error) {
//     console.error('Server error:', error);
//     res.status(500).json({ message: error.message });
//   }
// });


// app.post('/addproducts/:productId', upload.single('image'), async (req, res) => {
//   let uploadStream;
//   try {
//     const { productId } = req.params;
//     const { productName, category, price } = req.body;

//     // Find the product
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'ไม่พบล็อตสินค้า'
//       });
//     }

//     let imageId = null;

//     // Upload image if exists
//     if (req.file) {
//       // Create a unique filename
//       const filename = `${Date.now()}-${req.file.originalname}`;
      
//       // Create upload stream
//       uploadStream = gfs.openUploadStream(filename, {
//         contentType: req.file.mimetype
//       });

//       // Store file id
//       imageId = uploadStream.id;

//       // Upload the file
//       await new Promise((resolve, reject) => {
//         uploadStream.on('finish', resolve);
//         uploadStream.on('error', reject);
//         uploadStream.end(req.file.buffer);
//       });
//     }

//     // Create product data
//     const listProduct = {
//       name: productName,
//       category,
//       price: Number(price),
//       image: imageId
//     };

//     // Add product to lot
//     product.listProduct.push(listProduct);
//     await product.save();

//     res.status(201).json({
//       success: true,
//       message: 'เพิ่มสินค้าสำเร็จ',
//       data: product
//     });

//   } catch (error) {
//     // If error occurs and upload stream exists, abort it
//     if (uploadStream && uploadStream.id) {
//       try {
//         await gfs.delete(uploadStream.id);
//       } catch (deleteError) {
//         console.error('Error deleting failed upload:', deleteError);
//       }
//     }

//     console.error('Upload error:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'เกิดข้อผิดพลาดในการอัพโหลด'
//     });
//   }
// });

// // เพิ่ม endpoint สำหรับดึงข้อมูลสินค้าในล็อตที่ระบุ
// app.get('/products/:productId', async (req, res) => {
//   try {
//     const { productId } = req.params;
    
//     // ค้นหาล็อตสินค้าตาม ID
//     const product = await Product.findById(productId);
    
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'ไม่พบล็อตสินค้า'
//       });
//     }

//     // ส่งข้อมูลล็อตและรายการสินค้ากลับไป
//     res.status(200).json({
//       success: true,
//       data: {
//         lotDate: product.lotDate,
//         cost: product.cost,
//         listProduct: product.listProduct
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching products:', error);
//     res.status(500).json({
//       success: false,
//       message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
//     });
//   }
// });

// // API สำหรับตรวจสอบการเข้าสู่ระบบ
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
  
//     console.log('Received email:', email);  // ตรวจสอบค่าที่ได้รับมาจาก client
  
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'ไม่พบผู้ใช้งาน' });
//     }
  
//     console.log('User found:', user);  // ตรวจสอบว่าเจอผู้ใช้หรือไม่
  
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
//     }
  
//     res.status(200).json({
//         message: 'เข้าสู่ระบบสำเร็จ',
//         userId: user._id,
//         email: user.email,
//       });
//   });
  
  
// // เพิ่มเส้นทาง root
// app.get('/', (req, res) => {
//   res.send('Hello, World!');
// });

// // server.js
// app.post('/products', async (req, res) => {
//   console.log('Request body:', req.body); // เพิ่มบรรทัดนี้
//   try {
//     const { lotDate, cost } = req.body;
//     const product = new Product({
//       lotDate,
//       cost
//     });
//     await product.save();
//     res.status(201).json(product);
//   } catch (error) {
//     console.error('Server error:', error);
//     res.status(500).json({ message: error.message });
//   }
// });

// app.get('/products', async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.status(200).json(products);
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     res.status(500).json({ message: error.message });
//   }
//  });
//  // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err);
//   if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({
//         success: false,
//         message: 'ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)'
//       });
//     }
//     return res.status(400).json({
//       success: false,
//       message: `เกิดข้อผิดพลาดในการอัพโหลด: ${err.message}`
//     });
//   }
//   res.status(500).json({
//     success: false,
//     message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
//   });
// });


// // Server startup
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const User = require('./models/user');
const Product = require('./models/product');

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

// server.js
app.post('/products', async (req, res) => {
  console.log('Request body:', req.body); // เพิ่มบรรทัดนี้
  try {
    const { lotDate, cost } = req.body;
    const product = new Product({
      lotDate,
      cost
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
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
 });

// เปิดใช้งานเซิร์ฟเวอร์
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));