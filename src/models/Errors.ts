import HTTP_STATUS from '~/constants/httpStatus'

// tạo ra một kiểu lỗi mới
export class ErrorWithStatus {
  message: string
  status: number

  constructor({ message, status }: { message: string; status: number }) {
    this.message = message
    this.status = status
  }
}

export class EntityError extends ErrorWithStatus {
  errors: ErrorType //kiểu lỗi cũ

  constructor({
    message = 'Validation Error', //
    errors
  }: {
    message?: string
    errors: ErrorType
  }) {
    super({ message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY }) //new ErrorWithStatus({status, message})
    this.errors = errors
  }
}

//utility type
type ErrorType = Record<
  string,
  {
    msg: string
    [key: string]: any
  }
>
// Record<key, value>: đang định nghĩa là một object với key là string, value là cái object
//    mà mình định nghĩa
