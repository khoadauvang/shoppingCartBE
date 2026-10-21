import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { TokenPayload } from '~/models/requests/User.requests'
dotenv.config()

//payload là nội dung cần lưu
//privateKey là chữ ký bí mật của server
//options: chuẩn mã hoá, ngày hết hạn

export const signToken = ({
  payload, //Nhìn dô file users.services.ts
  //payload: user_id, token_type
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: any
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, (error, token) => {
      if (error) throw reject(error)
      resolve(token as string) //hàm trả ra string
    })
  })
}

export const verifyToken = ({
  token,
  privateKey
}: //
{
  token: string
  privateKey: string
}) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (error) {
        throw reject(error)
      }
      resolve(decoded as TokenPayload)
    })
  })
}
