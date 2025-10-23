const authService = require('../../services/auth/Login.service');
const ApiResponse = require('../../dto/res/api.response');
const LoginRequest = require('../../dto/req/login.request');
const { StatusCodes, ReasonPhrases } = require('http-status-codes');
const { NewLoginResponse } = require('../../dto/res/login.response');

exports.login = async (req, res) => {
  try {
    const loginReq = new LoginRequest(req.body);
    const { user, accessToken, refreshToken } = await authService.login(
      loginReq
    );

    const refreshTokenMaxAge =
      parseInt(process.env.REFRESH_TOKEN_EXPIRES, 10) * 60 * 1000;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
    });

    const loginResponse = NewLoginResponse(user, accessToken);
    const response = ApiResponse.success('Login successfully', loginResponse);

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    let statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    let message = error.message || ReasonPhrases.INTERNAL_SERVER_ERROR;

    if (error.message === 'Invalid credentials') {
      statusCode = StatusCodes.UNAUTHORIZED;
      message = error.message;
    } else if (error.statusCode === 403) {
      // User is banned
      statusCode = StatusCodes.FORBIDDEN;
      message = error.message;
    }

    const response = ApiResponse.error(message);
    res.status(statusCode).json(response);
  }
};
