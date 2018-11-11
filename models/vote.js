'use strict';

module.exports = function(sequelize, DataTypes) {
    var Vote = sequelize.define('Vote', {
        Aid: DataTypes.INTEGER,
        Qid: DataTypes.INTEGER,
        Uid: DataTypes.INTEGER
    });

    return Vote;
};