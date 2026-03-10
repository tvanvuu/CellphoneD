const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));
// Cấu hình kết nối (Sửa lại đúng tên DB và mật khẩu của bạn)
const config = {
    user: process.env.DB_USER || 'sa', // Dùng biến môi trường cho bảo mật
    password: process.env.DB_PASSWORD || '123456', 
    server: process.env.DB_SERVER || 'dia-chi-ip-public-cua-ban', // Sẽ thay bằng IP thật sau
    database: 'ecommerce_db',
    options: {
        trustServerCertificate: true,
        connectTimeout: 30000 // Tăng thời gian chờ kết nối lên 30s
    }
};

// API 1: LẤY DANH SÁCH SẢN PHẨM (Vu)
app.get('/api/products', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT 
                v.VariantID,
                p.ProductName, 
                v.Price, 
                v.Storage, 
                v.Color, 
                c.CategoryName,
                (SELECT TOP 1 ImageURL FROM ProductImages img WHERE img.VariantID = v.VariantID) AS ImageUrl
            FROM Products p
            JOIN ProductVariants v ON p.ProductID = v.ProductID
            JOIN Categories c ON p.CategoryID = c.CategoryID
            WHERE p.IsActive = 1 
              AND v.IsActive = 1
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API 2: LẤY DANH SÁCH ĐƠN HÀNG (Vu)
app.get('/api/orders/:phone', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('phone', sql.VarChar, req.params.phone)
            .query(`
                SELECT 
                    o.OrderID, o.TotalAmount, o.OrderStatus, o.CreatedAt, o.PaymentMethod,
                    p.ProductName, v.Color, v.Storage, oi.Quantity, oi.Price, u.FullName,
                    ua.AddressDetail,
                    s.Carrier, s.TrackingCode -- <-- THÊM LẤY DỮ LIỆU VẬN ĐƠN
                FROM Orders o
                JOIN Users u ON o.UserID = u.UserID
                JOIN OrderItems oi ON o.OrderID = oi.OrderID
                JOIN ProductVariants v ON oi.VariantID = v.VariantID
                JOIN Products p ON v.ProductID = p.ProductID
                JOIN UserAddresses ua ON o.AddressID = ua.AddressID
                LEFT JOIN Shipments s ON o.OrderID = s.OrderID -- <-- KẾT NỐI VỚI BẢNG GIAO HÀNG
                WHERE u.Phone = @phone
                ORDER BY o.OrderID DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// API 3: LẤY CHI TIẾT SẢN PHẨM, MÀU SẮC & THÔNG SỐ KỸ THUẬT
app.get('/api/product-detail/:name', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        
        // 1. Lấy thông tin cơ bản
        let result = await pool.request()
            .input('pname', sql.NVarChar, req.params.name)
            .query(`
                SELECT 
                    p.ProductID, p.ProductName, p.Description, 
                    v.VariantID, v.Price, v.Color, v.Storage,
                    (SELECT TOP 1 ImageURL FROM ProductImages img WHERE img.VariantID = v.VariantID) AS ImageUrl
                FROM Products p
                JOIN ProductVariants v ON p.ProductID = v.ProductID
                WHERE p.ProductName = @pname
                AND p.IsActive = 1 AND v.IsActive = 1
            `);
        
        let variants = result.recordset;

        // 2. Lấy thêm thông số kỹ thuật (Quét qua các bảng Specifications của bạn)
        if (variants.length > 0) {
            for (let variant of variants) {
                let specResult = await pool.request()
                    .input('vid', sql.BigInt, variant.VariantID)
                    .query(`
                        SELECT s.SpecName, vs.SpecValue 
                        FROM VariantSpecifications vs
                        JOIN Specifications s ON vs.SpecID = s.SpecID
                        WHERE vs.VariantID = @vid
                    `);
                // Gắn mảng thông số vào từng phiên bản
                variant.Specs = specResult.recordset; 
            }
        }

        res.json(variants);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API 4: LẤY BÌNH LUẬN & ĐÁNH GIÁ
app.get('/api/reviews/:productid', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('pid', sql.Int, req.params.productid)
            .query(`
                SELECT r.Rating, r.Comment, u.FullName, r.CreatedAt
                FROM Reviews r, ProductVariants v, Users u
                WHERE r.VariantID = v.VariantID 
                  AND r.UserID = u.UserID 
                  AND v.ProductID = @pid
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API 5: LẤY DANH SÁCH TỈNH / THÀNH PHỐ
app.get('/api/provinces', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT ProvinceID, ProvinceName 
            FROM Provinces
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API 6: LẤY DANH SÁCH QUẬN / HUYỆN THEO TỈNH
app.get('/api/districts/:provinceId', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('provId', sql.Int, req.params.provinceId)
            .query(`
                SELECT DistrictID, DistrictName 
                FROM Districts 
                WHERE ProvinceID = @provId
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API 7: THÊM SẢN PHẨM MỚI (TỪ TRANG ADMIN)
app.post('/api/admin/add-product', async (req, res) => {
    try {
        // Nhận thêm biến stock từ Frontend
        const { name, catId, price, color, storage, stock } = req.body;
        let pool = await sql.connect(config);
        
        const brandId = req.body.brandId;
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now(); 
        
        let resultProd = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('catId', sql.SmallInt, catId)
            .input('brandId', sql.SmallInt, brandId)
            .input('slug', sql.VarChar, slug)
            .query(`
                INSERT INTO Products (ProductName, CategoryID, BrandID, Slug, IsActive, CreatedAt)
                OUTPUT INSERTED.ProductID
                VALUES (@name, @catId, @brandId, @slug, 1, GETDATE());
            `);
            
        let newProductId = resultProd.recordset[0].ProductID;
        const sku = 'SKU-' + newProductId + '-' + Date.now();

        // BƯỚC B: Lưu thêm biến @stock vào bảng ProductVariants
        await pool.request()
            .input('prodId', sql.BigInt, newProductId)
            .input('price', sql.Decimal, price)
            .input('color', sql.NVarChar, color)
            .input('storage', sql.NVarChar, storage || '')
            .input('sku', sql.VarChar, sku)
            .input('stock', sql.Int, stock || 0) // <-- THÊM DÒNG NÀY
            .query(`
                INSERT INTO ProductVariants (ProductID, Price, Color, Storage, SKU, Stock, IsActive)
                VALUES (@prodId, @price, @color, @storage, @sku, @stock, 1);
            `);

        res.status(200).send('Đã thêm sản phẩm thành công vào Cửa hàng!');
    } catch (err) {
        res.status(500).send('Lỗi SQL Server: ' + err.message);
    }
});

// API 8: LẤY DANH SÁCH SẢN PHẨM 
app.get('/api/admin/products', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT p.ProductID, p.ProductName, p.CategoryID, p.BrandID, 
                   v.Price, v.Storage, v.Color, v.Stock, c.CategoryName, p.IsActive -- Đã thêm v.Stock
            FROM Products p, ProductVariants v, Categories c
            WHERE p.ProductID = v.ProductID AND p.CategoryID = c.CategoryID
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// 8.1. API DÀNH CHO DROPDOWN FORM TRANG ADMIN
// Lấy danh sách Danh mục
app.get('/api/admin/categories', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`SELECT CategoryID, CategoryName FROM Categories WHERE IsActive = 1`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// Lấy danh sách Thương hiệu
app.get('/api/admin/brands', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`SELECT BrandID, BrandName FROM Brands`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// API 9A: XOÁ SẢN PHẨM (GIỮ NGUYÊN DỮ LIỆU TRONG DB, CHỈ CẬP NHẬT TRẠNG THÁI ISACTIVE) (Vu)
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Products SET IsActive = 0 WHERE ProductID = @id;
                UPDATE ProductVariants SET IsActive = 0 WHERE ProductID = @id;
            `);
        res.send('Đã xoá (ẩn) sản phẩm thành công!');
    } catch (err) { res.status(500).send(err.message); }
});

// API 9B: KHÔI PHỤC SẢN PHẨM (ĐỔI TRẠNG THÁI ISACTIVE VỀ 1 ĐỂ HIỆN LẠI TRÊN CỬA HÀNG) (Vu)
app.put('/api/admin/products/:id/restore', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Products SET IsActive = 1 WHERE ProductID = @id;
                UPDATE ProductVariants SET IsActive = 1 WHERE ProductID = @id;
            `);
        res.send('✅ Đã khôi phục sản phẩm quay lại Cửa hàng!');
    } catch (err) { res.status(500).send(err.message); }
});

// API 10: QUẢN LÝ ĐƠN HÀNG (XEM TOÀN BỘ & ĐỔI TRẠNG THÁI & LƯU VẬN ĐƠN)
app.get('/api/admin/orders', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        // Bổ sung LEFT JOIN với bảng Shipments để lấy Carrier và TrackingCode
        let result = await pool.request().query(`
            SELECT o.OrderID, o.TotalAmount, o.OrderStatus, o.CreatedAt, o.PaymentMethod, u.FullName, u.Phone,
                   s.Carrier, s.TrackingCode
            FROM Orders o
            JOIN Users u ON o.UserID = u.UserID
            LEFT JOIN Shipments s ON o.OrderID = s.OrderID
            ORDER BY o.OrderID DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/admin/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, carrier, trackingCode } = req.body; // Nhận thêm dữ liệu vận chuyển
        
        let pool = await sql.connect(config);
        
        // 1. Cập nhật trạng thái đơn hàng
        await pool.request()
            .input('id', sql.Int, orderId)
            .input('status', sql.Int, status)
            .query(`UPDATE Orders SET OrderStatus = @status WHERE OrderID = @id`);

        // 2. Nếu trạng thái là 3 (Đang giao) -> Lưu vào bảng Shipments
        if (status == 3 && carrier) {
            // Kiểm tra xem đơn này đã có mã vận đơn chưa
            let checkShip = await pool.request().input('id', sql.Int, orderId).query('SELECT ShipmentID FROM Shipments WHERE OrderID = @id');
            
            if (checkShip.recordset.length > 0) {
                // Đã có -> Cập nhật mã mới
                await pool.request()
                    .input('id', sql.Int, orderId)
                    .input('carrier', sql.NVarChar, carrier)
                    .input('code', sql.VarChar, trackingCode || '')
                    .query('UPDATE Shipments SET Carrier = @carrier, TrackingCode = @code WHERE OrderID = @id');
            } else {
                // Chưa có -> Thêm mới
                await pool.request()
                    .input('id', sql.Int, orderId)
                    .input('carrier', sql.NVarChar, carrier)
                    .input('code', sql.VarChar, trackingCode || '')
                    .query('INSERT INTO Shipments (OrderID, Carrier, TrackingCode, Status, ShippedAt) VALUES (@id, @carrier, @code, 1, GETDATE())');
            }
        }

        res.send('Cập nhật trạng thái và Vận đơn thành công!');
    } catch (err) { res.status(500).send(err.message); }
});

