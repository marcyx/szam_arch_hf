'use strict';

module.exports = function(sequelize, DataTypes) {
    var Question = sequelize.define('Question', {
        Qid: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        content: DataTypes.STRING,
        Sid: DataTypes.INTEGER
    }, {
        classMethods: {
            associate: function(models) {
                Question.hasMany(models.Answer, {
                    onDelete: 'CASCADE',
                    foreignKey: 'Qid'
                });
            }
        }
    });
    return Question;
};