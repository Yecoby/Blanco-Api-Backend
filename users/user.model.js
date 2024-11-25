const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        //======For Profile=================
        email: { type: DataTypes.STRING, allowNull: false },
        userName: { type: DataTypes.STRING, allowNull: false },
        passwordHash: { type: DataTypes.STRING, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: false },
        firstName: { type: DataTypes.STRING, allowNull: false },
        lastName: { type: DataTypes.STRING, allowNull: false },
        role: { type: DataTypes.STRING, allowNull: false },
        profilePic: { type: DataTypes.STRING, allowNull: false },

        //======For Logging=================
        status: { type: DataTypes.ENUM('deactivated', 'active'), allowNull: false, defaultValue: 'active'},

          // Date last logged in
        lastDateLogin: { type: DataTypes.DATE, allowNull: true },
        lastLogoutAt: { type: DataTypes.DATE, allowNull: true },

        //======For Permission=================
        permission: { type: DataTypes.ENUM('grant', 'revoke'), allowNull: false, defaultValue: 'revoke'}
    

    };
    
    const options = {
        defaultScope: {
            attributes: { exclude: ['passwordHash' ] 
            }
        },
        scopes: {
            withHash: { attributes: {} }
        }
    };
    
    return sequelize.define('User', attributes, options);
}
