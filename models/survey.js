'use strict';

module.exports = function(sequelize, DataTypes) {
    var Survey = sequelize.define('Survey', {
        Sid: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        Uid: DataTypes.INTEGER,
        title: DataTypes.STRING,
        published: DataTypes.BOOLEAN
    },{
        classMethods: {
            associate: function(models) {
                Survey.hasMany(models.Question, {
                    onDelete: 'CASCADE',
                    foreignKey: 'Sid'
                });
            }
        }
    });

    return Survey;
};