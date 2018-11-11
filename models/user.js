'use strict';

module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define('User', {
        Uid: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        username: DataTypes.STRING,
        password: DataTypes.STRING,
        email: DataTypes.STRING
    }, {
        classMethods: {
            associate: function(models) {
                User.hasMany(models.Survey, {
                    onDelete: 'CASCADE',
                    foreignKey: 'Uid'
                });
            }
        }
    });

    return User;
};