"""Domain exceptions with HTTP status mapping."""

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base exception with a structured error body."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})
        self.code = code
        self.message = message


class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"{resource} not found.",
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message=message,
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
            message=message,
        )


class ConflictError(AppException):
    def __init__(self, message: str = "Resource already exists."):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message=message,
        )


class ValidationError(AppException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
        )


class FileTooLargeError(AppException):
    def __init__(self, max_mb: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            code="FILE_TOO_LARGE",
            message=f"File exceeds the maximum allowed size of {max_mb} MB.",
        )


class UnsupportedFileTypeError(AppException):
    def __init__(self, mime: str = ""):
        super().__init__(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="UNSUPPORTED_FILE_TYPE",
            message=f"File type '{mime}' is not supported.",
        )


class ProcessingError(AppException):
    def __init__(self, message: str = "Document processing failed."):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="PROCESSING_ERROR",
            message=message,
        )


class StorageError(AppException):
    def __init__(self, message: str = "Storage operation failed."):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="STORAGE_ERROR",
            message=message,
        )


class RateLimitError(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMITED",
            message="Too many requests. Please slow down.",
        )
