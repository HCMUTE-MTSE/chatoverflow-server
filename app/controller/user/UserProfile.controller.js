const userInfoService = require('../../services/user/UserInfo.service');
const ApiResponse = require('../../dto/res/api.response');
const UserResponseDto = require('../../dto/res/user.response');

exports.getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate userId
    if (!userId) {
      return res.status(400).json(ApiResponse.error('User ID is required'));
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json(ApiResponse.error('Tham số phân trang không hợp lệ'));
    }

    const result = await userInfoService.getUserProfile(userId);

    if (!result.success) {
      return res.status(404).json(ApiResponse.error(result.message));
    }

    return res
      .status(200)
      .json(ApiResponse.success(result.message, result.data));
  } catch (error) {
    return res
      .status(500)
      .json(ApiResponse.error('Lỗi hệ thống khi lấy thông tin profile'));
  }
};
