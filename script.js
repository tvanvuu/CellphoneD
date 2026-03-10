document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    let currentDisplayProducts = [];
    let currentProductLimit = 10;
    let cart = JSON.parse(localStorage.getItem('cellphoneD_cart')) || []; // Kiểm tra xem trước đó có giỏ hàng đang mua dở không, nếu không có thì mới tạo giỏ trống 
    let userOrders = [];
    let currentSelectedVariant = null; 
    let loggedInUser = localStorage.getItem('cellphoneD_user') || null; //Kiểm tra xem trong sổ tay (localStorage) có SĐT cũ không, nếu có thì lấy ra dùng

    // Các khu vực màn hình
    const homeContent = document.getElementById('home-content');
    const userDashboard = document.getElementById('user-dashboard');
    const productDetailPage = document.getElementById('product-detail-page');
    const shoppingCartPage = document.getElementById('shopping-cart-page');
    const menuLoginBtn = document.getElementById('login-btn');
    if (loggedInUser && menuLoginBtn) {
        menuLoginBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${loggedInUser}`;
    }

// 1. GỌI API & KHỞI TẠO TRANG CHỦ
fetch('/api/products')
.then(res => res.json())
.then(products => {
    if (!products || products.length === 0) return;
    allProducts = products;
    currentDisplayProducts = products; // Đổ toàn bộ dữ liệu vào biến tạm
    renderProducts(currentDisplayProducts, true); // Gọi hàm hiển thị với cờ "resetLimit = true"
    renderSlider(products);
    setupSliderAction();
})
.catch(error => console.error('Lỗi API:', error));

function renderProducts(productsToRender, resetLimit = false) {
    if (resetLimit) currentProductLimit = 10;
    const galleryContainer = document.getElementById('dynamic-products');
    const loadMoreBtn = document.getElementById('btn-load-more');
    if (!galleryContainer) return;
    
    const visibleProducts = productsToRender.slice(0, currentProductLimit);
    let galleryHTML = '';
    
    visibleProducts.forEach(product => {
        const formattedPrice = new Intl.NumberFormat('vi-VN').format(product.Price || 0);
        const storage = product.Storage ? ` ${product.Storage}` : '';
        const fullProductName = `${product.ProductName}${storage}`;
        const imageSrc = product.ImageUrl || 'image/p1.jpg'; // Tự động dự phòng nếu thiếu ảnh

        galleryHTML += `
            <div class="product-gallery-one-content-product-item product-card-click" data-name="${product.ProductName}" style="cursor: pointer;">
                <img src="${imageSrc}" alt="${fullProductName}">
                <div class="product-gallery-one-content-product-item-text">
                    <li><img src="image/icon1.png" alt=""><p>Trả góp 0%</p></li>
                    <li>${fullProductName}</li>
                    <li>Online giá rẻ</li>
                    <li>${formattedPrice}<sup>₫</sup></li>
                    <li>Quà tặng kèm theo</li>
                    <li><i class="fa-solid fa-star"></i>5.0 - Mới</li>
                    <button class="compare-add-btn" data-name="${product.ProductName}" onclick="toggleCompare(event, '${product.ProductName}')">+ So sánh</button>
                    <button class="fav-toggle-btn" data-id="${product.VariantID}" onclick="toggleFavorite(event, ${product.VariantID})" style="position: absolute; top: 10px; right: 10px; background: white; border: none; font-size: 18px; color: #ccc; width: 35px; height: 35px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; z-index: 2; transition: 0.3s;">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                </div>
            </div>
        `;
    });
    galleryContainer.innerHTML = galleryHTML || '<p style="padding: 50px; text-align:center;">Không tìm thấy sản phẩm!</p>';

    if (loadMoreBtn) {
        if (currentProductLimit >= productsToRender.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
        }
    }
}

// --- BẮT SỰ KIỆN BẤM NÚT XEM THÊM ---
    const btnLoadMore = document.getElementById('btn-load-more');
    if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
        currentProductLimit += 10; // Mỗi lần bấm tăng thêm 10 máy
        // Render lại màn hình (không có cờ reset để giữ nguyên những máy đã load)
        renderProducts(currentDisplayProducts, false);
    });
    }

    // Đổi hiệu ứng hover cho nút Xem thêm cho đẹp
    if(btnLoadMore) {
    btnLoadMore.addEventListener('mouseover', function() {
        this.style.background = '#fdf0f0';
    });
    btnLoadMore.addEventListener('mouseout', function() {
        this.style.background = 'white';
    });
    }

    function renderSlider(products) {
        const sliderContainer = document.getElementById('dynamic-slider-items');
        if (!sliderContainer) return;
        
        let sliderProducts = products.slice(0, 25); 
        let sliderHTML = `<div id="slider-track" style="display: flex; transition: transform 0.5s ease; width: 100%;">`;
        
        const itemsPerSlide = 5;
        for(let i = 0; i < sliderProducts.length; i += itemsPerSlide) {
            let slideGroup = sliderProducts.slice(i, i + itemsPerSlide);
            sliderHTML += `<div class="slider-product-one-content-items" style="position: relative !important; flex: 0 0 100%; display: flex; justify-content: space-between;">`;
            
            slideGroup.forEach(product => {
                const formattedPrice = new Intl.NumberFormat('vi-VN').format(product.Price || 0);
                const storage = product.Storage ? ` ${product.Storage}` : '';
                const fullProductName = `${product.ProductName}${storage}`;
                const imageSrc = product.ImageUrl || 'image/p1.jpg'; // Tự động dự phòng nếu thiếu ảnh
                
                sliderHTML += `
                    <div class="slider-product-one-content-item product-card-click" data-name="${product.ProductName}" style="cursor: pointer;">
                        <img src="${imageSrc}" alt="${fullProductName}">
                        <div class="slider-product-one-content-item-text">
                            <li><img src="image/icon1.png" alt=""><p>Trả góp 0%</p></li>
                            <li>${fullProductName}</li>
                            <li>${formattedPrice}<sup>₫</sup></li>
                            <button class="compare-add-btn" data-name="${product.ProductName}" onclick="toggleCompare(event, '${product.ProductName}')">+ So sánh</button>
                            <button class="fav-toggle-btn" data-id="${product.VariantID}" onclick="toggleFavorite(event, ${product.VariantID})" style="position: absolute; top: 10px; right: 10px; background: white; border: none; font-size: 18px; color: #ccc; width: 35px; height: 35px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; z-index: 2; transition: 0.3s;">
                                <i class="fa-solid fa-heart"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            sliderHTML += `</div>`;
        }
        sliderHTML += `</div>`;
        sliderContainer.innerHTML = sliderHTML;
    }

    function setupSliderAction() {
        const rightBtn = document.querySelector('.fa-chevron-right');
        const leftBtn = document.querySelector('.fa-chevron-left');
        const track = document.getElementById('slider-track');
        if(!rightBtn || !leftBtn || !track) return;

        let currentIndex = 0;
        const maxIndex = track.children.length - 1;

        rightBtn.addEventListener('click', () => {
            if(maxIndex <= 0) return;
            currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1; 
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
        });

        leftBtn.addEventListener('click', () => {
            if(maxIndex <= 0) return;
            currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1; 
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
        });
    }

