const db = require('_helpers/db');
const Role = require('_helpers/role');

module.exports = {
    getAllBranch,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch: _deleteBranch,
    getBranch,
    assignUser,
    removeUserFromBranch,
    updateRole,

    deactivateBranch,
    reactivateBranch
};

async function getAllBranch() {
    // Only return active branches
    return await db.Branch.findAll({
       
    });
}

async function getBranchById(id) {
    const branch = await db.Branch.findByPk(id, {
        where: { branchStatus: 'active' }, // Only retrieve active branches
        include: [{
            model: db.Account,
            attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
            required: false // Allow branches without accounts
        }]
    });
    if (!branch) throw 'Branch not found or is deactivated';
    return branch;
}

async function createBranch(params) {
    const branch = new db.Branch(params);

    if (await db.Branch.findOne({ where: { location: params.location } })) {
        throw 'location "' + params.location + '" is already registered';
    }
    branch.status = 'active'; // Ensure new branches are active
    await branch.save();
}

async function updateBranch(id, params) {
    const branch = await getBranchById(id);
    
    // Prevent updates to deactivated branches
    if (branch.branchStatus === 'deactivated') {
        throw 'Cannot update a deactivated branch';
    }
    
    Object.assign(branch, params);
    await branch.save();
}

async function _deleteBranch(id) {
    const branch = await getBranchById(id);
    await branch.destroy();
}

async function getBranch(id) {
    const branch = await db.Branch.findByPk(id, {
        where: { branchStatus: 'active' }
    });
    if (!branch) throw 'Branch not found or is deactivated';
    return branch;
}

async function assignUser(BranchId, AccountId) {
    try {
        // First, check if the branch is active
        const branch = await getBranch(BranchId);
        
        const account = await db.Account.findByPk(AccountId);
        
        await checkIfActive(branch); // Check if branch is active
        if (!branch) throw new Error('Branch not found or is deactivated');
        if (!account) throw new Error('User not found');
        
        // Optional: Check if the user is already assigned to this branch
        if (account.BranchId === branch.id) {
            throw new Error('User is already assigned to this branch');
        }
        
        if (account.role !== Role.Staff) {
            throw new Error('Only Staff can be assigned to a branch');
        }

        // Update the account's branch
        await db.Account.update(
            { BranchId: branch.id }, 
            { where: { id: AccountId } }
        );

        return { message: 'User assigned to branch successfully' };
    } catch (error) {
        throw error;
    }
}
async function updateRole(id, params) {
    // Find the branch first
    const branch = await getBranchById(id);
    
    // Validate that a role is provided
    if (!params.role) {
        throw 'Role is required';
    }

    // Update the role
    await db.Account.update(
        { role: params.role }, 
        { 
            where: { 
                BranchId: id,
               
            } 
        }
    );
}
async function removeUserFromBranch(branchId, AccountId) {
    // Find the account and verify they are part of the specified branch
    const account = await db.Account.findOne({ 
        where: { 
            id: AccountId, 
            BranchId: branchId 
        } 
    });

    // If no account found, throw an error
    if (!account) {
        throw 'User not found or not assigned to this branch';
    }

    // First, verify the branch is active
    const branch = await getBranch(branchId);

    // Remove the user from the branch by setting BranchId to null
    await db.Account.update(
        { BranchId: null }, 
        { where: { id: AccountId } }
    );

    return { message: 'User removed from branch successfully' };
}

async function deactivateBranch(id) {
    const branch = await getBranchById(id);
    if (!branch) throw 'Branch not found';

    // Check if the branch is already deactivated
    if (branch.branchStatus === 'deactivated') throw 'Branch is already deactivated';

    // Deactivate the branch
    branch.branchStatus = 'deactivated';
    await branch.save();

    // Optionally, remove users from this branch when deactivated
    await db.Account.update(
        { BranchId: null }, 
        { where: { BranchId: id } }
    );
}

async function reactivateBranch(id) {
    const branch = await db.Branch.findByPk(id);
    if (!branch) throw 'Branch not found';

    // Check if the branch is already active
    if (branch.branchStatus === 'active') throw 'Branch is already active';

    // Reactivate the branch
    branch.branchStatus = 'active';
    await branch.save();
}
// Helper function to check if the product is active
async function checkIfActive(branch) {
    if (branch.branchStatus === 'deactivated') {
        throw new Error('Product is deactivated');
    }
}