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
const ClientInfo = require('./ClientInfo');
const ClientBu = require('./ClientBu');
const ClientServiceCharge = require('./ClientServiceCharge');
const Job = require('./Job');
const JobServiceCharge = require('./JobServiceCharge');

// Add more models as you create them
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
  ClientInfo,
  ClientBu,
  ClientServiceCharge,
  Job,
  JobServiceCharge,
  // Invoice,
};

