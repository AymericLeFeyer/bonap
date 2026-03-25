export interface IMealieApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
  /** POST to an SSE endpoint and resolve with the last emitted data object. */
  postSse<T>(path: string, body: unknown): Promise<T>
  uploadImage(slug: string, file: File): Promise<void>
}
