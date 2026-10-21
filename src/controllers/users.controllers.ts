import { NextFunction, Request, Response } from 'express'
import { validationResult } from 'express-validator'
import usersServices from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  ChangePasswordReqBody,
  EmailVerifyReqQuery,
  forgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayload,
  UpdateMeReqBody,
  VerifyForgotPasswordTokenReqBody
} from '~/models/requests/User.requests'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'

//chơi với database
//call services
export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  //body có email và password
  //lên server kiểm tra email và password có khớp không, nếu khớp thì gửi lại acToken và rfToken để duy trì đăng nhập

  let result = await usersServices.login(req.body)

  return res.status(200).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result //acToken và rfToken để duy trì đăng nhập
  })
}

// Trong express TS, Request là generic
//  đôi lúc không định nghĩa rõ là paramsDictionary, trừ khi bạn muốn custom
//  ParamsDictionary là một type/interface, và nó được định nghĩa (ctrl + click để dô xem nó được định nghĩa sao)
//  (sau khi bấm vô): là một interface với định nghĩa sau [key: string]: string
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  //ParamsDictionary là đang định nghĩa cho phần params
  //RegisterReqBody là đang định nghĩa cho phần body
  //***Thứ tự tham số của request: Request<P, resBody, reqBody, reqQuerry, Locals>
  //                                   params  res.json()  body   querry
  //any là đang set kiểu dữ liệu cho resBody là sao cũng được, phải có để có thể
  //  định nghĩa được cho arg thứ 3 là phần reqBody của Request
  res: Response,
  next: NextFunction
) => {
  const error = validationResult(req)
  if (!error.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.array()
    })
  }
  //ở đây dữ liệu xem như đã được kiểm tra valid
  //mình chỉ xét theo mục đích thôi
  const { email } = req.body

  let isEmailExisted = await usersServices.checkEmailExist(email)
  if (isEmailExisted) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: 'Email has been used'
    })
  }

  //tạo user và lưu vào database(ra lệnh database tạo user từ các thông tin trên)
  // | call services
  //dữ liệu kiện hàng của request không gặp lỗi gì hết nên mới bắt đầu thực hiện hành động register lên database
  const data = await usersServices.register(req.body)

  //đóng gói kiện nếu tạo thành công
  return res.status(HTTP_STATUS.OK).json({
    message: 'Register successfully',
    data
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>, //
  res: Response
) => {
  // đến đây thì dữ liệu đã sạch và ac rf đã đc decode
  // mình sẽ so sánh 2 user_id trong payload của ac và rf
  const { user_id: user_id_ac } = req.decoded_authorization as TokenPayload
  const { user_id: user_id_rf } = req.decoded_refresh_token as TokenPayload
  if (user_id_ac !== user_id_rf) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
    })
  }
  // kiểm tra (tìm) xêm rf còn tồn tại trong database hay không
  await usersServices.checkRefreshToken({
    user_id: user_id_rf,
    refresh_token: req.body.refresh_token
  })
  // nếu còn thì tiến hành xoá
  await usersServices.logout(req.body.refresh_token)
  //thông báo thành công
  res.status(HTTP_STATUS.OK).json({ messsage: 'Logout successfully' })
}

export const emailVerifyController = async (
  req: Request<ParamsDictionary, any, any, EmailVerifyReqQuery>,
  res: Response
) => {
  const { email_verify_token } = req.query
  const { user_id } = req.decoded_email_verify_token as TokenPayload
  //                những cái decoded này là

  //kiểm tra xem user_id này có còn sở hữu mã email_verify_token này không?
  await usersServices.checkEmailVerifyToken({ user_id, email_verify_token })
  //nếu còn thì đổi trạng thái verify của account
  await usersServices.verifyEmail(user_id)
  //nếu mà oke hết thì sao
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS
  })
}

export const resendEmailVerifyTokenController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const verifyStatus = await usersServices.getUserVerifyStatus(user_id)

  //nếu mà trạng thái hiện là verified thì xin làm gì
  if (verifyStatus == UserVerifyStatus.Verified) {
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }

  //nếu mà trạng thái hiện tại là banned rồi thì xin làm gì
  if (verifyStatus == UserVerifyStatus.Banned) {
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED
    })
  }

  //nếu chưa verified thì gửi mã
  if (verifyStatus == UserVerifyStatus.Unverified) {
    await usersServices.resendEmailVerifyToken(user_id)
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.CHECK_YOUR_EMAIL
    })
  }
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, forgotPasswordReqBody>,
  res: Response
) => {
  const { email } = req.body
  //kiểm tra xem email có tồn tại k
  const isExisted = await usersServices.checkEmailExist(email)
  if (!isExisted) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }

  // nếu có user
  await usersServices.forgotPassword(email)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHECK_YOUR_EMAIL
  })
}

export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response
) => {
  //kiểm tra xem user_id hiện tịa có còn sở hữu forgot_password_token này không?

  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { forgot_password_token } = req.body

  //kiểm tra user có sở hữu forgot_password_token

  await usersServices.checkForgotPasswordToken({
    user_id,
    forgot_password_token
  })
  //nếu vượt qua kiểm tra thì
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  //kiểm tra xem forgot_password_token có còn đúng với user_id
  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { forgot_password_token, password } = req.body
  await usersServices.checkForgotPasswordToken({
    user_id,
    forgot_password_token
  })

  //nếu có thì tiến hành đổi password
  await usersServices.resetPassword({
    user_id,
    password
  })
  //nếu đổi password oke thì
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (req: Request, res: Response) => {
  //thông qua user_id tìm user và gửi các thông tin cho client
  //phải loại bỏ các thông tin nhạy cảm
  const { user_id } = req.decoded_authorization as TokenPayload
  const userInfor = await usersServices.getMe(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: userInfor
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const verifyStatus = await usersServices.getUserVerifyStatus(user_id)
  if (verifyStatus !== UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.YOU_MUST_VERIFY_YOUR_EMAIL_TO_UPDATE_PROFILE
    })
  }

  //tiến hành update profile, payload là nội dung update

  const userInfo = await usersServices.updateMe({ user_id, payload: req.body })

  //update thành công
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    result: userInfo
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  //mình có kiểm tra access_token ở middleware rồi
  //nên chắc chắn sẽ có decoded_authorization
  const { user_id } = req.decoded_authorization as TokenPayload
  const { old_password, password } = req.body
  //tiến hành đổi mật khẩu
  await usersServices.changePassword({
    user_id,
    old_password,
    password
  })
  //hàm này chưa code: kiểm tra old_password đúngk hông rồi mới đổi pass

  //nếu đổi thành công
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  //kiểm tra xem refresh_token còn tồn tại tỏng hệ thống không
  const { user_id } = req.decoded_authorization as TokenPayload
  const { refresh_token } = req.body
  await usersServices.checkRefreshToken({
    user_id,
    refresh_token
  }) //trong này đã có hàm check lỗi rồi, khỏi cần tiến hành kiểm tra lỗi

  //kiểm tra xong thì tiến hành cập nhật ac và rf mới và gửi cho client
  const result = await usersServices.refreshToken({ user_id, refresh_token })
  //hàm phải trả ra ac và rf mới
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}