// 2. MỞ TRANG CHI TIẾT SẢN PHẨM
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card-click');
        if (card) {
            const productName = card.getAttribute('data-name');
            openProductDetail(productName);
        }
    });

    window.openProductDetail = openProductDetail;
    function openProductDetail(productName) {
        fetch(`/api/product-detail/${encodeURIComponent(productName)}`)
            .then(res => res.json())
            .then(variants => {
                if (variants.length === 0) return;
                
                const productInfo = variants[0];
                document.getElementById('detail-name').innerText = productInfo.ProductName;
                // Reset số lượng về 1
                document.getElementById('detail-qty-input').value = 1;
                document.getElementById('detail-desc').innerText = productInfo.Description || 'Đang cập nhật mô tả...';

                // Đổ ảnh động từ database, nếu máy chưa có ảnh thì dùng ảnh mặc định
                const detailImg = document.getElementById('detail-main-img');
                if (detailImg) {
                    detailImg.src = productInfo.ImageUrl || 'image/p1.jpg';
                }
                
                let variantsHTML = '';
                variants.forEach((v, idx) => {
                    const priceFormatted = new Intl.NumberFormat('vi-VN').format(v.Price);
                    variantsHTML += `
                        <div class="variant-btn" data-index="${idx}" style="border: 2px solid ${idx === 0 ? '#d70018' : '#ccc'}; padding: 10px 15px; border-radius: 8px; cursor: pointer; text-align: center;">
                            <b style="display:block; margin-bottom:5px;">${v.Storage || 'Bản chuẩn'} - ${v.Color}</b>
                            <span style="color:#d70018; font-weight:bold;">${priceFormatted} đ</span>
                        </div>
                    `;
                });
                document.getElementById('detail-variants').innerHTML = variantsHTML;
                
                currentSelectedVariant = variants[0];
                document.getElementById('detail-price').innerText = new Intl.NumberFormat('vi-VN').format(currentSelectedVariant.Price) + ' đ';
                
                document.querySelectorAll('.variant-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.variant-btn').forEach(b => b.style.borderColor = '#ccc');
                        this.style.borderColor = '#d70018';
                        const idx = this.getAttribute('data-index');
                        currentSelectedVariant = variants[idx];
                        document.getElementById('detail-price').innerText = new Intl.NumberFormat('vi-VN').format(currentSelectedVariant.Price) + ' đ';
                    });
                });

                window.loadProductReviews(productInfo.ProductID);

                // HIỂN THỊ SẢN PHẨM LIÊN QUAN ---
                // 1. Tìm thông tin sản phẩm hiện tại trong mảng allProducts
                const currentProdInfo = allProducts.find(p => p.ProductName === productName);
                const relatedContainer = document.getElementById('related-products-list');
                
                if (currentProdInfo && relatedContainer) {
                    // Lọc các sản phẩm CÙNG Danh mục nhưng KHÁC tên sản phẩm đang xem
                    const relatedProds = allProducts.filter(p => 
                        p.CategoryName === currentProdInfo.CategoryName && 
                        p.ProductName !== productName
                    ).slice(0, 6); // Lấy tối đa 6 sản phẩm để gợi ý

                    if (relatedProds.length === 0) {
                        relatedContainer.innerHTML = '<p style="color:#777; font-style: italic;">Chưa có sản phẩm liên quan nào.</p>';
                    } else {
                        let relatedHTML = '';
                        relatedProds.forEach(p => {
                            const priceFmt = new Intl.NumberFormat('vi-VN').format(p.Price || 0);
                            // Gắn class 'product-card-click' để khách bấm vào là tự động nhảy sang trang máy đó luôn
                            relatedHTML += `
                                <div class="product-card-click" data-name="${p.ProductName}" style="min-width: 200px; max-width: 220px; flex: 0 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 15px; cursor: pointer; background: #fff; text-align: center; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                                    <img src="${p.ImageUrl || 'image/p1.jpg'}" style="width: 100%; height: 180px; object-fit: contain; border-radius: 8px; margin-bottom: 10px; transition: transform 0.3s;">
                                    <h4 style="font-size: 14px; margin-bottom: 8px; color: #333; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.ProductName}</h4>
                                    <p style="color: #d70018; font-weight: bold; font-size: 15px;">${priceFmt} đ</p>
                                    <p style="margin-top: 10px; color: #007bff; font-size: 12px; font-weight: bold;">Xem chi tiết <i class="fa-solid fa-angle-right"></i></p>
                                </div>
                            `;
                        });
                        relatedContainer.innerHTML = relatedHTML;
                    }
                }

                homeContent.style.display = 'none';
                userDashboard.style.display = 'none';
                shoppingCartPage.style.display = 'none';
                productDetailPage.style.display = 'block';
                window.scrollTo(0, 0); 
            });
    }

    document.getElementById('back-to-home').addEventListener('click', () => {
        productDetailPage.style.display = 'none';
        shoppingCartPage.style.display = 'none';
        homeContent.style.display = 'block';
    });

