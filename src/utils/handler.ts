import { NextFunction, Request, RequestHandler, Response } from 'express'

//hàm nhận vào controller | hoặc middleware
//và biến chúng nó thành controller và middleware có cấu trúc try catch next
export const wrapAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
      //vì hàm nhận vào là một promise nên để chạy cái func() thì phải có await
    } catch (error) {
      next(error)
    }
  }
}