// API 11: CẬP NHẬT (SỬA) SẢN PHẨM
app.put('/api/admin/products/:id', async (req, res) => {
    try {
        // Nhận thêm biến stock
        const { name, catId, brandId, price, color, storage, stock } = req.body;
        let pool = await sql.connect(config);
        
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('catId', sql.SmallInt, catId)
            .input('brandId', sql.SmallInt, brandId)
            .query(`UPDATE Products SET ProductName = @name, CategoryID = @catId, BrandID = @brandId WHERE ProductID = @id`);

        // Cập nhật thêm cột Stock
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('price', sql.Decimal, price)
            .input('color', sql.NVarChar, color)
            .input('storage', sql.NVarChar, storage || '')
            .input('stock', sql.Int, stock || 0) // <-- THÊM DÒNG NÀY
            .query(`UPDATE ProductVariants SET Price = @price, Color = @color, Storage = @storage, Stock = @stock WHERE ProductID = @id`);

        res.send('✅ Đã cập nhật sản phẩm thành công!');
    } catch (err) { res.status(500).send('Lỗi cập nhật: ' + err.message); }
});

// API 12: QUẢN LÝ KHÁCH HÀNG 

// 12.1 Lấy danh sách khách hàng
app.get('/api/admin/users', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        // Lấy thêm cột Status để biết ai đang bị khóa
        let result = await pool.request().query(`SELECT UserID, FullName, Phone, Status FROM Users ORDER BY UserID DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// 12.2 Thêm khách hàng mới
app.post('/api/admin/users', async (req, res) => {
    try {
        const { name, phone } = req.body;
        let pool = await sql.connect(config);
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('phone', sql.VarChar, phone)
            .query(`INSERT INTO Users (FullName, Phone, Status, CreatedAt) VALUES (@name, @phone, 1, GETDATE())`);
        res.send('✅ Đã thêm khách hàng mới thành công!');
    } catch (err) { 
        // Bắt lỗi trùng số điện thoại (Unique Constraint)
        if(err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(400).send('Số điện thoại này đã tồn tại trong hệ thống!');
        } else {
            res.status(500).send('Lỗi thêm KH: ' + err.message); 
        }
    }
});

// 12.3 Cập nhật (Sửa) thông tin khách hàng
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { name, phone } = req.body;
        let pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.BigInt, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('phone', sql.VarChar, phone)
            .query(`UPDATE Users SET FullName = @name, Phone = @phone, UpdatedAt = GETDATE() WHERE UserID = @id`);
        res.send('✅ Đã cập nhật thông tin khách hàng!');
    } catch (err) { res.status(500).send('Lỗi cập nhật KH: ' + err.message); }
});

// 12.4 Khóa (Xóa mềm) khách hàng
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.BigInt, req.params.id)
            .query(`UPDATE Users SET Status = 0 WHERE UserID = @id`);
        res.send('Đã khóa tài khoản khách hàng này!');
    } catch (err) { res.status(500).send(err.message); }
});

// 12.5 Khôi phục (Mở khóa) khách hàng
app.put('/api/admin/users/:id/restore', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.BigInt, req.params.id)
            .query(`UPDATE Users SET Status = 1 WHERE UserID = @id`);
        res.send('✅ Đã khôi phục hoạt động cho khách hàng!');
    } catch (err) { res.status(500).send(err.message); }
});

// API 13: ĐẶT HÀNG
app.post('/api/checkout', async (req, res) => {
    try {
        const { phone, cart, totalAmount, addressString, paymentMethod } = req.body;
        let pool = await sql.connect(config);

        // 1. Tìm hoặc tạo User
        let userResult = await pool.request()
            .input('phone', sql.VarChar(20), phone)
            .query('SELECT UserID FROM Users WHERE Phone = @phone');
        
        let userId;
        if (userResult.recordset.length > 0) {
            userId = userResult.recordset[0].UserID;
        } else {
            let newUser = await pool.request()
                .input('phone', sql.VarChar(20), phone)
                .query(`INSERT INTO Users (Phone, FullName, Status, CreatedAt) OUTPUT INSERTED.UserID VALUES (@phone, N'Khách hàng ' + @phone, 1, GETDATE())`);
            userId = newUser.recordset[0].UserID;
        }

        // 2. Xử lý AddressID
        let addressId; // Khai báo biến ở phạm vi cao nhất của hàm

        if (addressString) {
            // Nếu có địa chỉ mới gửi lên từ Client
            let newAddr = await pool.request()
                .input('userId', sql.BigInt, userId)
                .input('detail', sql.NVarChar, addressString)
                .query(`
                    INSERT INTO UserAddresses (UserID, DistrictID, AddressDetail, IsDefault) 
                    OUTPUT INSERTED.AddressID 
                    VALUES (@userId, 1, @detail, 0)
                `);
            addressId = newAddr.recordset[0].AddressID;
        } else {
            // Nếu không có địa chỉ gửi kèm, tìm địa chỉ cũ trong DB
            let addrResult = await pool.request()
                .input('userId', sql.BigInt, userId)
                .query('SELECT TOP 1 AddressID FROM UserAddresses WHERE UserID = @userId');
            
            if (addrResult.recordset.length > 0) {
                addressId = addrResult.recordset[0].AddressID;
            } else {
                // Tạo địa chỉ mặc định nếu User chưa từng có địa chỉ
                let newAddrDefault = await pool.request()
                    .input('userId', sql.BigInt, userId)
                    .query(`INSERT INTO UserAddresses (UserID, DistrictID, AddressDetail, IsDefault) OUTPUT INSERTED.AddressID VALUES (@userId, 1, N'Địa chỉ mặc định', 1)`);
                addressId = newAddrDefault.recordset[0].AddressID;
            }
        }

        // 3. Tạo Đơn hàng (Cập nhật truy vấn INSERT)
        let orderResult = await pool.request()
            .input('userId', sql.BigInt, userId)
            .input('addressId', sql.BigInt, addressId)
            .input('total', sql.Decimal(19,0), totalAmount)
            .input('payment', sql.NVarChar(50), paymentMethod || 'COD') // Thêm tham số này
            .query(`
                INSERT INTO Orders (UserID, AddressID, OrderStatus, TotalAmount, PaymentMethod, CreatedAt) 
                OUTPUT INSERTED.OrderID 
                VALUES (@userId, @addressId, 1, @total, @payment, GETDATE())
            `);
        let newOrderId = orderResult.recordset[0].OrderID;

        // 4. Lưu chi tiết đơn hàng VÀ Tự động trừ tồn kho
        for (let item of cart) {
            // 4.1 Lưu sản phẩm khách mua vào hóa đơn (OrderItems)
            await pool.request()
                .input('orderId', sql.BigInt, newOrderId)
                .input('variantId', sql.BigInt, item.VariantID)
                .input('price', sql.Decimal(19,0), item.Price)
                .input('qty', sql.Int, item.qty)
                .query(`INSERT INTO OrderItems (OrderID, VariantID, Price, Quantity) VALUES (@orderId, @variantId, @price, @qty)`);

            // 4.2 Tự động trừ số lượng máy trong kho (ProductVariants)
            // (Dùng CASE WHEN để đảm bảo kho không bao giờ bị âm số lượng)
            await pool.request()
                .input('variantId', sql.BigInt, item.VariantID)
                .input('qty', sql.Int, item.qty)
                .query(`
                    UPDATE ProductVariants 
                    SET Stock = CASE 
                                    WHEN Stock - @qty < 0 THEN 0 
                                    ELSE Stock - @qty 
                                END 
                    WHERE VariantID = @variantId
                `);
        }

        res.status(200).json({ success: true, orderId: newOrderId });
    } catch (err) {
        console.error("Lỗi đặt hàng:", err);
        res.status(500).json({ error: err.message });
    }
});

// API 14: THÊM / XÓA SẢN PHẨM YÊU THÍCH (TOGGLE)
app.post('/api/favorites/toggle', async (req, res) => {
    try {
        const { phone, variantId } = req.body; // Đổi thành variantId
        let pool = await sql.connect(config);

        // Tìm UserID
        let userRes = await pool.request().input('phone', sql.VarChar, phone).query('SELECT UserID FROM Users WHERE Phone = @phone');
        if (userRes.recordset.length === 0) return res.status(404).send('Vui lòng đăng nhập!');
        let userId = userRes.recordset[0].UserID;

        // Kiểm tra xem máy này đã được thả tim chưa
        let checkRes = await pool.request()
            .input('userId', sql.BigInt, userId)
            .input('varId', sql.BigInt, variantId)
            .query('SELECT FavoriteID FROM Favorites WHERE UserID = @userId AND VariantID = @varId');

        if (checkRes.recordset.length > 0) {
            // Đã có -> Xóa
            await pool.request().input('favId', sql.BigInt, checkRes.recordset[0].FavoriteID).query('DELETE FROM Favorites WHERE FavoriteID = @favId');
            res.json({ status: 'removed' });
        } else {
            // Chưa có -> Lưu
            await pool.request()
                .input('userId', sql.BigInt, userId)
                .input('varId', sql.BigInt, variantId)
                .query('INSERT INTO Favorites (UserID, VariantID) VALUES (@userId, @varId)');
            res.json({ status: 'added' });
        }
    } catch (err) { res.status(500).send(err.message); }
});

// API 15: LẤY DANH SÁCH YÊU THÍCH CỦA USER
app.get('/api/favorites/:phone', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('phone', sql.VarChar, req.params.phone)
            .query(`
                SELECT p.ProductName, v.VariantID, v.Price, v.Storage, v.Color,
                    (SELECT TOP 1 ImageURL FROM ProductImages img WHERE img.VariantID = v.VariantID) AS ImageUrl
                FROM Favorites f
                JOIN Users u ON f.UserID = u.UserID
                JOIN ProductVariants v ON f.VariantID = v.VariantID
                JOIN Products p ON v.ProductID = p.ProductID
                WHERE u.Phone = @phone AND p.IsActive = 1 AND v.IsActive = 1
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// API 16: THỐNG KÊ DOANH THU & BÁN HÀNG

// 16.1 Thống kê doanh thu 7 ngày gần nhất
app.get('/api/admin/stats/revenue', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        // Lấy tổng tiền các đơn (không tính đơn Đã Hủy - Status = 4) trong 7 ngày qua
        let result = await pool.request().query(`
            SELECT 
                CAST(CreatedAt AS DATE) as Date, 
                SUM(TotalAmount) as DailyRevenue
            FROM Orders
            WHERE OrderStatus != 4 AND CreatedAt >= DATEADD(day, -7, GETDATE())
            GROUP BY CAST(CreatedAt AS DATE)
            ORDER BY Date ASC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// 16.2 Top 5 sản phẩm bán chạy nhất
app.get('/api/admin/stats/top-products', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT TOP 5 
                p.ProductName, 
                SUM(oi.Quantity) as TotalSold
            FROM OrderItems oi
            JOIN ProductVariants v ON oi.VariantID = v.VariantID
            JOIN Products p ON v.ProductID = p.ProductID
            JOIN Orders o ON oi.OrderID = o.OrderID
            WHERE o.OrderStatus != 4
            GROUP BY p.ProductName
            ORDER BY TotalSold DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// API 17: THÊM BÌNH LUẬN ĐÁNH GIÁ MỚI
app.post('/api/reviews', async (req, res) => {
    try {
        const { phone, variantId, rating, comment } = req.body;
        let pool = await sql.connect(config);

        // 1. Tìm UserID dựa trên Số điện thoại
        let userRes = await pool.request().input('phone', sql.VarChar, phone).query('SELECT UserID FROM Users WHERE Phone = @phone');
        if (userRes.recordset.length === 0) return res.status(404).send('Vui lòng đăng nhập để đánh giá!');
        let userId = userRes.recordset[0].UserID;

        // 2. Lưu Đánh giá vào Database
        await pool.request()
            .input('variantId', sql.BigInt, variantId)
            .input('userId', sql.BigInt, userId)
            .input('rating', sql.TinyInt, rating)
            .input('comment', sql.NVarChar(500), comment)
            .query(`INSERT INTO Reviews (VariantID, UserID, Rating, Comment, CreatedAt) VALUES (@variantId, @userId, @rating, @comment, GETDATE())`);

        res.send('✅ Cảm ơn bạn đã đánh giá sản phẩm!');
    } catch (err) { 
        // PHẦN MỚI: Bắt lỗi nếu người dùng cố tình đánh giá 2 lần
        if (err.message.includes('Violation of UNIQUE KEY constraint')) {
            res.status(400).send('Bạn đã đánh giá sản phẩm này rồi. Xin cảm ơn!');
        } else {
            res.status(500).send('Lỗi hệ thống: ' + err.message); 
        }
    }
});

// API 18: LẤY CHI TIẾT 1 ĐƠN HÀNG ĐỂ IN HÓA ĐƠN (ADMIN)
app.get('/api/admin/orders/:id/details', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        const orderId = req.params.id;

        // 1. Lấy thông tin chung của hóa đơn
        let orderRes = await pool.request()
            .input('id', sql.Int, orderId)
            .query(`
                SELECT o.OrderID, o.TotalAmount, o.CreatedAt, o.PaymentMethod, o.OrderStatus,
                       u.FullName, u.Phone, ua.AddressDetail, s.Carrier, s.TrackingCode
                FROM Orders o
                JOIN Users u ON o.UserID = u.UserID
                JOIN UserAddresses ua ON o.AddressID = ua.AddressID
                LEFT JOIN Shipments s ON o.OrderID = s.OrderID
                WHERE o.OrderID = @id
            `);

        if (orderRes.recordset.length === 0) return res.status(404).send('Không tìm thấy đơn hàng');
        let orderInfo = orderRes.recordset[0];

        // 2. Lấy danh sách các sản phẩm có trong đơn hàng đó
        let itemsRes = await pool.request()
            .input('id', sql.Int, orderId)
            .query(`
                SELECT p.ProductName, v.Color, v.Storage, oi.Quantity, oi.Price
                FROM OrderItems oi
                JOIN ProductVariants v ON oi.VariantID = v.VariantID
                JOIN Products p ON v.ProductID = p.ProductID
                WHERE oi.OrderID = @id
            `);
        
        orderInfo.items = itemsRes.recordset; // Gắn mảng sản phẩm vào thông tin đơn
        res.json(orderInfo);
    } catch (err) { res.status(500).send(err.message); }
});

// API 19: QUẢN LÝ HỒ SƠ CÁ NHÂN (USER PROFILE)

//1. Lấy thông tin hồ sơ
app.get('/api/users/profile/:phone', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request()
            .input('phone', sql.VarChar, req.params.phone)
            .query(`SELECT FullName, Phone, DefaultAddress FROM Users WHERE Phone = @phone`);
        
        if(result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).send('Không tìm thấy người dùng');
        }
    } catch (err) { res.status(500).send(err.message); }
});

//2. Cập nhật hồ sơ
app.put('/api/users/profile/:phone', async (req, res) => {
    try {
        const { fullName, address } = req.body;
        let pool = await sql.connect(config);
        
        await pool.request()
            .input('phone', sql.VarChar, req.params.phone)
            .input('fullName', sql.NVarChar, fullName)
            .input('address', sql.NVarChar, address)
            .query(`UPDATE Users SET FullName = @fullName, DefaultAddress = @address, UpdatedAt = GETDATE() WHERE Phone = @phone`);
            
        res.send('Cập nhật hồ sơ thành công!');
    } catch (err) { res.status(500).send(err.message); }
});

// API 20: LẤY TOÀN BỘ DANH SÁCH ẢNH (ADMIN)
app.get('/api/admin/images', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT img.ImageID, img.ImageURL, p.ProductName, v.Color, v.Storage
            FROM ProductImages img
            JOIN ProductVariants v ON img.VariantID = v.VariantID
            JOIN Products p ON v.ProductID = p.ProductID
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// API 21: THÊM ẢNH MỚI
app.post('/api/admin/images', async (req, res) => {
    try {
        const { variantId, url } = req.body;
        let pool = await sql.connect(config);
        await pool.request()
            .input('vid', sql.BigInt, variantId)
            .input('url', sql.VarChar, url)
            .query(`INSERT INTO ProductImages (VariantID, ImageURL, SortOrder) VALUES (@vid, @url, 1)`);
        res.send('✅ Đã thêm ảnh thành công!');
    } catch (err) { res.status(500).send(err.message); }
});

// API 22: XÓA ẢNH
app.delete('/api/admin/images/:id', async (req, res) => {
    try {
        let pool = await sql.connect(config);
        await pool.request().input('id', sql.BigInt, req.params.id).query(`DELETE FROM ProductImages WHERE ImageID = @id`);
        res.send('Đã xóa ảnh khỏi hệ thống!');
    } catch (err) { res.status(500).send(err.message); }
});

// API23: CẬP NHẬT ẢNH ĐÃ CÓ
app.put('/api/admin/images/:id', async (req, res) => {
    try {
        const { variantId, url } = req.body;
        let pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.BigInt, req.params.id)
            .input('vid', sql.BigInt, variantId)
            .input('url', sql.VarChar, url)
            .query(`UPDATE ProductImages SET VariantID = @vid, ImageURL = @url WHERE ImageID = @id`);
        res.send('✅ Đã cập nhật ảnh thành công!');
    } catch (err) { res.status(500).send(err.message); }
});

// KHỞI ĐỘNG SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server CellphoneD đang chạy tại cổng: ${PORT}`);
});