// 3. GIỎ HÀNG (SHOPPING CART)
    // Xử lý nút Tăng / Giảm số lượng
    const detailQtyInput = document.getElementById('detail-qty-input');
    const detailQtyMinus = document.getElementById('detail-qty-minus');
    const detailQtyPlus = document.getElementById('detail-qty-plus');

    if (detailQtyMinus) {
        detailQtyMinus.addEventListener('click', () => {
            let qty = parseInt(detailQtyInput.value);
            if (qty > 1) detailQtyInput.value = qty - 1;
        });
    }
    if (detailQtyPlus) {
        detailQtyPlus.addEventListener('click', () => {
            let qty = parseInt(detailQtyInput.value);
            detailQtyInput.value = qty + 1;
        });
    }

    // Hàm dùng chung để lấy sản phẩm bỏ vào giỏ
    function addToCartAction() {
        if (!currentSelectedVariant) return null;
        
        let selectedQty = parseInt(detailQtyInput.value) || 1; // Lấy số lượng từ ô nhập
        
        const existingItem = cart.find(item => item.VariantID === currentSelectedVariant.VariantID);
        if (existingItem) {
            existingItem.qty += selectedQty; // Cộng dồn số lượng
        } else {
            cart.push({ ...currentSelectedVariant, qty: selectedQty }); // Thêm mới với số lượng chọn
        }
        
        localStorage.setItem('cellphoneD_cart', JSON.stringify(cart));
        return selectedQty; // Trả về số lượng để dùng thông báo
    }

    // Nút: THÊM VÀO GIỎ HÀNG (Chỉ thêm, không chuyển trang)
    document.getElementById('add-to-cart-btn').addEventListener('click', () => {
        let addedQty = addToCartAction();
        if (addedQty) {
            alert(`Đã thêm thành công: ${currentSelectedVariant.ProductName} (${currentSelectedVariant.Color}) x ${addedQty} vào giỏ hàng!`);
        }
    });

    // Nút: MUA NGAY (Thêm vào giỏ và nhảy sang trang Giỏ Hàng luôn)
    document.getElementById('buy-now-btn').addEventListener('click', () => {
        addToCartAction(); 
        if(typeof window.openCartTab === 'function') window.openCartTab();
    });

    const navCartBtn = document.querySelector('nav .container ul li button i.fa-cart-shopping').parentElement;
    if (navCartBtn) {
        navCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(typeof window.openCartTab === 'function') window.openCartTab();
        });
    }

    function renderCartUI() {
        const list = document.getElementById('cart-items-list');
        const totalEl = document.getElementById('cart-total');
        const addressDisplay = document.getElementById('cart-display-address');
        const savedAddress = localStorage.getItem('cellphoneD_address') || 'Đà Nẵng';
        if (addressDisplay) addressDisplay.innerText = savedAddress;

        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'edit-address-in-cart') {
                const addressFormDiv = document.querySelector('.adress-form');
                if(addressFormDiv) addressFormDiv.style.display = 'flex'; 
            }
        });
        
        if (cart.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #777; padding: 40px 0;">Giỏ hàng đang trống. Hãy chọn vài món đồ nhé!</p>';
            totalEl.innerText = '0 đ';
            return;
        }
        
        let html = '';
        let totalMoney = 0;
        cart.forEach((item, index) => {
            const itemTotal = item.Price * item.qty;
            totalMoney += itemTotal;
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 15px 0;">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <img src="${item.ImageUrl || 'image/p1.jpg'}" style="width: 80px; border-radius: 8px; border: 1px solid #ddd;">
                        <div>
                            <h4 style="margin: 0 0 8px 0; font-size: 16px;">${item.ProductName}</h4>
                            <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">Bản: ${item.Storage || 'Chuẩn'} - Màu: ${item.Color}</p>
                            <span style="color: #d70018; font-weight: bold; font-size: 16px;">${new Intl.NumberFormat('vi-VN').format(item.Price)} đ</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <input type="number" value="${item.qty}" min="1" data-index="${index}" class="cart-qty-input" style="width: 60px; padding: 8px; text-align: center; border: 1px solid #ccc; border-radius: 5px;">
                        <button class="remove-cart-btn" data-index="${index}" style="background: #ff4d4f; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        list.innerHTML = html;
        totalEl.innerText = new Intl.NumberFormat('vi-VN').format(totalMoney) + ' đ';
        
        document.querySelectorAll('.cart-qty-input').forEach(input => {
            input.addEventListener('change', function() {
                const idx = this.getAttribute('data-index');
                cart[idx].qty = parseInt(this.value) || 1;

                //Cập nhật lại giỏ hàng lưu trữ sau khi thay đổi số lượng
                localStorage.setItem('cellphoneD_cart', JSON.stringify(cart));

                renderCartUI();
            });
        });
        
        document.querySelectorAll('.remove-cart-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = this.getAttribute('data-index');
                cart.splice(idx, 1);

                //Cập nhật lại giỏ hàng lưu trữ sau khi xóa sản phẩm
                localStorage.setItem('cellphoneD_cart', JSON.stringify(cart));

                renderCartUI();
            });
        });
    }

    // --- CHỈ HIỆN NÚT "ĐƠN HÀNG ĐÃ MUA" TRONG GIỎ HÀNG THAY VÌ CẢ DANH SÁCH ---
    function renderCartOrderHistory() {
        const cartToDashboardSection = document.getElementById('cart-to-dashboard-section');
        
        // Nếu đã Đăng nhập thì hiện khu vực có nút bấm, chưa thì ẩn đi
        if (cartToDashboardSection) {
            cartToDashboardSection.style.display = loggedInUser ? 'block' : 'none';
        }
    }

    // --- SỰ KIỆN: BẤM VÀO NÚT "ĐƠN HÀNG ĐÃ MUA" ĐỂ CHUYỂN TRANG ---
    const cartToDashboardBtn = document.getElementById('cart-to-dashboard-btn');
    if (cartToDashboardBtn) {
        cartToDashboardBtn.addEventListener('click', () => {
            shoppingCartPage.style.display = 'none';
            userDashboard.style.display = 'block';
            
            // Dùng SĐT để load đơn hàng thay vì dùng biến loggedInUser
            const userPhone = localStorage.getItem('cellphoneD_phone');
            fetchOrders(userPhone);
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

// 4. LỌC DANH MỤC & TÌM KIẾM
    const menuLinks = document.querySelectorAll('.menu-bar-content ul li a');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const categoryToFind = link.innerText.trim();
            if (['Máy cũ, Thu cũ', 'Màn hình, Máy in', 'Sim, Thẻ cào'].includes(categoryToFind)) return; 
            currentDisplayProducts = allProducts.filter(p => p.CategoryName && p.CategoryName.toLowerCase().includes(categoryToFind.toLowerCase()));
            renderProducts(currentDisplayProducts, true);
            const titleElement = document.querySelector('.product-gallery-one-content-title h2');
            if (titleElement) titleElement.innerHTML = `<i class="fa-solid fa-star"></i> ${categoryToFind} nổi bật nhất`;
            document.querySelector('.product-gallery-one').scrollIntoView({ behavior: 'smooth' });
        });
    });

    const searchInput = document.querySelector('nav .container ul li input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            if (searchTerm === '') {
                currentDisplayProducts = allProducts; renderProducts(currentDisplayProducts, true);
                const titleElement = document.querySelector('.product-gallery-one-content-title h2');
                if (titleElement) titleElement.innerHTML = `<i class="fa-solid fa-star"></i> Tất cả sản phẩm`;
                return;
            }
            currentDisplayProducts = allProducts.filter(p => 
                p.ProductName.toLowerCase().includes(searchTerm)
            );
            renderProducts(currentDisplayProducts, true);
            const titleElement = document.querySelector('.product-gallery-one-content-title h2');
            if (titleElement) titleElement.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Kết quả tìm kiếm: "${e.target.value.trim()}"`;
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.querySelector('.product-gallery-one').scrollIntoView({ behavior: 'smooth' });
        });
    }

// 5. ĐĂNG NHẬP (OTP MÔ PHỎNG) & DASHBOARD
    const loginBtn = document.getElementById('login-btn');
    const loginOverlay = document.getElementById('login-form-overlay');
    const loginClose = document.getElementById('login-close');
    const formStep1 = document.getElementById('form-step-1');
    const step1 = document.getElementById('login-step-1');
    const step2 = document.getElementById('login-step-2');
    const phoneInput = document.getElementById('phone-input');
    const displayPhone = document.getElementById('display-phone');
    const otpBtn = step2 ? step2.querySelector('button') : null;
    const otpInput = step2 ? step2.querySelector('input') : null;
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn && loginOverlay) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // KIỂM TRA: Nếu đã đăng nhập (có SĐT) -> Chuyển thẳng sang Dashboard
            if (loggedInUser) {
                homeContent.style.display = 'none'; 
                productDetailPage.style.display = 'none';
                shoppingCartPage.style.display = 'none';
                userDashboard.style.display = 'block';

                // Lấy SĐT để gọi đúng đơn hàng của mình 
                const userPhone = localStorage.getItem('cellphoneD_phone');
                fetchOrders(userPhone);
                fetchOrders(loggedInUser); // Load lại danh sách đơn hàng
                window.scrollTo(0, 0);
            } 
            // Nếu CHƯA đăng nhập -> Hiện bảng nhập SĐT & OTP
            else {
                loginOverlay.style.display = 'flex';
                step1.style.display = 'block';
                step2.style.display = 'none';
            }
        });
    }
    if (loginClose) loginClose.addEventListener('click', () => loginOverlay.style.display = 'none');

    if (formStep1) {
        formStep1.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = phoneInput.value.trim();
            if (phone.length < 9) return alert('Số điện thoại không hợp lệ!');
            displayPhone.innerText = phone;
            step1.style.display = 'none';
            step2.style.display = 'block';
        });
    }

    if (otpBtn) {
        otpBtn.addEventListener('click', () => {
            if (otpInput.value.trim().length !== 4) return alert('Nhập 4 số OTP bất kỳ!');
            
            const phone = phoneInput.value.trim();
            
            fetch(`/api/orders/${phone}`) 
                .then(res => res.json())
                .then(orders => {
                    let displayName = phone; 
                    if (orders && orders.length > 0) {
                        displayName = orders[0].FullName; 
                    }

                    // LƯU Ý QUAN TRỌNG:
                    loggedInUser = displayName; // Dùng để hiện tên lên Menu
                    localStorage.setItem('cellphoneD_user', displayName);
                    localStorage.setItem('cellphoneD_phone', phone); // DÒNG NÀY ĐỂ TRUY XUẤT ĐƠN

                    loginOverlay.style.display = 'none';
                    loginBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${displayName}`;
                    
                    homeContent.style.display = 'none'; 
                    userDashboard.style.display = 'block'; 
                    fetchOrders(phone); // Dùng phone (số) để gọi đơn hàng
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // 1. Xóa sạch các biến tạm trong bộ nhớ Javascript
            loggedInUser = null;
            userOrders = [];
            
            // 2. Xóa sạch "sổ tay" localStorage (Xóa Tên, SĐT và cả Địa chỉ giao hàng)
            localStorage.removeItem('cellphoneD_user');
            localStorage.removeItem('cellphoneD_phone');
            localStorage.removeItem('cellphoneD_address'); // Thêm dòng này để xóa địa chỉ cũ
            
            // 3. Reset giao diện về trạng thái ban đầu
            userDashboard.style.display = 'none';
            homeContent.style.display = 'block';
            loginBtn.innerHTML = `<i class="fa-solid fa-user"></i> Đăng nhập`;
            
            // Reset các ô nhập liệu nếu có
            if (phoneInput) phoneInput.value = '';
            if (otpInput) otpInput.value = '';
            
            // Xóa danh sách đơn hàng đang hiển thị trên màn hình
            const orderList = document.getElementById('dynamic-orders-list');
            if (orderList) orderList.innerHTML = '';

            // 4. LÀM MỚI TRANG (QUAN TRỌNG): Để trình duyệt xóa sạch mọi cache dữ liệu cũ
            location.reload(); 
        });
    }

    // --- HÀM 1: GỌI API LẤY ĐƠN HÀNG VỀ LƯU TRỮ ---
    function fetchOrders(phone) {
        // Ưu tiên lấy SĐT từ bộ nhớ máy (cellphoneD_phone)
        const searchPhone = phone || localStorage.getItem('cellphoneD_phone');
        
        if (!searchPhone) return;
    
        fetch(`/api/orders/${searchPhone}?t=${new Date().getTime()}`)
            .then(res => res.json())
            .then(orders => {
                userOrders = orders || [];
                renderOrders('Tất cả'); 
                if(typeof window.updateNotifications === 'function') window.updateNotifications(userOrders);
            });
    }

    // --- HÀM 2: LỌC VÀ HIỂN THỊ ĐƠN HÀNG LÊN MÀN HÌNH ---
    function renderOrders(filterStatus) {
        const orderList = document.getElementById('dynamic-orders-list');
        const userNameTitle = document.getElementById('dashboard-user-name');
        
        if (userOrders.length === 0) {
            userNameTitle.innerText = `Xin chào, ${loggedInUser}`;
            orderList.innerHTML = `<p style="text-align: center; color: #ddd;">Tài khoản này chưa có đơn hàng nào.</p>`;
            return;
        }
        
        userNameTitle.innerText = `Xin chào, ${userOrders[0].FullName || loggedInUser}`;
        
        // Bắt đầu lọc dữ liệu
        let filteredOrders = userOrders;
        if (filterStatus === 'Chờ xử lý') {
            filteredOrders = userOrders.filter(o => o.OrderStatus === 1);
        } else if (filterStatus === 'Đã xác nhận') {
            filteredOrders = userOrders.filter(o => o.OrderStatus === 2);
        } else if (filterStatus === 'Đang giao hàng') {
            filteredOrders = userOrders.filter(o => o.OrderStatus === 3);
        } else if (filterStatus === 'Đã hủy') {
            filteredOrders = userOrders.filter(o => o.OrderStatus === 4);
        }

        // Nếu lọc xong mà không có đơn nào
        if (filteredOrders.length === 0) {
             orderList.innerHTML = `<div style="text-align: center; padding: 40px 0;"><i class="fa-solid fa-box-open" style="font-size: 50px; color: #eee; margin-bottom: 15px;"></i><p style="color: #777;">Không có đơn hàng nào ở trạng thái này.</p></div>`;
             return;
        }

        // Nếu có đơn thì vẽ HTML
        let html = '';
        filteredOrders.forEach(o => {
            const price = new Intl.NumberFormat('vi-VN').format(o.Price * o.Quantity);
            const date = new Date(o.CreatedAt).toLocaleDateString('vi-VN');
            let statusText = o.OrderStatus === 1 ? 'Chờ xử lý' : o.OrderStatus === 2 ? 'Đã xác nhận' : o.OrderStatus === 3 ? 'Đang giao' : 'Đã hủy';
            
            // Tô màu trạng thái
            let statusColor = '#d70018'; // Đỏ
            if(o.OrderStatus === 2) statusColor = '#28a745'; // Xanh lá
            if(o.OrderStatus === 3) statusColor = '#007bff'; // Xanh dương

            // Xử lý hiển thị Phương thức thanh toán
            let paymentText = o.PaymentMethod || 'COD'; 
            let paymentIcon = 'fa-money-bill-wave';
            if (paymentText === 'MoMo') paymentIcon = 'fa-wallet';
            if (paymentText === 'VNPAY') paymentIcon = 'fa-credit-card';

            // --- PHẦN MỚI: TẠO KHUNG HIỂN THỊ VẬN ĐƠN (NẾU CÓ) ---
            let trackingHtml = '';
            if (o.Carrier) {
                trackingHtml = `
                <div style="margin-top: 12px; background: #fff8e1; border: 1px dashed #ffecb5; padding: 10px 15px; border-radius: 6px; font-size: 13px; color: #856404;">
                    <i class="fa-solid fa-truck-fast" style="color: #d70018; margin-right: 5px;"></i> Giao bởi: <b>${o.Carrier}</b> <br>
                    <i class="fa-solid fa-barcode" style="margin-top: 8px; margin-right: 5px;"></i> Mã vận đơn: <b style="color: #0056b3; font-size: 14px;">${o.TrackingCode || 'Đang cập nhật...'}</b>
                </div>`;
            }

            html += `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #fff;">
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div><b>Mã đơn: #${o.OrderID}</b> - <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></div>
                    
                    <div style="background: #f0f8ff; color: #0056b3; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid #cce5ff;">
                        <i class="fa-solid ${paymentIcon}"></i> ${paymentText}
                    </div>
                </div>
                
                <p style="margin: 0; font-size: 16px;"><b>${o.ProductName}</b> (${o.Storage || ''} - ${o.Color}) x ${o.Quantity}</p>
                
                <p style="margin: 8px 0; font-size: 13px; color: #666; background: #f9f9f9; padding: 8px; border-radius: 5px;">
                    <i class="fa-solid fa-location-dot" style="color: #d70018;"></i> Giao đến: ${o.AddressDetail || 'Địa chỉ mặc định'}
                </p>
                
                <p style="margin: 5px 0 0 0; color: #666;">Ngày đặt: ${date} - Tổng: <b style="color: #d70018;">${price} đ</b></p>
                
                ${trackingHtml}
            </div>
            `;
        });
        orderList.innerHTML = html;
    }

    // --- SỰ KIỆN: BẮT CLICK KHI NGƯỜI DÙNG BẤM NÚT LỌC ---
    const orderFilterTabs = document.querySelectorAll('.order-tabs .tab-btn');
    orderFilterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Xóa màu ở nút cũ, tô màu vào nút mới được bấm
            orderFilterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Lấy chữ trên nút (Tất cả, Chờ xử lý...) để đem đi lọc
            const filterText = this.innerText.trim();
            renderOrders(filterText);
        });
    });
    

