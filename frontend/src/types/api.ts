/** TypeScript types mirroring the backend Pydantic schemas. */

export interface UserRead {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: "user" | "admin";
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface FileRead {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  created_at: string;
}

export type ProcessingTool =
  | "merge_pdf"
  | "split_pdf"
  | "compress_pdf"
  | "pdf_to_image"
  | "image_to_pdf"
  | "pdf_to_word"
  | "word_to_pdf"
  | "rotate_pdf"
  | "delete_pages"
  | "watermark_pdf"
  | "password_protect"
  | "ocr_extraction";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobRead {
  id: string;
  tool: ProcessingTool;
  status: JobStatus;
  progress: number;
  options: Record<string, unknown> | null;
  output_filename: string | null;
  output_url: string | null;
  output_size_bytes: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}
