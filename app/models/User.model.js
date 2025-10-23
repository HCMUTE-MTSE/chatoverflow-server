const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AddressSchema = new mongoose.Schema(
  {
    province: { type: String, maxlength: 100 },
    ward: { type: String, maxlength: 100 },
    street: { type: String, maxlength: 200 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nickName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    avatar: String,
    bio: { type: String, maxlength: 300 },
    dateOfBirth: { type: Date },
    address: AddressSchema,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },
    status: {
      type: String,

      enum: ['active', 'inactive', 'banned', 'pending'],
      default: 'pending',
    },
    tempPasswordHash: String,
    banReason: { type: String, maxlength: 500 },
    bannedAt: { type: Date },
    banExpiresAt: { type: Date }, // null = permanent ban
    unbannedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', UserSchema);
