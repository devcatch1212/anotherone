import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '알 수 없는 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object' && 'message' in res) {
        const msg = (res as any).message;
        message = Array.isArray(msg) ? (msg[0]?.toString() ?? message) : (msg?.toString() ?? message);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      switch (exception.code) {
        case 'P2002':
          message = '이미 존재하는 데이터입니다. (중복 오류)';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = '요청한 데이터를 찾을 수 없습니다.';
          break;
        default:
          message = '데이터베이스 처리 중 오류가 발생했습니다.';
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = '데이터 형식이 올바르지 않습니다.';
    } else {
      console.error('Unhandled Exception:', exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
