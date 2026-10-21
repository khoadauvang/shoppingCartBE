import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // hệ thống đổ về rất nhiều lỗi, thường là ErrorWithStatus
  // nhưng cũng có thể là một lỗi nào đó k theo cấu trúc { status, message }

  //err lúc này là cái errorType mà nãy build
  //nói chung err lúc này đã được đóng gói tổng hợp các lỗi bình thường
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, 'status'))
  }

  //nếu có lỗi có dạng error bình thường hoặc khác thì mình nên mở các enumerable ra

  //dsach các cái thuộc tính của thằng error không phải ErrorWithStatus
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })

  //lỗi new Error thì k có status nên để mã 500
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfor: omit(err, ['stack'])
  })
}
