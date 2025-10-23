const bcrypt = require('bcryptjs');
const userRepository = require('../../repository/auth.repository');
const {
  signAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} = require('../../utils/jwt');

exports.login = async ({ email, password }) => {
  const user = await userRepository.findUserByEmail(email, true);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid credentials');
  }

  // Check if user is banned
  if (user.status === 'banned') {
    // Check if ban has expired (if banExpiresAt is set)
    if (user.banExpiresAt && new Date() >= new Date(user.banExpiresAt)) {
      // Ban has expired, automatically unban the user
      user.status = 'active';
      user.unbannedAt = new Date();
      await user.save();
    } else {
      // User is still banned
      let errorMessage = 'Your account is banned';

      if (user.banReason) {
        errorMessage += `: ${user.banReason}`;
      }

      if (!user.banExpiresAt) {
        errorMessage += 'This ban is permanent.';
      } else {
        const expiryDate = new Date(user.banExpiresAt).toLocaleString('vi-VN');
        errorMessage += `Your ban expires on: ${expiryDate}`;
      }

      const error = new Error(errorMessage);
      error.statusCode = 403;
      throw error;
    }
  }

  const accessToken = signAccessToken(user._id);

  const refreshToken = generateRefreshToken();
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await userRepository.createRefreshToken(
    user._id,
    refreshToken,
    refreshTokenExpiry
  );

  return {
    user: user,
    accessToken,
    refreshToken,
  };
};
