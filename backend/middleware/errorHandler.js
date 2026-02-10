// Custom Error Class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("=== ERROR HANDLER ===");
  console.error("Error name:", err.name);
  console.error("Error message:", err.message);
  console.error("Error stack:", err.stack);
  console.error("Request URL:", req.originalUrl);
  console.error("Request method:", req.method);

  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found with id: ${err.value}`;
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `Duplicate field value for ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    const message = `Invalid input data. ${messages.join(". ")}`;
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token. Please log in again.", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Your token has expired. Please log in again.", 401);
  }

  console.error("Final error response:", {
    statusCode: error.statusCode,
    message: error.message,
  });

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    status: error.status || "error",
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  });
};

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { AppError, errorHandler, asyncHandler };
