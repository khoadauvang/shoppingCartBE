//một hàm nhận vào checkSchema
//chạy checkSchema
//tự khui lỗi
//tự response lỗi lun

import { NextFunction, Request, Response } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

//giúp giảm tải công việc ở controller
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    //             đây là một middleware
    //middleware: check validation, khui lỗi, res lỗi

    await validation.run(req) //kiểm tra validation và lưu lỗi vào req
    //validation ở đây là cái checkSchema({...}) á

    //khui lỗi
    const error = validationResult(req)
    if (error.isEmpty()) {
      return next()
    }
    const errorObject = error.mapped()

    //tạo mới một thằng EntityError
    const entityError = new EntityError({
      errors: {}
    })

    for (const key in errorObject) {
      const { msg } = errorObject[key] //lấy message của các key
      //msg lấy dc sẽ có 2 dạng, string (bình thường)
      // || lỗi do ErrowWithStatus tạo ra
      if (msg instanceof ErrorWithStatus && msg.status != HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }

      //nếu msg là error bình thường
      entityError.errors[key] = msg
    }

    next(entityError) //ném cho thằng error tổng đóng gói
  }
}

//vcc dòng 15 đọc hàm run có promise, nên phải có await - async

// hàm này bọc cái hàm kiểm tra các trường thuộc tính của request (nơi chạy và kiểm soát flow hành động của request),
// nếu không có lỗi gì sau khi chạy
//  thì không cần đi xuống dưới khui lỗi, return next()
//  nếu có lỗi sẽ bắt đầu khui lỗi và biến nó thành lỗi đẹp
