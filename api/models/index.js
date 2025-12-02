/**
 * Models Index
 * Export all model classes for easy importing
 */

const User = require('./User');
const State = require('./State');
const GstRate = require('./GstRate');
const JobRegister = require('./JobRegister');
const Account = require('./Account');
const FieldsMaster = require('./FieldsMaster');
const JobRegisterField = require('./JobRegisterField');

// Add more models as you create them
// const ClientInfo = require('./ClientInfo');
// const ClientBu = require('./ClientBu');
// const Job = require('./Job');
// const Invoice = require('./Invoice');
// etc...

module.exports = {
  User,
  State,
  GstRate,
  JobRegister,
  Account,
  FieldsMaster,
  JobRegisterField,
  // ClientInfo,
  // ClientBu,
  // Job,
  // Invoice,
};

