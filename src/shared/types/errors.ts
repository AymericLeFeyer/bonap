export class MealieApiError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "MealieApiError"
    this.statusCode = statusCode
  }
}

export class MealieUnauthorizedError extends MealieApiError {
  constructor(message = "Unauthorized") {
    super(message, 401)
    this.name = "MealieUnauthorizedError"
  }
}

export class MealieNotFoundError extends MealieApiError {
  constructor(message = "Not Found") {
    super(message, 404)
    this.name = "MealieNotFoundError"
  }
}

export class MealieServerError extends MealieApiError {
  constructor(message = "Server Error", statusCode = 500) {
    super(message, statusCode)
    this.name = "MealieServerError"
  }
}
