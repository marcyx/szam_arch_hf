'use strict';

module.exports = function(sequelize, DataTypes) {
    var Answer = sequelize.define('Answer', {
        Aid: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        content: DataTypes.STRING,
        Qid: DataTypes.INTEGER
    }, {
    	classMethods: {
            associate: function(models) {
                Answer.belongsTo(models.Question, {
                    onDelete: 'CASCADE',
                    foreignKey: 'Qid'
                });
            }
    }
    });

    return Answer;
};