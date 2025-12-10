
import { catchAsync } from '../middlewares/error-handler.js';


import { validateChangePassword, validateLogin, validateRegister, validateUpdateProfile } from '../validators/auth.validator.js';

import { AuthService } from "../services/auth.services.js"

const authService = new AuthService();




export const register = catchAsync(async (req, res) => {


  validateRegister(req.body);

  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});



export const login = catchAsync(async (req, res) => {
  validateLogin(req.body);

  const { email, password } = req.body;
  const result = await authService.login(email, password);

  // Set cookie if needed
  if (process.env.NODE_ENV === 'production') {
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});




export const logout = catchAsync(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

  if (token) {
    await authService.logout(token);
  }

  // Clear cookie
  res.clearCookie('token');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  validateUpdateProfile(req.body);

  const user = await authService.updateProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});

export const changePassword = catchAsync(async (req, res) => {
  validateChangePassword(req.body);

  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});