// 6. RÀO CHẮN THANH TOÁN VÀ LƯU DATABASE THẬT
const checkoutBtn = document.getElementById('btn-proceed-checkout'); 
if (checkoutBtn) {
    checkoutBtn.onclick = () => {
        if (cart.length === 0) return alert('Giỏ hàng trống!');

        // Lấy SĐT từ bộ nhớ máy
        const userPhone = localStorage.getItem('cellphoneD_phone');

        if (!userPhone) {
            alert('Vui lòng Đăng nhập để lưu lịch sử đơn hàng!');
            document.getElementById('login-form-overlay').style.display = 'flex';
            return;
        } 

        // Lấy Phương thức thanh toán
        const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
        const paymentMethodValue = selectedPayment ? selectedPayment.value : 'COD';

        const totalAmount = cart.reduce((sum, item) => sum + (item.Price * item.qty), 0);
        checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...';
        checkoutBtn.disabled = true;

        fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: userPhone,
                cart: cart,
                totalAmount: totalAmount,
                addressString: localStorage.getItem('cellphoneD_address') || 'Đà Nẵng',
                paymentMethod: paymentMethodValue 
            })
        })
        .then(res => res.json())
        .then(data => {
            alert(`🎉 ĐẶT HÀNG THÀNH CÔNG!\nMã đơn của bạn là: #${data.orderId}`);
            
            // 1. Làm sạch giỏ hàng
            cart = [];
            localStorage.removeItem('cellphoneD_cart');
            
            // 2. Tự động chuyển sang Tab Đơn hàng (Đã sửa ID mới)
            const ordersTabBtn = document.getElementById('sidebar-orders-btn');
            if(ordersTabBtn) ordersTabBtn.click();
            
            // 3. Gọi lại đơn hàng
            fetchOrders(userPhone); 
            
            checkoutBtn.innerHTML = 'TIẾN HÀNH ĐẶT HÀNG';
            checkoutBtn.disabled = false;
        })
        .catch(err => {
            console.error("Lỗi:", err);
            checkoutBtn.innerHTML = 'TIẾN HÀNH ĐẶT HÀNG';
            checkoutBtn.disabled = false;
        });
    }; 
}

