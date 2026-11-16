const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://Coffee_Admin:Anar07861@ac-gd8mkpd-shard-00-00.autjdqe.mongodb.net:27017,ac-gd8mkpd-shard-00-01.autjdqe.mongodb.net:27017,ac-gd8mkpd-shard-00-02.autjdqe.mongodb.net:27017/?ssl=true&replicaSet=atlas-u2uguc-shard-0&authSource=admin');
    console.log('MongoDB Connected Successfully!');
  } catch (error) {
    console.error('MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;