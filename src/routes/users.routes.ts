import express from 'express'
import {
  changePasswordController,
  emailVerifyController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendEmailVerifyTokenController,
  resetPasswordController,
  updateMeController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator,
  verifyForgotPasswordValidator
} from '~/middlewares/users.middleware'
import { ChangePasswordReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import { wrapAsync } from '~/utils/handler'

const userRouter = express.Router() //tạo userRouter chứa api liên quan user
userRouter.post('/login', loginValidator, wrapAsync(loginController))

/*register: đăng ký tài khoản
path: users/register
method: post
body: {
    email: string,
    name: string,
    password: string,
    confirm_password: string,
    date_of_birth: ISO8601
}
*/
userRouter.post('/register', registerValidator, wrapAsync(registerController))
//                             middleware              RequestHandler

userRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))
//

/*  Verify email
  khi người dùng nhấn vào link trong email sẽ lập tức gửi token lên route này
mình sẽ verify token thông qua link này và verify người dùng
path: /users/verify-email/?email_verify_token=string
method: GET
headers: 
*/
userRouter.get('/verify-email/', emailVerifyTokenValidator, wrapAsync(emailVerifyController))

/*  Resend email verify token
des: khi người dùng k nhận được dc email verify token thì có thể gửi lại
path: /users/resend-verify-email
method: POST
headers: {
  Authorization: 'Bearer access_token'
}
*/
userRouter.post('/resend-verify-email', accessTokenValidator, wrapAsync(resendEmailVerifyTokenController))

/* forgot password
des: khi người dùng quên mật khẩu có thể gửi yêu cầu đặt lại mật khẩu, ta tạo link gửi vào email
path: /users/forgot-password
method: POST
body: {
  email: string
}
*/
userRouter.post('/forgot-password', forgotPasswordValidator, wrapAsync(forgotPasswordController))

/* verify forgot password
des: khi người dùng bấm link forgot-password
và gửi mã cho FE, FE sẽ gửi mã cho mình để xác thực
nếu mã đúng thì FE sẽ hiển thị giao diện nhập password mới
path: /users/verify-forgot-password
method: POST
body {
  forgot_password_token: string 
}
*/
userRouter.post('/verify-forgot-password', verifyForgotPasswordValidator, wrapAsync(verifyForgotPasswordController))

/* reset password
des: sau khi người dùng xài giao diện đổi mật khẩu
FE sẽ gửi password mới, confirm_password mới và forgot_password_token
xuống cho mình đổi
path: users/reset-password 
method: POST
body {
  password: string,
  confirm_password: string,
  forgot_password_token: string
}
*/
userRouter.post(
  '/reset-password',
  verifyForgotPasswordValidator, //kiểm tra forgot password token
  resetPasswordValidator, //kiểm tra password và confirm password
  wrapAsync(resetPasswordController)
)

/*getMe
des: xem thông tin cá nhân của mình
path: users/me
method: POST
headers: {
  Authorization: "Bearer access_token"
}
*/
userRouter.post('/me', accessTokenValidator, wrapAsync(getMeController))

/*updateMe
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optionalk
  cover_photo?: string // optional
}
*/
userRouter.patch(
  '/me',
  accessTokenValidator, //
  updateMeValidator, //
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'location',
    'avatar',
    'bio',
    'cover_photo',
    'date_of_birth',
    'username',
    'website'
  ]), //sử dụng cái filter này thêm cho các request trên
  wrapAsync(updateMeController)
)

/*change-password
des: khi người dùng đã 'đăng nhập' muốn đổi mật khẩu
path: /users/change-password
method: PUT | PATCH
headers {
  Authorization: 'Bearer access_token' 
}
body: {
  old_password: string,
  password: string,
  confirm_password: string
}
*/
userRouter.put(
  '/change-password',
  filterMiddleware<ChangePasswordReqBody>(['confirm_password', 'old_password', 'password']),
  accessTokenValidator,
  changePasswordValidator,
  wrapAsync(changePasswordController)
)

/*refresh-token
des: khi mã access_token hết hạn thì client sẽ gửi refresh_token lên để xin:
    refresh_token và access_token mới
path: users/refresh-token
method: POST
body: {
  refresh_token: string
}
*/
userRouter.post('/refresh-token', refreshTokenValidator, wrapAsync(refreshTokenController))
//ĐA SỐ USERS TRONG DTB có password là "Ahihi123!"
export default userRouter
