import { createHash } from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

//hàm biến một đoạn nội dung thành đoạn mã sh-256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}
//hàm mã hoá password + mật khẩu bí mật của mình
export function hashPassword(password: string) {
  //hàm này gọi sha256 để thực hiện mã hoá
  return sha256(password + process.env.PASSWORD_SECRET)
}
