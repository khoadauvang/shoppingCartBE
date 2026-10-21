import User from '~/models/User.schema'
import databaseServices from './database.services'
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import dotenv from 'dotenv'
import ms from 'ms'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import RefreshToken from '~/models/RefreshToken.schema'
import { ObjectId } from 'mongodb'
//
dotenv.config()

class UserServices {
  //method giúp tạo ac token
  private signAccessToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      payload: { user_id, token_type: TokenType.AccessToken },
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN as ms.StringValue }
    })
  }

  //method giúp tạo rf token
  private signRefreshToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      payload: { user_id, token_type: TokenType.RefreshToken },
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN as ms.StringValue }
    })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN as ms.StringValue }
    })
  }
  private signForgotPasswordToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      payload: { user_id, token_type: TokenType.ForgotPasswordToken }, //2
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN as ms.StringValue }
    })
  }

  // các dịch vụ hỗ trợ chính tương ứng với các requests từ client gửi xuống
  async register(payload: RegisterReqBody) {
    //tạo user và lưu vào database
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    const result = await databaseServices.users.insertOne(
      new User({
        username: `user${user_id}`,
        ...payload,
        _id: user_id,
        date_of_birth: new Date(
          payload.date_of_birth
          //vì User cần dât còn payload thì lại là string
          //mình sẽ ghi đè thuộc tính date_of_birth
        ),
        password: hashPassword(payload.password),
        email_verify_token
      })
    )
    //lấy user_id từ result sau khởi tạo user
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])

    databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        user_id, //kiểu objectID
        token: refresh_token
      })
    )

    //làm hàm gửi mail
    console.log(`http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}`)
    //tạo ra một đường link khi client bấm vào thì nó sẽ tương đương với chạy hàm
    //  userRouter.get('/verify-email/', emailVerifyTokenValidator, wrapAsync(emailVerifyController)) bên router

    return {
      access_token,
      refresh_token
    }
  }

  async checkEmailExist(email: string): Promise<Boolean> {
    const user = await databaseServices.users.findOne({ email })
    return Boolean(user)
  }

  async login(payload: LoginReqBody) {
    //lên server tìm user sở hữu cả 2 thông tin email & pass cùng 1 lúc
    const user = await databaseServices.users.findOne({
      ...payload,
      password: hashPassword(payload.password)
    })

    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        //401 là lỗi rất mạnh, thường dành cho mấy thằng hacker
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }

    //nếu có user thì tạo acToken và rfToken từ user_id
    const user_id = user._id.toString() //trên mongoDB cái trường dữ liệu của nó là >>> _id <<<
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])

    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refresh_token
      })
    )

    return {
      access_token,
      refresh_token
    }
  }

  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    //tìm refresh token dựa vào 2 thông tin
    const refreshToken = await databaseServices.refreshTokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })

    //nếu tìm kiếm không có
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
    }
  }

  async logout(refresh_token: string) {
    //xoá rf dựa vào token
    await databaseServices.refreshTokens.deleteOne({ token: refresh_token })
    return true
  }

  async checkEmailVerifyToken({ user_id, email_verify_token }: { user_id: string; email_verify_token: string }) {
    // NHÌN Ở CHỖ THAM SỐ TRUYỀN VÀO
    //    destructuring + type

    //tìm user
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      email_verify_token
    })
    //neeus ko cos
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID
      })
    }
    //nếu có
    return true
  }

  //hàm đổi trạng thái verify của user
  async verifyEmail(user_id: string) {
    //cập nhật thông tin của user đó
    await databaseServices.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      [
        {
          $set: {
            verify: UserVerifyStatus.Verified,
            email_verify_token: '',
            updated_at: '$$NOW'
          }
        }
      ]
    )

    return
  }

  //lấy thông tin verify của user
  async getUserVerifyStatus(user_id: string) {
    const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }

    //nếu có user thì return
    return user.verify
  }

  async resendEmailVerifyToken(user_id: string) {
    const email_verify_token = await this.signEmailVerifyToken(user_id)

    await databaseServices.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      [
        {
          $set: {
            email_verify_token,
            updated_at: '$$NOW'
          }
        }
      ]
    )

    console.log(`http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}`)
    return
  }

  async forgotPassword(email: string) {
    // b1 đi tìm user
    const user = (await databaseServices.users.findOne({ email })) as User

    const user_id = (user._id as ObjectId).toString()

    const forgot_password_token = await this.signForgotPasswordToken(user_id)

    await databaseServices.users.updateOne(
      {
        _id: user._id
      },
      [
        {
          $set: {
            forgot_password_token,
            updated_at: '$$NOW'
          }
        }
      ]
    )

    //gửi mail
    console.log(`http://localhost:8000/users/forgot-password/?forgot_password_token=${forgot_password_token}`)
    return
  }

  async checkForgotPasswordToken({
    user_id,
    forgot_password_token
  }: {
    user_id: string
    forgot_password_token: string
  }) {
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      forgot_password_token
    })

    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID
      })
    }
    //NẾU CÓ THÌ KHÔNG CẦN LÀM GÌ CẢ
  }

  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          forgot_password: '',
          updated_at: '$$NOW'
        }
      }
    ])
  }

  async getMe(user_id: string) {
    const user = await databaseServices.users.findOne(
      { _id: new ObjectId(user_id) }, //tham số đầu tiên
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      } //tham số thứ hai
    )

    //kh tìm thấy user
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }

    //nếu tìm được user
    return user
  }

  async updateMe({ user_id, payload }: { user_id: string; payload: UpdateMeReqBody }) {
    //trong payload có 1 thông tin cần fix
    const _payload = {
      ...payload,
      date_of_birth: new Date(payload.date_of_birth as string)
    }
    //nếu user muốn update username thì phải xem username có tồn tại không?
    if (_payload.username) {
      const user = await databaseServices.users.findOne({ username: _payload.username })
      if (user) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }

    //nếu k bị trùng thì update thôi
    const user = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      [
        {
          $set: {
            ...payload, //tất cả những gì có trong payload "mới"
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after', //trả ra object sau update
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )

    return user
  }

  async changePassword({
    user_id,
    old_password,
    password
  }: //
  {
    user_id: string
    old_password: string
    password: string
  }) {
    //tìm user dựa trên thông tin cũ nếu có thì mới cập nhật
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(old_password)
    })

    //NẾU K CÓ THÌ BÁO LỖI LUÔN
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }

    //nếu có thì tiến hành cập nhật password mới cho user
    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) }, //filter
      [
        {
          $set: {
            password: hashPassword(password),
            updated_at: '$$NOW'
          }
        }
      ]
    )
  }

  async refreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    //xoá rf token cũ
    await databaseServices.refreshTokens.deleteOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    //ký 2 mã mới và gửi cho người dùng
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])

    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: new_refresh_token
      })
    )

    return {
      access_token,
      refresh_token: new_refresh_token
    }
  }
}

//Xuất class ra để các file code khác, class khác xài methods của class này
const usersServices = new UserServices()
export default usersServices