// 7. CHỌN ĐỊA CHỈ GIAO HÀNG (LIÊN KẾT DATABASE)
    const addressNavBtn = document.querySelector('nav .container ul li#adress-form a');
    const addressFormDiv = document.querySelector('.adress-form');
    const addressClose = document.getElementById('adress-close');
    
    const provinceSelect = document.getElementById('province-select');
    const districtSelect = document.getElementById('district-select');
    const applyAddressBtn = document.getElementById('apply-address-btn');
    const streetInput = document.getElementById('street-input');

    // 7.1 Mở popup địa chỉ và Load danh sách Tỉnh/Thành phố
    if (addressNavBtn) {
        addressNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(addressFormDiv) addressFormDiv.style.display = 'flex'; 
            
            // Nếu chưa load Tỉnh nào thì mới gọi API
            if (provinceSelect.options.length <= 1) {
                fetch('/api/provinces')
                    .then(res => res.json())
                    .then(data => {
                        let html = '<option value="">Chọn Tỉnh/Thành phố</option>';
                        data.forEach(p => {
                            html += `<option value="${p.ProvinceID}">${p.ProvinceName}</option>`;
                        });
                        provinceSelect.innerHTML = html;
                    })
                    .catch(err => console.error("Lỗi tải Tỉnh:", err));
            }
        });
    }

    // Đóng popup
    if (addressClose) {
        addressClose.addEventListener('click', () => {
            if(addressFormDiv) addressFormDiv.style.display = 'none';
        });
    }

    // 7.2 Khi người dùng chọn Tỉnh -> Tự động load Quận/Huyện tương ứng
    if (provinceSelect) {
        provinceSelect.addEventListener('change', function() {
            const provId = this.value;
            districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>'; // Reset ô Quận
            
            if (!provId) return; // Nếu chọn về mặc định thì thôi

            // Gọi API lấy Quận theo provId
            fetch(`/api/districts/${provId}`)
                .then(res => res.json())
                .then(data => {
                    let html = '<option value="">Chọn Quận/Huyện</option>';
                    data.forEach(d => {
                        html += `<option value="${d.DistrictID}">${d.DistrictName}</option>`;
                    });
                    districtSelect.innerHTML = html;
                })
                .catch(err => console.error("Lỗi tải Quận:", err));
        });
    }

    // 7.3 Bấm Áp dụng địa chỉ
    if (applyAddressBtn) {
        applyAddressBtn.addEventListener('click', () => {
            if (provinceSelect.value === '') return alert('Vui lòng chọn Tỉnh/Thành phố!');
            
            const provText = provinceSelect.options[provinceSelect.selectedIndex].text;
            const distText = districtSelect.options[districtSelect.selectedIndex] ? districtSelect.options[districtSelect.selectedIndex].text : '';
            const streetDetail = streetInput.value.trim();

            let addressParts = [];
            if (streetDetail) addressParts.push(streetDetail);
            if (distText && distText !== 'Chọn Quận/Huyện') addressParts.push(distText);
            if (provText) addressParts.push(provText);

            // Nối lại bằng dấu phẩy duy nhất
            let fullAddress = addressParts.join(", "); 

            localStorage.setItem('cellphoneD_address', fullAddress);
            
            // Cập nhật giao diện thanh Menu (chỉ hiện Tỉnh cho đẹp)
            addressNavBtn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> ${provText} <i class="fa-solid fa-caret-down"></i>`;
            
            if (addressFormDiv) addressFormDiv.style.display = 'none';
            
            const cartAddressDisplay = document.getElementById('cart-display-address');
            if (cartAddressDisplay) cartAddressDisplay.innerText = fullAddress;
            
            alert(`✅ Đã cập nhật địa chỉ giao hàng:\n${fullAddress}`);
        });
    }

// --- 8. NÚT QUAY LẠI MUA SẮM TỪ TRANG QUẢN LÝ ĐƠN HÀNG ---
    const backToShopDashboardBtn = document.getElementById('back-to-shop-from-dashboard');
    if (backToShopDashboardBtn) {
        backToShopDashboardBtn.addEventListener('click', () => {
            // Ẩn trang Dashboard
            userDashboard.style.display = 'none';
            // Hiện lại trang chủ
            homeContent.style.display = 'block';
            // Tự động cuộn mượt mà lên đầu trang
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ================= LOGIC SO SÁNH SẢN PHẨM =================
    let compareList = JSON.parse(localStorage.getItem('cellphoneD_compare')) || [];
    const compareFloatingBar = document.getElementById('compare-floating-bar');
    const comparePage = document.getElementById('compare-page');

    if (compareList.length > 0) renderCompareBar();

    window.toggleCompare = function(event, productName) {
        event.stopPropagation(); // Không cho click lan ra ngoài mở trang chi tiết
        
        const index = compareList.indexOf(productName);
        if (index > -1) {
            compareList.splice(index, 1);
        } else {
            if (compareList.length >= 3) return alert('Tối đa 3 sản phẩm!');
            compareList.push(productName);
        }
        
        localStorage.setItem('cellphoneD_compare', JSON.stringify(compareList));
        renderCompareBar();
    };

    function renderCompareBar() {
        const slotsContainer = document.getElementById('compare-slots');
        if (compareList.length === 0) {
            compareFloatingBar.style.display = 'none';
            return;
        }
        
        compareFloatingBar.style.display = 'flex';
        slotsContainer.innerHTML = compareList.map(name => `
            <div style="display:flex; align-items:center; gap:10px; background:#f9f9f9; padding:5px 15px; border-radius:5px; border:1px solid #ddd;">
                <span style="font-weight:bold; font-size:14px;">${name}</span>
                <i class="fa-solid fa-xmark" style="cursor:pointer; color:#d70018;" onclick="toggleCompare(event, '${name}')"></i>
            </div>
        `).join('');
        
        document.querySelectorAll('.compare-add-btn').forEach(btn => {
            if (compareList.includes(btn.getAttribute('data-name'))) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã chọn';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '+ So sánh';
            }
        });
    }

    document.getElementById('btn-compare-clear').addEventListener('click', () => {
        compareList = [];
        localStorage.removeItem('cellphoneD_compare');
        renderCompareBar();
    });

    document.getElementById('btn-compare-now').addEventListener('click', async () => {
        if (compareList.length < 2) return alert('Chọn ít nhất 2 sản phẩm để so sánh!');

        // Đóng trang chủ, mở trang so sánh
        homeContent.style.display = 'none';
        userDashboard.style.display = 'none';
        shoppingCartPage.style.display = 'none';
        productDetailPage.style.display = 'none';
        compareFloatingBar.style.display = 'none';
        comparePage.style.display = 'block';

        const tableContainer = document.getElementById('compare-table-container');
        tableContainer.innerHTML = 'Đang tải thông số...';

        try {
            const fetchPromises = compareList.map(name => 
                fetch(`/api/product-detail/${encodeURIComponent(name)}`).then(res => res.json())
            );
            const results = await Promise.all(fetchPromises);
            const compareData = results.map(variants => variants[0]); // Lấy bản tiêu chuẩn để so

            // Tự động quét tìm tất cả các tên thông số có trong database
            let allSpecNames = new Set();
            compareData.forEach(p => {
                if(p.Specs) p.Specs.forEach(s => allSpecNames.add(s.SpecName));
            });

            // Bắt đầu vẽ bảng
            let tableHTML = `<table class="compare-table"><tbody>`;
            
            // Dòng thông tin cơ bản
            tableHTML += `<tr><th>Sản phẩm</th>`;
            compareData.forEach(p => tableHTML += `<td><img src="image/p1.jpg" style="width:100px;"><br><h3>${p.ProductName}</h3></td>`);
            tableHTML += `</tr><tr><th>Giá</th>`;
            compareData.forEach(p => tableHTML += `<td style="color:#d70018; font-weight:bold; font-size:18px;">${new Intl.NumberFormat('vi-VN').format(p.Price)} đ</td>`);
            tableHTML += `</tr>`;

            // Dòng thông số động (Render tự động dựa vào database)
            allSpecNames.forEach(specName => {
                tableHTML += `<tr><th>${specName}</th>`;
                compareData.forEach(p => {
                    let specObj = p.Specs ? p.Specs.find(s => s.SpecName === specName) : null;
                    tableHTML += `<td>${specObj ? specObj.SpecValue : '-'}</td>`;
                });
                tableHTML += `</tr>`;
            });

            // Nút Thêm vào giỏ / Đặt hàng
            tableHTML += `<tr><th>Hành động</th>`;
            compareData.forEach(p => {
                // Truyền trực tiếp dữ liệu của sản phẩm đó vào hàm mua hàng
                tableHTML += `<td>
                    <button onclick="buyNowFromCompare(${p.VariantID}, '${p.ProductName}', ${p.Price}, '${p.Color}', '${p.Storage || ''}')" style="background:#d70018; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold; transition:0.3s;">
                        <i class="fa-solid fa-cart-arrow-down"></i> Đặt hàng ngay
                    </button>
                </td>`;
            });
            tableHTML += `</tr>`;

            tableContainer.innerHTML = tableHTML;
            window.scrollTo(0, 0);
        } catch (err) {
            tableContainer.innerHTML = '<p style="color:red;">Lỗi kết nối CSDL!</p>';
        }
    });

    document.getElementById('close-compare-page').addEventListener('click', () => {
        comparePage.style.display = 'none';
        homeContent.style.display = 'block';
        renderCompareBar(); 
    });

    // --- HÀM XỬ LÝ KHI BẤM "ĐẶT HÀNG NGAY" TỪ BẢNG SO SÁNH ---
    window.buyNowFromCompare = function(variantId, productName, price, color, storage) {
        // 1. Kiểm tra xem sản phẩm đã có trong giỏ chưa
        const existingItem = cart.find(item => item.VariantID === variantId);
        if (existingItem) {
            existingItem.qty += 1; // Nếu có rồi thì tăng số lượng
        } else {
            // Nếu chưa có thì đẩy vào mảng cart
            cart.push({
                VariantID: variantId,
                ProductName: productName,
                Price: price,
                Color: color,
                Storage: storage !== 'null' ? storage : '',
                qty: 1
            });
        }
        
        // 2. Lưu lại vào bộ nhớ trình duyệt
        localStorage.setItem('cellphoneD_cart', JSON.stringify(cart));

        // 3. Tắt trang so sánh, Bật trang giỏ hàng lên
        document.getElementById('compare-page').style.display = 'none';
        if(typeof window.openCartTab === 'function') window.openCartTab();
        document.getElementById('shopping-cart-page').style.display = 'block';
        
        // 4. Render lại giao diện giỏ hàng để cập nhật số tiền
        renderCartUI();
        if (typeof renderCartOrderHistory === 'function') renderCartOrderHistory();
        
        // 5. Cuộn mượt mà lên đầu trang
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ================= LOGIC SẢN PHẨM YÊU THÍCH (WISHLIST) =================
    let userFavorites = [];

    window.fetchFavorites = function(phone) {
        if (!phone) return;
        fetch(`/api/favorites/${phone}`)
            .then(res => res.json())
            .then(data => {
                // SỬA Ở ĐÂY: Dùng parseInt để ép tất cả dữ liệu SQL về dạng Số
                userFavorites = data.map(item => parseInt(item.VariantID)); 
                updateHeartIcons(); 
                renderFavoritesList(data); 
            });
    };

    window.updateHeartIcons = function() {
        document.querySelectorAll('.fav-toggle-btn').forEach(btn => {
            const vid = parseInt(btn.getAttribute('data-id')); // ID trên HTML đã là số
            const icon = btn.querySelector('i');
            
            if (userFavorites.includes(vid)) {
                icon.style.color = '#ff4d4f'; // Tô Đỏ
            } else {
                icon.style.color = '#ccc'; // Tô Xám
            }
        });
    };

    window.toggleFavorite = function(event, variantId) {
        event.stopPropagation(); 
        
        const userPhone = localStorage.getItem('cellphoneD_phone');
        if (!userPhone) {
            alert('Vui lòng Đăng nhập để lưu Sản phẩm yêu thích!');
            document.getElementById('login-form-overlay').style.display = 'flex';
            return;
        }

        // SỬA Ở ĐÂY: Ép ID người dùng bấm vào thành Số luôn
        const vId = parseInt(variantId); 

        const btn = event.currentTarget;
        const icon = btn.querySelector('i');
        const isFav = userFavorites.includes(vId);
        
        // Cập nhật màu tạm thời để web có cảm giác phản hồi nhanh
        icon.style.color = isFav ? '#ccc' : '#ff4d4f';

        // Gửi lệnh lên Server
        fetch('/api/favorites/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, variantId: vId })
        })
        .then(res => res.json())
        .then(data => fetchFavorites(userPhone)) // Tải lại tim chuẩn từ Server
        .catch(err => alert('Lỗi: ' + err));
    };

    window.renderFavoritesList = function(favoritesData) {
        const container = document.getElementById('dynamic-favorites-list');
        if (!container) return;
        
        if (favoritesData.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color:#888; padding: 40px 0;"><i class="fa-solid fa-heart-crack" style="font-size: 40px; color: #ddd; margin-bottom: 10px; display:block;"></i>Bạn chưa thả tim sản phẩm nào.</p>';
            return;
        }

        let html = '';
        favoritesData.forEach(p => {
            const fullName = `${p.ProductName} ${p.Storage || ''}`; // Nối tên và dung lượng để hiển thị cho rõ
            html += `
                <div style="width: 31%; border: 1px solid #eee; border-radius: 8px; padding: 15px; text-align: center; position: relative; background: #fff; cursor: pointer;" onclick="openProductDetail('${p.ProductName}')">
                    <img src="${p.ImageUrl || 'image/p1.jpg'}" style="width: 100%; border-radius: 8px;">
                    <h4 style="margin: 10px 0 5px; font-size: 15px;">${fullName}</h4>
                    <p style="color: #d70018; font-weight: bold;">${new Intl.NumberFormat('vi-VN').format(p.Price)} đ</p>
                    
                    <button class="fav-toggle-btn" data-id="${p.VariantID}" onclick="toggleFavorite(event, ${p.VariantID})" style="position: absolute; top: 10px; right: 10px; background: white; border: none; font-size: 16px; color: #ff4d4f; width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; z-index: 2;">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    };

    // --- CHUYỂN TAB TRONG DASHBOARD & AUTO LOAD TIM ---
    const sidebarProfileBtn = document.getElementById('sidebar-profile-btn');
    const profileSection = document.getElementById('dashboard-profile-section');
    const sidebarFavBtn = document.getElementById('sidebar-fav-btn');
    const sidebarOrdersBtn = document.getElementById('sidebar-orders-btn');
    const sidebarCartBtn = document.getElementById('sidebar-cart-btn');

    const orderSectionHeader = document.querySelector('.dashboard-header');
    const orderSectionTabs = document.querySelector('.order-tabs');
    const orderSectionList = document.getElementById('dynamic-orders-list');
    const favSection = document.getElementById('dashboard-favorites-section');
    const cartSection = document.getElementById('dashboard-cart-section');

    function resetSidebar() {
        [sidebarFavBtn, sidebarOrdersBtn, sidebarCartBtn, sidebarProfileBtn].forEach(btn => {
            if(btn) { btn.style.backgroundColor = '#fff'; btn.style.color = '#444'; btn.style.border = '1px solid #ddd'; }
        });
        if(orderSectionHeader) orderSectionHeader.style.display = 'none';
        if(orderSectionTabs) orderSectionTabs.style.display = 'none';
        if(orderSectionList) orderSectionList.style.display = 'none';
        if(favSection) favSection.style.display = 'none';
        if(cartSection) cartSection.style.display = 'none';
        if(profileSection) profileSection.style.display = 'none';
    }

    // Hàm Mở Tab Giỏ hàng
    window.openCartTab = function() {
        resetSidebar();
        if(sidebarCartBtn) { sidebarCartBtn.style.backgroundColor = '#fdf0f0'; sidebarCartBtn.style.color = '#d70018'; sidebarCartBtn.style.border = '1px solid #fcdada'; }
        if(cartSection) cartSection.style.display = 'block';
        userDashboard.style.display = 'block';
        homeContent.style.display = 'none';
        productDetailPage.style.display = 'none';
        renderCartUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (sidebarFavBtn && sidebarOrdersBtn && sidebarCartBtn) {
        sidebarFavBtn.addEventListener('click', (e) => {
            e.preventDefault(); resetSidebar();
            sidebarFavBtn.style.backgroundColor = '#fdf0f0'; sidebarFavBtn.style.color = '#d70018'; sidebarFavBtn.style.border = '1px solid #fcdada';
            if(favSection) favSection.style.display = 'block';
        });

        sidebarOrdersBtn.addEventListener('click', (e) => {
            e.preventDefault(); resetSidebar();
            sidebarOrdersBtn.style.backgroundColor = '#fdf0f0'; sidebarOrdersBtn.style.color = '#d70018'; sidebarOrdersBtn.style.border = '1px solid #fcdada';
            if(orderSectionHeader) orderSectionHeader.style.display = 'flex';
            if(orderSectionTabs) orderSectionTabs.style.display = 'flex';
            if(orderSectionList) orderSectionList.style.display = 'block';
        });

        sidebarCartBtn.addEventListener('click', (e) => {
            e.preventDefault(); window.openCartTab();
        });
    }

    // TỰ ĐỘNG GỌI KHI LOAD TRANG
    if (loggedInUser) {
        const storedPhone = localStorage.getItem('cellphoneD_phone');
        fetchFavorites(storedPhone);
        fetchOrders(storedPhone);
    } else {
        // Nếu Khách chưa đăng nhập mà ấn Giỏ hàng
        const userNameTitle = document.getElementById('dashboard-user-name');
        const logoutBtn = document.getElementById('logout-btn');
        if (userNameTitle) userNameTitle.innerText = 'Xin chào, Khách vãng lai';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    // ================= LOGIC ĐÁNH GIÁ SẢN PHẨM =================
    
    // Hàm tải danh sách bình luận (Được tách ra để gọi lại dễ dàng)
    window.loadProductReviews = function(productId) {
        fetch(`/api/reviews/${productId}`)
            .then(res => res.json())
            .then(reviews => {
                let revHTML = '';
                if(reviews.length === 0) {
                    revHTML = '<p style="color: #777; font-style: italic;">Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét!</p>';
                } else {
                    reviews.forEach(r => {
                        let stars = '<i class="fa-solid fa-star" style="color:#f5b50a; margin-right: 2px;"></i>'.repeat(r.Rating);
                        revHTML += `
                            <div style="margin-bottom: 20px; border-bottom: 1px dashed #ddd; padding-bottom: 15px;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                    <div style="background: #eee; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #555;">
                                        ${r.FullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <b style="font-size: 15px;">${r.FullName}</b> 
                                        <span style="font-size:12px; color:#888; margin-left: 10px;"><i class="fa-regular fa-clock"></i> ${new Date(r.CreatedAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                                <div style="margin: 8px 0; font-size: 13px;">${stars}</div>
                                <p style="margin: 0; color: #333; line-height: 1.5;">${r.Comment}</p>
                            </div>
                        `;
                    });
                }
                document.getElementById('detail-reviews').innerHTML = revHTML;
            });
    };

    // Bắt sự kiện ấn nút Gửi Đánh Giá
    const btnSubmitReview = document.getElementById('btn-submit-review');
    if (btnSubmitReview) {
        btnSubmitReview.addEventListener('click', () => {
            const userPhone = localStorage.getItem('cellphoneD_phone');
            
            // 1. Kiểm tra Đăng nhập
            if (!userPhone) {
                alert('Vui lòng Đăng nhập tài khoản để viết đánh giá!');
                document.getElementById('login-form-overlay').style.display = 'flex';
                return;
            }

            if (!currentSelectedVariant) return alert('Lỗi: Chưa chọn phiên bản máy!');

            const rating = document.getElementById('review-rating').value;
            const comment = document.getElementById('review-comment').value.trim();

            // 2. Kiểm tra ô nhập
            if (!comment) return alert('Vui lòng nhập nội dung đánh giá trước khi gửi!');

            // 3. Giao diện chờ
            btnSubmitReview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG GỬI...';
            btnSubmitReview.disabled = true;

            // 4. Gửi xuống Database
            fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: userPhone,
                    variantId: currentSelectedVariant.VariantID,
                    rating: parseInt(rating),
                    comment: comment
                })
            })
            .then(res => res.text())
            .then(msg => {
                alert(msg);
                document.getElementById('review-comment').value = ''; // Xóa trắng ô chữ
                document.getElementById('review-rating').value = "5"; // Reset về 5 sao
                
                btnSubmitReview.innerHTML = '<i class="fa-solid fa-paper-plane"></i> GỬI ĐÁNH GIÁ';
                btnSubmitReview.disabled = false;
                
                // Gọi lại hàm để tải bình luận mình vừa viết lên màn hình ngay lập tức
                window.loadProductReviews(currentSelectedVariant.ProductID);
            })
            .catch(err => {
                alert('Lỗi: ' + err);
                btnSubmitReview.innerHTML = '<i class="fa-solid fa-paper-plane"></i> GỬI ĐÁNH GIÁ';
                btnSubmitReview.disabled = false;
            });
        });
    }

    // ================= LOGIC THÔNG BÁO (NOTIFICATIONS) =================
    const notifBell = document.getElementById('notification-bell');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');

    // 1. Mở/Đóng popup thông báo
    if (notifBell) {
        notifBell.addEventListener('click', (e) => {
            e.preventDefault();
            if (!loggedInUser) return alert('Vui lòng đăng nhập để xem thông báo!');
            
            // Ẩn/hiện hộp thoại
            const isShowing = notifDropdown.style.display === 'block';
            notifDropdown.style.display = isShowing ? 'none' : 'block';
            
            // Khi khách bấm mở ra xem -> Đánh dấu là ĐÃ ĐỌC hết
            if (!isShowing) {
                notifBadge.style.display = 'none'; // Ẩn chấm đỏ đi
                notifBadge.innerText = '0';
                
                // Lưu trạng thái đã đọc vào localStorage để lần sau không báo lại đơn cũ
                let readState = JSON.parse(localStorage.getItem('cellphoneD_notif_read')) || {};
                userOrders.forEach(o => {
                    readState[o.OrderID] = o.OrderStatus; // Ghi nhớ trạng thái cao nhất đã thấy
                });
                localStorage.setItem('cellphoneD_notif_read', JSON.stringify(readState));
                
                // Tô lại màu nền thành màu trắng (đã đọc)
                document.querySelectorAll('.notif-item').forEach(el => el.style.backgroundColor = '#fff');
            }
        });
    }

    // Đóng popup khi click ra vùng trống ngoài web
    document.addEventListener('click', (e) => {
        if (notifBell && !notifBell.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    });

    // 2. Phân tích đơn hàng để tạo thông báo
    window.updateNotifications = function(orders) {
        if (!orders || orders.length === 0) return;

        let readState = JSON.parse(localStorage.getItem('cellphoneD_notif_read')) || {};
        let unreadCount = 0;
        let notifHtml = '';

        orders.forEach(o => {
            // Chỉ thông báo khi Đơn đã xác nhận(2), Đang giao(3), Đã hủy(4)
            if (o.OrderStatus > 1) {
                // Kiểm tra xem khách đã đọc thông báo này chưa
                let isUnread = false;
                if (!readState[o.OrderID] || readState[o.OrderID] < o.OrderStatus) {
                    isUnread = true;
                    unreadCount++;
                }

                let icon = '', title = '', desc = '';
                let bgColor = isUnread ? '#fff3cd' : '#fff'; // Màu vàng nhạt nếu chưa đọc

                if (o.OrderStatus === 2) {
                    icon = '<i class="fa-solid fa-circle-check" style="color: #28a745; font-size: 24px;"></i>';
                    title = 'Đơn hàng đã xác nhận';
                    desc = `Đơn hàng <b>#${o.OrderID}</b> đã được Shop xác nhận và đang đóng gói.`;
                } else if (o.OrderStatus === 3) {
                    icon = '<i class="fa-solid fa-truck-fast" style="color: #007bff; font-size: 24px;"></i>';
                    title = 'Đơn hàng đang giao';
                    desc = `Đơn hàng <b>#${o.OrderID}</b> đang được giao. ĐVVC: <b style="color:#d70018;">${o.Carrier || 'Shop'}</b>.`;
                } else if (o.OrderStatus === 4) {
                    icon = '<i class="fa-solid fa-circle-xmark" style="color: #d70018; font-size: 24px;"></i>';
                    title = 'Đơn hàng đã hủy';
                    desc = `Đơn hàng <b>#${o.OrderID}</b> đã bị hủy.`;
                }

                notifHtml += `
                    <div class="notif-item" style="display: flex; gap: 12px; padding: 15px; border-bottom: 1px solid #eee; background: ${bgColor}; cursor: pointer; transition: 0.3s;" onclick="if(typeof openCartTab === 'function'){openCartTab(); document.getElementById('sidebar-orders-btn').click();}">
                        <div style="margin-top: 5px;">${icon}</div>
                        <div>
                            <h5 style="margin: 0 0 5px 0; font-size: 14px; color: #333;">${title}</h5>
                            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.4;">${desc}</p>
                            <span style="font-size: 11px; color: #999; margin-top: 5px; display: block;">${new Date(o.CreatedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                `;
            }
        });

        if (notifHtml !== '') {
            if (notifList) notifList.innerHTML = notifHtml;
        }

        // Hiện chấm đỏ nếu có thông báo mới
        if (unreadCount > 0 && notifBadge) {
            notifBadge.innerText = unreadCount;
            notifBadge.style.display = 'block';
        }
    };

    // 3. TỰ ĐỘNG CẬP NHẬT MỖI 10 GIÂY (MÔ PHỎNG REAL-TIME)
    setInterval(() => {
        const storedPhone = localStorage.getItem('cellphoneD_phone');
        if (storedPhone) { 
            // Gọi api ngầm để check đơn hàng mới mà không làm giật lại giao diện web
            fetch(`/api/orders/${storedPhone}`)
                .then(res => res.json())
                .then(orders => {
                    userOrders = orders || [];
                    window.updateNotifications(userOrders);
                })
                .catch(err => console.log('Đang chờ kết nối Server...'));
        }
    }, 10000); // 10000ms = 10 giây

    // ================= LOGIC HỒ SƠ CÁ NHÂN =================
    if (sidebarProfileBtn) {
        sidebarProfileBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            resetSidebar();
            
            sidebarProfileBtn.style.backgroundColor = '#fdf0f0'; 
            sidebarProfileBtn.style.color = '#d70018'; 
            sidebarProfileBtn.style.border = '1px solid #fcdada';
            
            if(profileSection) profileSection.style.display = 'block';

            // Gọi API lấy thông tin cũ đổ vào Form
            const phone = localStorage.getItem('cellphoneD_phone');
            if (phone) {
                fetch(`/api/users/profile/${phone}`)
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('profile-phone').value = data.Phone;
                        document.getElementById('profile-name').value = data.FullName !== 'null' ? data.FullName : '';
                        document.getElementById('profile-address').value = data.DefaultAddress !== 'null' ? data.DefaultAddress : '';
                    })
                    .catch(err => console.log('Lỗi tải hồ sơ:', err));
            }
        });
    }

    // Xử lý nút Lưu thay đổi
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', () => {
            const phone = localStorage.getItem('cellphoneD_phone');
            const newName = document.getElementById('profile-name').value.trim();
            const newAddress = document.getElementById('profile-address').value.trim();

            if (!newName) return alert('Vui lòng nhập Họ và tên!');

            btnSaveProfile.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG LƯU...';

            fetch(`/api/users/profile/${phone}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: newName, address: newAddress })
            })
            .then(res => res.text())
            .then(msg => {
                alert('✅ ' + msg);
                btnSaveProfile.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> LƯU THAY ĐỔI';
                
                // Cập nhật lại Tên hiển thị trên Menu và localStorage ngay lập tức
                loggedInUser = newName;
                localStorage.setItem('cellphoneD_user', newName);
                if (newAddress) localStorage.setItem('cellphoneD_address', newAddress); // Lưu đè cả địa chỉ đặt hàng
                
                const menuLoginBtn = document.getElementById('login-btn');
                const userNameTitle = document.getElementById('dashboard-user-name');
                if (menuLoginBtn) menuLoginBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${newName}`;
                if (userNameTitle) userNameTitle.innerText = `Xin chào, ${newName}`;
            })
            .catch(err => {
                alert('Lỗi: ' + err);
                btnSaveProfile.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> LƯU THAY ĐỔI';
            });
        });
    }
});

