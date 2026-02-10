const Shop = require("../models/Shop");

// Login shop
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find shop with password field
    const shop = await Shop.findOne({ email }).select("+password");

    if (!shop) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!shop.isActive) {
      return res.status(401).json({ message: "Shop account is inactive" });
    }

    // Verify password
    const isPasswordValid = await shop.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Return shop without password
    const shopResponse = shop.toObject();
    delete shopResponse.password;

    res.json({
      success: true,
      shop: shopResponse,
      token: "jwt-token-placeholder-" + shop._id, // Replace with actual JWT
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all shops
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find().select("-password");
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single shop
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select("-password");
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create shop
exports.createShop = async (req, res) => {
  try {
    const { shopName, email, password, ownerName, phone, address } = req.body;

    // Check if shop already exists
    const existingShop = await Shop.findOne({ email });
    if (existingShop) {
      return res
        .status(400)
        .json({ message: "Shop with this email already exists" });
    }

    const shop = new Shop({
      shopName,
      email,
      password,
      ownerName,
      phone,
      address,
    });

    await shop.save();

    // Return shop without password
    const shopResponse = shop.toObject();
    delete shopResponse.password;

    res.status(201).json(shopResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update shop
exports.updateShop = async (req, res) => {
  try {
    const { shopName, email, ownerName, phone, address, isActive, password } =
      req.body;

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shopName) shop.shopName = shopName;
    if (email) shop.email = email;
    if (ownerName) shop.ownerName = ownerName;
    if (phone) shop.phone = phone;
    if (address) shop.address = address;
    if (typeof isActive !== "undefined") shop.isActive = isActive;
    if (password) shop.password = password; // Will be hashed by pre-save hook

    await shop.save();

    const shopResponse = shop.toObject();
    delete shopResponse.password;

    res.json(shopResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete shop
exports.deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.json({ message: "Shop deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
