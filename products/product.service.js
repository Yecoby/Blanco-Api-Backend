const db = require('_helpers/db');

module.exports = {
    getProduct,
    getProductById,
    createProduct,
    updateProduct,
    deactivate,
    reactivate
};

async function getProduct(userRole) {
    // Check if user is Admin or Manager to show all products
    if (userRole === 'Admin' || userRole === 'Staff') {
        return await db.Product.findAll();
    }
    
    // For regular users, only show active products
    return await db.Product.findAll({
        where: { 
            productStatus: 'active' 
        }
    });
}
async function getProductById(id) {
    const product = await db.Product.findByPk(id);

    // Check if the product exists
    if (!product) {
        throw new Error('Invalid product ID');
    }
    return product;
}
async function createProduct(params) {
    let product = await db.Product.findOne({ where: { name: params.name } });

    if (product) {
        // await checkIfActive(product);
        // Product exists, update the inventory quantity
        const inventory = await db.Inventory.findOne({ where: { productId: product.id } });
        
        if (inventory) {
            inventory.quantity += params.quantity || 1; // Increase the quantity by the given value or by 1 if not specified
            await inventory.save();
        } else {
            // If no inventory exists for the product, create it (this should generally not happen if managed correctly)
            await db.Inventory.createProduct({
                productId: product.id,
                quantity: params.quantity || 1
            });
        }

        return { message: 'Product already exists, inventory updated', product };
    } else {
        // Product doesn't exist, create a new product
        product = await db.Product.create({
            name: params.name,
            description: params.description,
            price: params.price,
            productStatus: 'active'
        });

        // Create inventory for the new product
        await db.Inventory.create({
            productId: product.id,
            quantity: params.quantity || 1
        });

        return { message: 'New product created', product };
    }
}
async function updateProduct(id, params) {
    const product = await getProductById(id);
    if (!product) throw 'Product not found';
    
    Object.assign(product, params);
    return await product.save();
}
//------------------------- Deactivate product -------------------------
async function deactivate(id) {
    const product = await getProductById(id);
    if (!product) throw 'Product not found';

    // Check if the product is already deactivated
    if (product.productStatus === 'deactivated') throw 'Product is already deactivated';

    // Find the inventory for this product
    const inventory = await db.Inventory.findOne({ where: { productId: id } });
    
    // Check if inventory quantity is zero before deactivating
    if (inventory && inventory.quantity > 0) {
        throw 'Cannot deactivate product with remaining inventory';
    }

    // Set status to 'deactivated' and save
    product.productStatus = 'deactivated';
    await product.save();
}

async function reactivate(id) {
    const product = await getProductById(id);
    if (!product) throw 'Product not found';

    // Check if the product is already active
    if (product.productStatus === 'active') throw 'Product is already active';

    // Set status to 'active' and save
    product.productStatus = 'active';
    await product.save();
}
// Helper function to check if the product is active
async function checkIfActive(product) {
    if (product.productStatus === 'deactivated') {
        throw new Error('Product is deactivated');
    }
}